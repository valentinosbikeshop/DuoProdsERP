export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Verify the request comes from an authenticated user
async function verifyAuth(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('verifyAuth: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel.');
    return null;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    }
  );
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (err) {
    console.error('Error al validar sesión en verifyAuth:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Auth guard: reject unauthenticated requests
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      eventDescription = '', 
      parsedDocuments = '', 
      eventType = '',
      customPrompt = '',
      customQuoteLocation = '',
      targetMargin,
      mode = 'suggest_costs',
      items = []
    } = body;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Falta configurar GEMINI_API_KEY en las Variables de Entorno de Vercel. Por favor agrégala en Vercel > Settings > Environment Variables.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const modelsToTry = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];

    // MODO: Optimización Inteligente de Márgenes de Ítems Existentes
    if (mode === 'optimize_margins') {
      if (!items || items.length === 0) {
        return NextResponse.json({ error: 'No se enviaron ítems para optimizar' }, { status: 400 });
      }

      const desiredMargin = typeof targetMargin === 'number' ? targetMargin : 35;

      const optimizeSchema = {
        type: Type.OBJECT,
        properties: {
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: 'ID exacto del ítem proporcionado' },
                margen_sugerido: { type: Type.NUMBER, description: 'Margen porcentual sugerido (ej: 35 para 35%)' },
                ganancia_sugerida: { type: Type.NUMBER, description: 'Ganancia neta sugerida por unidad en CLP' },
                justificacion: { type: Type.STRING, description: 'Breve justificación comercial o de mercado' }
              },
              required: ['id', 'margen_sugerido', 'ganancia_sugerida', 'justificacion']
            }
          },
          resumen_estrategia: { 
            type: Type.STRING, 
            description: 'Explicación ejecutiva de cómo se distribuyeron los márgenes para alcanzar el objetivo global' 
          }
        },
        required: ['suggestions', 'resumen_estrategia']
      };

      const itemsText = items
        .filter((it: any) => !it.es_insumo)
        .map((it: any) => `- ID: "${it.id}" | Servicio: "${it.servicio}" | Detalle: "${it.detalle || ''}" | Costo Unitario: $${it.costo} | Cantidad: ${it.cantidad} | Margen Actual: ${it.margen || 0}% | Tipo Doc: ${it.tipo_doc_costo || 'factura'}`)
        .join('\n');

      const optimizePrompt = `Eres el Director Financiero de DUO Producciones en Chile.
El usuario ha establecido un MARGEN NETO OBJETIVO GLOBAL del ${desiredMargin}% para este evento.

LISTA DE SERVICIOS EN BORRADOR A OPTIMIZAR:
${itemsText}

DIRECTRICES DE DISTRIBUCIÓN ESTRATÉGICA:
1. Distribuye los márgenes según la naturaleza de cada rubro en el mercado chileno de eventos:
   - Servicios básicos, compras directas de abarrotes o fletes suelen aceptar márgenes moderados (15% a 25%).
   - Gastronomía de autor, coctelería, iluminación, DJ, sonido y producción técnica exclusiva soportan márgenes más elevados (35% a 55%).
2. El promedio ponderado de rentabilidad sobre el costo total del evento debe converger exactamente al ${desiredMargin}% solicitado.
3. Para cada ítem, calcula: ganancia_sugerida = Math.round(costoNeto * (margen_sugerido / 100)).
4. En 'resumen_estrategia', explica en 2-3 frases cómo esta asignación protege el margen global del ${desiredMargin}% asegurando que la propuesta sea comercialmente atractiva y competitiva para el cliente.`;

      let optResponse;
      let optRetries = 3;
      let optModelIndex = 0;

      while (optRetries > 0) {
        try {
          const targetModel = modelsToTry[optModelIndex];
          optResponse = await ai.models.generateContent({
            model: targetModel,
            contents: [{ role: 'user', parts: [{ text: optimizePrompt }] }],
            config: {
              responseMimeType: 'application/json',
              responseSchema: optimizeSchema,
              temperature: 0.2,
            }
          });
          break;
        } catch (e: any) {
          optRetries--;
          optModelIndex = Math.min(optModelIndex + 1, modelsToTry.length - 1);
          if (optRetries === 0) throw e;
          await new Promise(r => setTimeout(r, 800));
        }
      }

      if (!optResponse || !optResponse.text) {
        throw new Error('Sin respuesta del motor de optimización de márgenes');
      }

      return NextResponse.json(JSON.parse(optResponse.text));
    }

    // Input validation para modo estándar: al menos una descripción, prompt o documento
    if (!eventDescription && !customPrompt && !parsedDocuments) {
      return NextResponse.json({ error: 'Se requiere al menos una descripción, prompt o documento' }, { status: 400 });
    }

    // Cargar catálogo referencial de forma tolerante a fallos
    let catalogString = 'No hay servicios en el catálogo.';
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabaseClient = createClient(supabaseUrl, supabaseKey);
        const { data: masterCosts } = await supabaseClient
          .from('master_costs')
          .select('*');

        if (masterCosts && masterCosts.length > 0) {
          catalogString = masterCosts
            .map(
              (item) =>
                `- ${item.servicio} | Detalle: ${item.tiempo_detalle} | Tipo: ${item.tipo_evento} | Costo: ${item.costo} | Ganancia: ${item.ganancia}`
            )
            .join('\n');
        }
      }
    } catch (catalogErr) {
      console.warn('Advertencia al consultar master_costs (usando catálogo base):', catalogErr);
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        suggestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              servicio: { type: Type.STRING, description: 'Nombre claro del servicio o insumo' },
              detalle: { type: Type.STRING, description: 'Detalle cuantitativo o especificación técnica' },
              tipo_evento: { type: Type.STRING, description: 'Categoría o tipo (Gastronomía, Logística, Técnica, etc.)' },
              cantidad: { type: Type.INTEGER, description: 'Cantidad sugerida' },
              costo: { type: Type.NUMBER, description: 'Costo base unitario en CLP' },
              ganancia: { type: Type.NUMBER, description: 'Ganancia por unidad en CLP' },
              valor_neto: { type: Type.NUMBER, description: 'Valor neto (costo + ganancia)' },
              iva: { type: Type.NUMBER, description: 'IVA 19%' },
              valor_total: { type: Type.NUMBER, description: 'Valor total (neto + IVA)' },
              margen: { type: Type.NUMBER, description: 'Margen comercial en porcentaje' },
            },
            required: [
              'servicio',
              'detalle',
              'tipo_evento',
              'cantidad',
              'costo',
              'ganancia',
              'valor_neto',
              'iva',
              'valor_total',
              'margen',
            ],
          },
        },
        reasoning: { type: Type.STRING, description: 'Explicación breve del razonamiento y desglose realizado' },
      },
      required: ['suggestions', 'reasoning'],
    };

    let systemPrompt = `Eres un planificador financiero y cotizador experto de DUO Producciones, una prestigiosa empresa de producción de eventos y gastronomía en Chile.

CATÁLOGO DE SERVICIOS Y COSTOS REFERENCIALES:
${catalogString}

REGLAS FINANCIERAS Y DE MERCADO CHILENO:
1. Moneda: Pesos Chilenos (CLP). Usa precios de mercado realistas y actualizados en Chile (ej. kilo de posta/posta negra $8.000-$10.000, docena de masas $2.500-$3.500, kilo de queso $7.000-$9.000, etc.).
2. Fórmulas:
   - valor_neto = costo + ganancia
   - iva = Math.round(valor_neto * 0.19)
   - valor_total = valor_neto + iva
   - margen = costo > 0 ? (ganancia / costo) * 100 : 0
3. ${targetMargin ? `MARGEN OBJETIVO EXIGIDO: El usuario requiere un margen de ganancia promedio del ${targetMargin}%. Calibra las ganancias sugeridas para que el margen promedio de los servicios propuestos sea de aproximadamente ${targetMargin}%.` : 'Asigna un margen de ganancia razonable para la productora (usualmente entre 25% y 40% sobre el costo unitario, o según catálogo).'}`;

    let userPrompt = '';

    if (customPrompt && customPrompt.trim()) {
      systemPrompt += `
INSTRUCCIONES DE DESGLOSE INTELIGENTE (PROMPT LIBRE / PEDIDO ESPECÍFICO):
El usuario ha solicitado cotizar o desglosar un requerimiento puntual (ejemplo: "50 empanadas de pino sin aceituna, 30 empanadas napolitanas", "asado para 40 personas", "barra libre de terremotos y piscolas").

DEBES REALIZAR UN DESGLOSE EXHAUSTIVO Y DETALLADO:
1. Insumos e ingredientes principales: Divide la preparación en sus materias primas requeridas con cantidades reales (ej. Kilos de carne posta picada, cebollas y aliños, masas de empanada, queso mantecoso, jamón, tomates, etc.).
2. Respeta estrictamente las restricciones del cliente: Si pide "sin aceituna", asegúrate de excluirla y detallarlo. Si pide un tipo específico de masa o corte, refléjalo.
3. Insumos secundarios y operativos: Incluye gas para horneo/cocción, manteca/aceite, servilletas, bandejas o cajas de transporte, carbón (si es parrilla), etc.
4. Mano de obra y elaboración: Sugiere el ítem de elaboración/cocinero/maestro si corresponde al volumen.
5. Cada ítem debe tener un 'servicio' descriptivo, un 'detalle' con la cantidad técnica necesaria (ej. "5 kg aprox para 50 unidades"), 'cantidad' entera, y 'costo'/'ganancia' unitarios en CLP.`;

      userPrompt = `REQUERIMIENTO ESPECÍFICO DEL USUARIO A DESGLOSAR:
"${customPrompt.trim()}"

${customQuoteLocation ? `LUGAR/PROVEEDOR REQUERIDO PARA COTIZAR: "${customQuoteLocation.trim()}"\nAjusta los precios y sugerencias asumiendo que se comprará en este proveedor específico.\n\n` : ''}Contexto adicional del evento:
- Descripción general del evento: ${eventDescription || 'Sin descripción adicional'}
- Tipo de evento: ${eventType || 'General'}`;
    } else {
      systemPrompt += `
INSTRUCCIONES DE GENERACIÓN SEGÚN EVENTO Y DOCUMENTOS:
1. Analiza la descripción general del evento y los documentos adjuntos proporcionados.
2. Selecciona los servicios más apropiados del catálogo para este evento.
3. Para cada servicio sugerido, usa los precios del catálogo como base.
4. DESGLOSE EXHAUSTIVO: Si se mencionan comidas o bebidas (ej. terremotos, piscolas, choripanes, empanadas), desglosa obligatoriamente sus ingredientes y materiales.
5. LOGÍSTICA OCULTA: Deduce y sugiere costos operativos que el usuario no mencionó pero son obligatorios: Arriendo de sede/local, hielo, fletes/transporte, personal de aseo, bolsas de basura, seguridad, baños químicos (si es masivo), permisos municipales (si aplica).`;

      userPrompt = `Descripción del evento: ${eventDescription}
Documentos adjuntos: ${parsedDocuments}
Tipo de evento: ${eventType}`;
    }

    let response;
    let retries = 3;
    let delay = 1000;
    let currentModelIndex = 0;
    
    while (retries > 0) {
      try {
        const targetModel = modelsToTry[currentModelIndex];
        console.log(`Calling Gemini with model: ${targetModel}`);
        response = await ai.models.generateContent({
          model: targetModel,
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }, { text: userPrompt }] },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.25,
          },
        });
        break; // Success
      } catch (e: any) {
        if (e.message?.includes('503') || e.message?.includes('UNAVAILABLE') || e.status === 503) {
          retries--;
          currentModelIndex = Math.min(currentModelIndex + 1, modelsToTry.length - 1);
          if (retries === 0) throw new Error('Todos los modelos están saturados (Error 503). Por favor, intenta de nuevo más tarde.');
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5; // Exponential backoff
        } else {
          throw e; // Other errors
        }
      }
    }

    if (!response || !response.text) {
      throw new Error('No response from Gemini');
    }

    const parsedResponse = JSON.parse(response.text);

    return NextResponse.json(parsedResponse);
  } catch (error: any) {
    console.error('Error in suggest-costs endpoint:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

