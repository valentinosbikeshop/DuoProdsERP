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

    // Preparar contexto completo, detallado y jerárquico de todos los ítems
    let itemsContext = 'El borrador está actualmente vacío.';

    if (draftItems && draftItems.length > 0) {
      const topLevel = draftItems.filter((i: any) => !i.parent_id);
      const children = draftItems.filter((i: any) => !!i.parent_id);

      const formatItem = (item: any, indent = '') => {
        return `${indent}- [ID: "${item.id}"]
${indent}  * Nombre (servicio): "${item.servicio || ''}"
${indent}  * Detalle (detalle): "${item.detalle || '(Sin detalle)'}"
${indent}  * Tipo Evento: ${item.tipo_evento || 'AI'}
${indent}  * Cantidad: ${item.cantidad} | Costo Unitario: $${item.costo} | Costo Total: $${(item.costo || 0) * (item.cantidad || 1)}
${indent}  * Ganancia Unitaria: $${item.ganancia || 0} | Valor Neto: $${item.valor_neto || 0} | IVA: $${item.iva || 0} | Valor Total: $${item.valor_total || 0} | Margen: ${item.margen || 0}%
${indent}  * Documento Costo: ${item.tipo_doc_costo || 'factura'} | Es Insumo: ${item.es_insumo ? 'Sí' : 'No'} | IVA Incluido: ${item.iva_incluido !== false ? 'Sí' : 'No'}
${indent}  * Padre ID: ${item.parent_id ? `"${item.parent_id}"` : 'Ninguno (Nivel principal)'}`;
      };

      const sections: string[] = [];

      // 1. Grupos consolidados y sus hijos
      const consolidatedParents = topLevel.filter((p: any) => 
        p.tipo_evento?.toLowerCase() === 'consolidado' || children.some((c: any) => c.parent_id === p.id)
      );

      if (consolidatedParents.length > 0) {
        sections.push('--- GRUPOS CONSOLIDADOS (PADRES E HIJOS) ---');
        consolidatedParents.forEach((parent: any) => {
          sections.push(formatItem(parent, ''));
          const parentChildren = children.filter((c: any) => c.parent_id === parent.id);
          if (parentChildren.length > 0) {
            sections.push('    [Ítems agrupados / Insumos dentro de este grupo]:');
            parentChildren.forEach((child: any) => {
              sections.push(formatItem(child, '    '));
            });
          }
        });
      }

      // 2. Ítems independientes (sin padre y sin hijos)
      const standaloneItems = topLevel.filter((i: any) => 
        !consolidatedParents.some((p: any) => p.id === i.id)
      );

      if (standaloneItems.length > 0) {
        sections.push('--- ÍTEMS INDEPENDIENTES (SIN AGRUPAR) ---');
        standaloneItems.forEach((item: any) => {
          sections.push(formatItem(item, ''));
        });
      }

      // 3. Resumen de totales
      const totalCosto = draftItems.reduce((sum: number, it: any) => sum + ((it.costo || 0) * (it.cantidad || 1)), 0);
      const totalVenta = topLevel.filter((it: any) => !it.es_insumo).reduce((sum: number, it: any) => sum + ((it.valor_total || 0) * (it.cantidad || 1)), 0);

      sections.push(`--- RESUMEN GLOBAL ---
Total de ítems registrados: ${draftItems.length} (${topLevel.length} en nivel principal, ${children.length} hijos)
Costo Total acumulado: $${totalCosto} | Total Facturación Estimada: $${totalVenta}`);

      itemsContext = sections.join('\n\n');
    }

    const systemInstruction = `Eres el Asistente Inteligente de Borradores de DUO Producciones.
Tu misión es asistir al productor a gestionar, ordenar, estructurar, corregir y pulir los presupuestos y borradores de eventos.

TIENES ACCESO COMPLETO A TODA LA INFORMACIÓN DE LOS ÍTEMS DEL BORRADOR:
${itemsContext}

CAPACIDADES Y ACCIONES DISPONIBLES QUE PUEDES EJECUTAR:
1. CONSOLIDATE: Agrupa ítems existentes bajo un nuevo ítem padre consolidado.
   - Requiere: 'parentName' (nombre claro y representativo del grupo, ej: "Empanadas", "Bar Abierto", "Audio e Iluminación").
   - Requiere: 'itemIds' (arreglo con los IDs EXACTOS de los ítems existentes en la lista que formarán parte de este grupo).
   - Opcional: 'parentDetail' (detalle descriptivo), 'parentQuantity' (cantidad para el grupo, default 1).

2. UNCONSOLIDATE: Desagrupa o libera ítems consolidados.
   - Para desarmar un grupo completo: proporciona 'parentId' (el ID del grupo padre que se desea eliminar para que todos sus hijos queden libres como ítems independientes).
   - Para liberar ítems específicos de un grupo: proporciona 'itemIds' con los IDs de los hijos a liberar.

3. REORDER: Reordena la lista de ítems principales.
   - Requiere: 'orderedIds' (arreglo con todos los IDs de los ítems principales en el orden exacto deseado, por ejemplo, ordenados por costo de mayor a menor, alfabéticamente, o colocando primero la comida y luego la bebida).

4. SWAP_NAME_DETAIL: Intercambia el Nombre ('servicio') y el Detalle ('detalle') de los ítems seleccionados.
   - Muy útil cuando al importar o dictar, el nombre quedó en el detalle y el detalle en el nombre.
   - Requiere: 'itemIds' (arreglo con los IDs de los ítems a los que se les debe invertir nombre y detalle).

5. UPDATE_ITEMS: Modifica datos específicos de ítems existentes (cambiar nombres, detalles, costos, cantidades, márgenes, etc.).
   - Requiere: 'updates' (arreglo de objetos con { id, servicio?, detalle?, cantidad?, costo?, ganancia?, tipo_doc_costo?, es_insumo? }).

6. ADD_ITEMS: Agrega nuevos ítems al borrador (a partir de lo dictado por el usuario o extraído de una factura adjunta).
   - Requiere: 'newItems' (arreglo de artículos con servicio, detalle, cantidad, costo, ganancia, tipo_doc_costo, es_insumo).
   - Opcional: 'asConsolidated' (true si deben agruparse bajo un nuevo consolidado 'parentName', o false si se insertan sueltos).

7. DELETE_ITEMS: Elimina ítems obsoletos, duplicados o no deseados del borrador.
   - Requiere: 'itemIds' (arreglo con los IDs exactos a borrar).

REGLAS DE INTERACCIÓN Y ANÁLISIS INTELIGENTE:
- Responde siempre con el esquema JSON indicado.
- En 'reply', sé cordial, ejecutivo y resume con total precisión lo que hiciste.
- ¡ANÁLISIS PROFUNDO DE DOCUMENTOS E IMÁGENES!: Cuando recibas un [DOCUMENTO O FACTURA ADJUNTA], analízalo de manera muy inteligente y detallada. Extrae absolutamente toda la información posible.
  * Agrupación: Si el documento tiene títulos, recetas o centros de producción (ej. "1. Empanadas", "2. Sopaipillas"), agrupa los ítems bajo ese título exacto usando ADD_ITEMS con asConsolidated=true y el título como 'parentName'. NO hardcodees nombres. Repite la acción ADD_ITEMS para cada grupo distinto que encuentres en el documento.
  * Extracción Obligatoria: Los ítems extraídos DEBEN ir dentro de la propiedad 'newItems' de la acción ADD_ITEMS como un arreglo de objetos. ¡NO lo omitas!
  * Tipo de Documento Tributario: Analiza cualquier columna de "Observación Tributaria", notas o texto que indique si la compra fue con Factura o Boleta (ej. "Prorrateo Boleta", "Factura", "Boleta"). Asigna ESTRICTAMENTE ese valor al campo 'tipo_doc_costo' ('factura' o 'boleta') de cada ítem en 'newItems'. Si no dice nada, asume 'factura'.
  * Completitud: Asegúrate de incluir el detalle, cantidad, costo (precio total) y toda la información disponible para cada ítem de manera satisfactoria dentro del arreglo 'newItems'.
- ¡REGLA FUNDAMENTAL PARA CONSOLIDATE!: Al generar una acción 'CONSOLIDATE', es ESTRICTAMENTE OBLIGATORIO incluir el campo 'itemIds' con los IDs exactos de los ítems a agrupar. ¡NUNCA lo omitas ni lo dejes vacío!
- Si el usuario dice "cambia el detalle por el nombre" o viceversa, genera la acción SWAP_NAME_DETAIL con los itemIds respectivos.
- Si no hay acciones que realizar, devuelve 'actions': [].`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        reply: { type: Type.STRING, description: 'Respuesta amigable y explicativa para el usuario' },
        actions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { 
                type: Type.STRING, 
                enum: ['CONSOLIDATE', 'UNCONSOLIDATE', 'REORDER', 'SWAP_NAME_DETAIL', 'UPDATE_ITEMS', 'ADD_ITEMS', 'DELETE_ITEMS'],
                description: 'Tipo de acción a ejecutar' 
              },
              parentName: { type: Type.STRING, description: 'Nombre de la agrupación para CONSOLIDATE o ADD_ITEMS agrupados' },
              parentDetail: { type: Type.STRING, description: 'Detalle para el grupo consolidado' },
              parentId: { type: Type.STRING, description: 'ID del grupo padre para UNCONSOLIDATE' },
              parentQuantity: { type: Type.NUMBER, description: 'Cantidad para el grupo consolidado' },
              itemIds: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: 'IDs de los ítems existentes afectados (CONSOLIDATE, UNCONSOLIDATE parcial, SWAP_NAME_DETAIL, DELETE_ITEMS)' 
              },
              orderedIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Lista ordenada de IDs para REORDER'
              },
              updates: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    servicio: { type: Type.STRING },
                    detalle: { type: Type.STRING },
                    cantidad: { type: Type.STRING, description: 'Puede ser número o texto' },
                    costo: { type: Type.STRING, description: 'Puede ser número o texto (ej. $10.000)' },
                    ganancia: { type: Type.STRING },
                    tipo_doc_costo: { type: Type.STRING, description: "'factura' o 'boleta'" },
                    es_insumo: { type: Type.BOOLEAN }
                  },
                  required: ['id']
                },
                description: 'Lista de actualizaciones para UPDATE_ITEMS'
              },
              newItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    servicio: { type: Type.STRING },
                    detalle: { type: Type.STRING },
                    cantidad: { type: Type.STRING, description: 'Puede ser número o texto' },
                    costo: { type: Type.STRING, description: 'Puede ser número o texto (ej. $10.000)' },
                    ganancia: { type: Type.STRING },
                    tipo_doc_costo: { type: Type.STRING, description: "'factura' o 'boleta'" },
                    es_insumo: { type: Type.BOOLEAN }
                  },
                  required: ['servicio']
                },
                description: 'Lista de nuevos artículos para ADD_ITEMS'
              },
              asConsolidated: { 
                type: Type.BOOLEAN, 
                description: 'Para ADD_ITEMS: si se agrupan bajo un nuevo consolidado' 
              }
            },
            required: ['type']
          }
        }
      },
      required: ['reply', 'actions']
    };

    // Sanitizar mensajes para la API de Gemini:
    // 1. Debe iniciar siempre con un turno 'user'
    // 2. Deben alternar estrictamente 'user' y 'model'
    const sanitizedMessages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const msg of messages) {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      const text = (msg.content || '').trim();
      if (!text) continue;

      // Si la conversación aún no tiene mensajes y el primero es 'model', lo ignoramos
      if (sanitizedMessages.length === 0 && role === 'model') {
        continue;
      }

      // Si el rol es el mismo que el anterior, concatenamos el texto
      if (sanitizedMessages.length > 0 && sanitizedMessages[sanitizedMessages.length - 1].role === role) {
        sanitizedMessages[sanitizedMessages.length - 1].parts[0].text += `\n\n${text}`;
      } else {
        sanitizedMessages.push({
          role,
          parts: [{ text }]
        });
      }
    }

    // Si por alguna razón quedó vacío, iniciamos con un mensaje de usuario por defecto
    if (sanitizedMessages.length === 0) {
      sanitizedMessages.push({
        role: 'user',
        parts: [{ text: 'Hola, asísteme con este borrador.' }]
      });
    }

    // Si hay un archivo adjunto con texto, se añade al último mensaje de usuario
    if (fileText && fileText.trim()) {
      const lastUserMsg = [...sanitizedMessages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        lastUserMsg.parts.push({ text: `\n\n[DOCUMENTO O FACTURA ADJUNTA]:\n${fileText}` });
      }
    }

    // Familia de modelos activos en Gemini API
    const modelsToTry = [
      'gemini-3.6-flash'
    ];

    let responseText: string | null = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        console.log(`Draft Assistant intentando modelo: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents: sanitizedMessages,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.15,
          }
        });

        if (response && response.text) {
          let cleanedText = response.text.trim();
          // Eliminar posibles bloques de markdown ```json ... ``` si el modelo los incluyó
          if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          JSON.parse(cleanedText);
          responseText = cleanedText;
          console.log(`Draft Assistant éxito con modelo: ${model}`);
          break;
        }
      } catch (e: any) {
        console.error(`Error Draft Assistant con modelo ${model}:`, e.message || e);
        lastError = e;
      }
    }

    if (!responseText) {
      throw new Error(lastError?.message || 'No hubo respuesta válida de la IA tras varios intentos');
    }

    const parsedData = JSON.parse(responseText);
    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error('Error general en draft assistant:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor al procesar con IA' }, 
      { status: 500 }
    );
  }
}
