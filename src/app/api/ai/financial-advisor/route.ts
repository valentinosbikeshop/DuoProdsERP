import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

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
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { messages, eventData, approvedItems, filesText } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Formato de mensajes inválido' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Preparar el contexto del presupuesto actual
    let budgetContext = 'No hay ítems aprobados aún.';
    if (approvedItems && approvedItems.length > 0) {
      const totals = approvedItems.reduce(
        (acc: any, item: any) => ({
          costo: acc.costo + (item.costo * item.cantidad),
          ganancia: acc.ganancia + (item.ganancia * item.cantidad),
          valor_total: acc.valor_total + (item.valor_total * item.cantidad),
        }),
        { costo: 0, ganancia: 0, valor_total: 0 }
      );

      budgetContext = `RESUMEN ACTUAL DEL PRESUPUESTO:
- Costo Total: $${totals.costo.toLocaleString('es-CL')}
- Ganancia Total Esperada: $${totals.ganancia.toLocaleString('es-CL')}
- Valor Total Venta: $${totals.valor_total.toLocaleString('es-CL')}
- Margen Global: ${totals.costo > 0 ? ((totals.ganancia / totals.costo) * 100).toFixed(1) : 0}%

DETALLE DE ÍTEMS APROBADOS:
${approvedItems.map((item: any) => `- ${item.cantidad}x ${item.servicio} (${item.tipo_evento}): Costo Unit. $${item.costo.toLocaleString('es-CL')} | Ganancia Unit. $${item.ganancia.toLocaleString('es-CL')} | Total Fila: $${(item.valor_total * item.cantidad).toLocaleString('es-CL')}`).join('\n')}
`;
    }

    const systemPrompt = `Eres un Asesor Financiero y Experto en Presupuestos de Eventos altamente capacitado que trabaja para DUO Producciones, una prestigiosa empresa de producción y banquetería en Chile.

Tu objetivo principal es EXAMINAR EXHAUSTIVAMENTE el presupuesto del evento, buscando maximizar la rentabilidad, reducir costos innecesarios, proponer alternativas realistas y alertar sobre posibles pérdidas u omisiones críticas (por ejemplo, si faltan ítems logísticos obligatorios como fletes, hielo, personal de aseo o seguridad).

CONTEXTO DEL EVENTO:
- Nombre: ${eventData?.name || 'Desconocido'}
- Cliente: ${eventData?.client || 'Desconocido'}
- Tipo/Estado: ${eventData?.status || 'Desconocido'}
- Descripción: ${eventData?.description || 'Sin descripción'}

${budgetContext}

REGLAS DE TU COMPORTAMIENTO:
1. Actúa de manera extremadamente profesional, analítica y proactiva. Eres un consultor experto.
2. Basate SIEMPRE en los números proporcionados en el "DETALLE DE ÍTEMS APROBADOS". Si el usuario pregunta cómo mejorar el margen, analiza esos ítems específicos y di qué ítems tienen poco margen o cómo cambiarlos.
3. Si el usuario adjuntó un archivo (aparecerá en su mensaje como [Archivo adjunto]: ...), úsalo para cotejar si los precios de los proveedores son buenos o si hay discrepancias con el presupuesto aprobado.
4. Escribe en formato Markdown para facilitar la lectura. Usa viñetas, negritas para resaltar montos o ideas clave, y tablas si es útil.
5. Utiliza modismos financieros chilenos o términos técnicos de producción cuando sea pertinente (costo hundido, margen bruto, merma, imprevistos, flete, etc).
6. Si detectas que el margen global es inferior al 30%, enciende alertas y sé incisivo en tus recomendaciones de ajuste.

Da respuestas concisas pero de altísimo valor estratégico. NO repitas el contexto, ve directo al análisis o respuesta solicitada por el usuario.`;

    // Formatear los mensajes para @google/genai
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Reintentos y degradación de modelo
    let response;
    let retries = 3;
    let delay = 1000;
    // Preferimos los modelos más capaces y rápidos
    const modelsToTry = ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];
    let currentModelIndex = 0;
    
    while (retries > 0) {
      try {
        const targetModel = modelsToTry[currentModelIndex];
        
        response = await ai.models.generateContent({
          model: targetModel,
          contents: formattedMessages,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.3, // Temperatura baja para respuestas más analíticas y precisas
          }
        });
        
        break;
      } catch (e: any) {
        if (e.message?.includes('503') || e.message?.includes('UNAVAILABLE') || e.status === 503 || e.message?.includes('not found')) {
          retries--;
          currentModelIndex = Math.min(currentModelIndex + 1, modelsToTry.length - 1);
          if (retries === 0) throw new Error('Todos los modelos están saturados o no disponibles. Por favor, intenta de nuevo más tarde.');
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5;
        } else {
          throw e;
        }
      }
    }

    if (!response || !response.text) {
      throw new Error('Sin respuesta del modelo IA');
    }

    return NextResponse.json({ reply: response.text });

  } catch (error: any) {
    console.error('Error en financial advisor:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}
