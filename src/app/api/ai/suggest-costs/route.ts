export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Verify the request comes from an authenticated user
async function verifyAuth(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
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
      customPrompt = '' 
    } = body;

    // Input validation: at least one input must be provided
    if (!eventDescription && !customPrompt && !parsedDocuments) {
      return NextResponse.json({ error: 'Se requiere al menos una descripción, prompt o documento' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: masterCosts, error } = await supabaseAdmin
      .from('master_costs')
      .select('*');

    if (error) {
      console.error('Error fetching master costs:', error);
      return NextResponse.json({ error: 'Error fetching catalog' }, { status: 500 });
    }

    const catalogString = masterCosts
      ?.map(
        (item) =>
          `- ${item.servicio} | Detalle: ${item.tiempo_detalle} | Tipo: ${item.tipo_evento} | Costo: ${item.costo} | Ganancia: ${item.ganancia}`
      )
      .join('\n') || 'No hay servicios en el catálogo.';

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
3. Asigna un margen de ganancia razonable para la productora (usualmente entre 25% y 40% sobre el costo unitario, o según catálogo).
`;

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

Contexto adicional del evento:
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
    const modelsToTry = ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
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

