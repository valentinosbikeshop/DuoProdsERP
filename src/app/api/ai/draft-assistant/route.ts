import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

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

    const { messages, draftItems, fileText } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Mensajes inválidos' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Preparamos el contexto de los ítems actuales
    const itemsContext = draftItems && draftItems.length > 0 
      ? `ÍTEMS ACTUALES EN EL BORRADOR:\n${draftItems.map((item: any) => 
          `- ID: "${item.id}" | ${item.cantidad}x ${item.servicio} | Costo Unit: $${item.costo} | Padre: ${item.parent_id || 'Ninguno'}`
        ).join('\n')}`
      : 'El borrador está vacío.';

    const systemInstruction = `Eres un Asistente Inteligente de Borradores para DUO Producciones.
Tu trabajo es ayudar a interactuar con la lista de borradores del usuario. Puedes agrupar ítems existentes, o crear/agregar nuevos ítems a la lista.

${itemsContext}

REGLAS DE ACCIONES:
1. CONSOLIDATE: Si el usuario pide "agrupar", "ordenar" o "consolidar" ciertos ítems existentes (ej. "junta todo lo de comida"). Debes generar una acción 'CONSOLIDATE' e indicar el 'parentName' (ej. "Comida") y en 'itemIds' colocar EXACTAMENTE los IDs de la lista de ítems actuales que corresponden a esa categoría.
2. ADD_FROM_INVOICE: Si el usuario pide agregar o crear nuevos ítems (por ejemplo, enumera productos que quiere agregar, o adjunta una factura), genera una acción 'ADD_FROM_INVOICE' con un 'parentName' adecuado (ej. "Nuevos Ítems", "Empanadas", o el nombre de la factura) y en 'newItems' detalla los artículos. NO es obligatorio que haya una factura adjunta si el usuario los dictó en su mensaje.

Debes siempre responder usando el esquema JSON provisto.
Tu respuesta 'reply' debe ser amigable y resumir brevemente lo que hiciste.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        reply: { type: Type.STRING, description: 'Mensaje amigable para el usuario' },
        actions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: 'Tipo de acción: CONSOLIDATE, ADD_FROM_INVOICE' },
              parentName: { type: Type.STRING, description: 'Nombre de la categoría padre' },
              itemIds: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: 'Solo para CONSOLIDATE: IDs de los ítems existentes a agrupar' 
              },
              newItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    servicio: { type: Type.STRING },
                    detalle: { type: Type.STRING },
                    cantidad: { type: Type.INTEGER },
                    costo: { type: Type.NUMBER },
                    tipo_doc_costo: { type: Type.STRING, description: 'factura o boleta' }
                  }
                },
                description: 'Solo para ADD_FROM_INVOICE: Lista de nuevos artículos encontrados en el archivo'
              }
            }
          }
        }
      },
      required: ['reply', 'actions']
    };

    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    if (fileText) {
       formattedMessages[formattedMessages.length - 1].parts.push({ text: `\n[Archivo adjunto]:\n${fileText}` });
    }

    const modelsToTry = ['gemini-3.1-pro', 'gemini-3.6-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.5-flash'];
    let responseText = null;
    let lastError = null;
    
    for (const model of modelsToTry) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: formattedMessages,
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema,
                    temperature: 0.1,
                }
            });
            if (response && response.text) {
                // Verificar que sea JSON válido
                JSON.parse(response.text);
                responseText = response.text;
                break;
            }
        } catch (e: any) {
            console.error(`Error con modelo ${model}:`, e.message || e);
            lastError = e;
        }
    }

    if (!responseText) {
      throw new Error(lastError?.message || 'No hubo respuesta válida de la IA tras varios intentos');
    }

    const parsedData = JSON.parse(responseText);
    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error('Error en draft assistant:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}
