export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventDescription, parsedDocuments = '', eventType = '' } = body;

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
              servicio: { type: Type.STRING, description: 'Nombre del servicio' },
              detalle: { type: Type.STRING, description: 'Detalle o tiempo del servicio' },
              tipo_evento: { type: Type.STRING, description: 'Tipo de evento' },
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
        reasoning: { type: Type.STRING, description: 'Explicación breve del razonamiento' },
      },
      required: ['suggestions', 'reasoning'],
    };

    const systemPrompt = `Eres un planificador financiero experto de DUO Producciones, una empresa de eventos y producción musical en Chile.

CATÁLOGO DE SERVICIOS DISPONIBLES:
${catalogString}

INSTRUCCIONES:
1. Analiza la descripción del evento y los documentos adjuntos proporcionados.
2. Selecciona los servicios más apropiados del catálogo para este evento.
3. Para cada servicio sugerido, usa los precios del catálogo como base.
4. Calcula correctamente: valor_neto = costo + ganancia, iva = valor_neto * 0.19, valor_total = valor_neto + iva, margen = (ganancia / costo) * 100.
5. Sugiere cantidades precisas (ej. kilos, litros, unidades) basándote en el número de invitados y duración del evento.
6. Prioriza los servicios del catálogo existente para la parte artística y técnica.
7. DESGLOSE EXHAUSTIVO (CRÍTICO): Si se mencionan comidas o bebidas (ej. terremotos, piscolas, choripanes, empanadas), DEBES desglosar obligatoriamente sus ingredientes y materiales. Por ejemplo, para 'Terremotos' genera ítems separados para: Helado de Piña, Pipeño, Granadina, Vasos desechables, Bombillas. Para 'Choripanes': Longanizas, Pan marraqueta, Carbón, Mayonesa/Pebre, Servilletas. Estima los costos reales del mercado chileno.
8. LOGÍSTICA OCULTA: Deduce y sugiere costos operativos que el usuario no mencionó pero son obligatorios: Arriendo de sede/local, hielo, fletes/transporte, personal de aseo, bolsas de basura, seguridad, baños químicos (si es masivo), permisos municipales (si aplica).
9. Todas estas sugerencias extra deben añadirse como ítems nuevos calculando un costo razonable, una ganancia para la productora, y su respectivo IVA y margen.`;

    const userPrompt = `Descripción del evento: ${eventDescription}
Documentos adjuntos: ${parsedDocuments}
Tipo de evento: ${eventType}`;

    let response;
    let retries = 3;
    let delay = 1000;
    
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }, { text: userPrompt }] },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.3,
          },
        });
        break; // Success
      } catch (e: any) {
        if (e.message?.includes('503') || e.message?.includes('UNAVAILABLE') || e.status === 503) {
          retries--;
          if (retries === 0) throw e;
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
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
