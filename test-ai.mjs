import { GoogleGenAI, Type } from '@google/genai';

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const systemInstruction = `Eres un Asistente Inteligente de Borradores para DUO Producciones.
Tu trabajo es ayudar a interactuar con la lista de borradores del usuario. Puedes agrupar ítems existentes, o leer facturas adjuntas y extraer los ítems.

ÍTEMS ACTUALES EN EL BORRADOR:
El borrador está vacío.

REGLAS DE ACCIONES:
1. CONSOLIDATE: Si el usuario pide "agrupar", "ordenar" o "consolidar" ciertos ítems existentes (ej. "junta todo lo de comida"). Debes generar una acción 'CONSOLIDATE' e indicar el 'parentName' (ej. "Comida") y en 'itemIds' colocar EXACTAMENTE los IDs de la lista de ítems actuales que corresponden a esa categoría.
2. ADD_FROM_INVOICE: Si el usuario adjunta una factura o pedido y pide agregarla. Extrae los productos de la factura y genera una acción 'ADD_FROM_INVOICE' con un 'parentName' adecuado (ej. "Compra Walmart", "Factura Proveedor") y en 'newItems' detalla todos los artículos de la compra.

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

  const formattedMessages = [
    { role: 'model', parts: [{ text: "¡Hola! Soy tu Asistente..." }] },
    { role: 'user', parts: [{ text: "hay empanadas napolitanas (60), de pino (70) y de queso (70), consolida los items para cada una de estas," }] }
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: formattedMessages,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.1,
      }
    });
    console.log(response.text);
  } catch (e) {
    console.error("Error from AI:", e);
  }
}

run();
