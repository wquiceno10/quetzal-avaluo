/**
 * avaluos-api-analysis V9 (Dynamic Area & Fallback Logic)
 * - Prompt V2 (Recomendado): Lógica de área dinámica + Fallback robusto
 * - Extracción estricta (V7 logic maintained)
 * - Resumen conciso (V8 logic maintained)
 */
console.log("Deploy V9 (Dynamic Area + Fallback) - " + new Date().toISOString());

export default {
    async fetch(request, env) {
        // --- CORS ---
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if (request.method !== 'POST') {
            return new Response(
                JSON.stringify({ error: 'Method not allowed' }),
                { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // --- BODY ---
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return new Response(
                JSON.stringify({ error: 'JSON inválido', details: e.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { formData } = body || {};
        if (!formData) {
            return new Response(
                JSON.stringify({ error: 'formData es requerido' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const PERPLEXITY_API_KEY = env.PERPLEXITY_API_KEY;
        const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;

        if (!PERPLEXITY_API_KEY || !DEEPSEEK_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'API keys no configuradas' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // --- 1. PREPARACIÓN DE DATOS (V9 LOGIC) ---
        const tipoInmueble = formData.tipo_inmueble || 'inmueble';
        const ubicacion = `${formData.barrio || ''}, ${formData.municipio || ''}`.trim();

        // Fallback de área
        let areaBase = parseInt(formData.area_construida);
        if (!Number.isFinite(areaBase) || areaBase <= 0) areaBase = 60;
        const area = areaBase;

        const minArea = Math.round(area * 0.7); // -30% (ajustado para dar margen al prompt que pide +/- 50%)
        const maxArea = Math.round(area * 1.3); // +30%

        // --- VARIABLES V9 ---
        const areaConstruida = area;
        const infoInmueble = `
- Tipo: ${tipoInmueble}
- Ubicación: ${ubicacion}
- Habitaciones: ${formData.habitaciones || '?'}
`.trim();

        const areaInstruction = areaConstruida
            ? `
- ÁREA CONSTRUIDA: ${areaConstruida} m²
- Rango de áreas VENTA (Estricto): ${Math.round(area * 0.5)} a ${Math.round(area * 1.5)} m² (±50%)
- SOLO incluye comparables de venta cuyas áreas estén dentro de este rango. Para arriendos, intenta mantener el área similar, pero prioriza encontrar datos.`
            : '';

        // --- PROMPT V9 (ROBUSTO + FALLBACK) ---
        const perplexityPrompt = `
Eres un analista inmobiliario especializado en avalúos comerciales técnicos y estimación de valor apoyada en datos estadísticos del mercado colombiano.
Tu tarea es elaborar un **análisis completo, claro y profesional**, incluso cuando la información disponible sea limitada.

DATOS DEL INMUEBLE
-------------------
Basado en estos datos proporcionados por el usuario:
${infoInmueble}
${areaInstruction}

INSTRUCCIONES GENERALES (GESTIÓN DE FALLBACK)
---------------------------------------------
1. Si no encuentras suficientes datos reales en portales inmobiliarios, DEBES complementar con:
   - Estadísticas municipales y regionales.
   - Valores típicos de mercado según tamaño del inmueble y ubicación.
2. NUNCA devuelvas valores "0", "null", "N/A" o similares.
3. Si un dato no aparece directamente, GENERA una estimación razonable basada en promedios municipales.
4. Siempre entrega comparables suficientes:
   - Entrega idealmente entre 12 y 15 comparables en total.
   - Incluye propiedades en arriendo (mínimo 3).
   - Incluye propiedades de barrios similares.
5. NO incluyas hipervínculos ni enlaces. Solo textos descriptivos.
6. Incluye precios, áreas y valores de mercado siempre en pesos colombianos.
7. Responde SIEMPRE en español.

TAREAS
------

## 1. BÚSQUEDA Y SELECCIÓN DE COMPARABLES (FORMATO CRÍTICO)
Para que el sistema procese la información correctamente, debes presentar el listado de comparables en una **TABLA MARKDOWN** con estas columnas exactas:
| Título | Tipo (Venta/Arriendo) | Precio | Área (m2) | Habitaciones | Ubicación | Fuente |

*Nota: Título y Precio deben ser lo más fieles posible al anuncio original.*

## 2. ANÁLISIS DEL VALOR (CÁLCULO JS EXTERNO)
Escribe un análisis narrativo sobre ambos enfoques, sin hacer cálculos finales.

### 2.1. Método de Venta Directa (Precio por m²)
- Comenta el valor promedio por m² del mercado basándote en los comparables de venta.
- Sugiere el valor por m² FINAL que debería usarse (ajustado por antigüedad, estado, etc.).

### 2.2. Método de Rentabilidad (Yield Mensual)
- Estima el Canon Mensual Promedio de Arriendo para ${areaConstruida || 'metros'} m² en la zona.
- Estima el Yield mensual promedio del sector (ej: 0.4% - 0.6%).

## 3. RESULTADOS FINALES Y AJUSTES
Entrega de forma clara:
- Resumen de la posición del inmueble en el mercado (liquidez).
- Comentario sobre ajustes aplicados por antigüedad o características.
- Menciona las limitaciones si se usaron promedios regionales.

## 4. RESUMEN EJECUTIVO
Cierra con 1-2 párrafos claros con el valor recomendado y estrategia de venta.

FORMATO FINAL
--------
- La sección 1 DEBE ser una Tabla Markdown.
- Las demás secciones deben ser texto narrativo claro.
- NO devuelvas JSON.
        `.trim();

        // --- 2. LLAMADA A PERPLEXITY (MODELO SONAR) ---
        let perplexityContent = '';
        let citations = [];

        try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'sonar',
                    messages: [
                        { role: 'system', content: 'Eres un analista inmobiliario preciso y profesional.' },
                        { role: 'user', content: perplexityPrompt },
                    ],
                    temperature: 0.1,
                    max_tokens: 8000,
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                return new Response(
                    JSON.stringify({ error: `Error Perplexity (${response.status})`, details: errText }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const data = await response.json();
            perplexityContent = data.choices?.[0]?.message?.content || '';
            citations = data.citations || [];
            console.log(`Perplexity completado. Fuentes: ${citations.length}`);

        } catch (e) {
            return new Response(
                JSON.stringify({ error: 'Error conexión Perplexity', details: e.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // --- 3. EXTRACCIÓN ESTRUCTURADA CON DEEPSEEK ---
        const extractionPrompt = `
Del siguiente texto (que contiene tablas y análisis), extrae un JSON estructurado.

TEXTO:
${perplexityContent}

INSTRUCCIONES DE EXTRACCIÓN:
1. "comparables": Extrae CADA FILA de la tabla de inmuebles.
   - "titulo": El nombre o descripción del inmueble.
   - "precio_lista": El número EXACTO del precio.
   - "tipo_operacion": "venta" o "arriendo".
     * IMPORTANTE: Si la columna dice "Venta", es "venta". Si dice "Arriendo", es "arriendo". NO asumas nada por el precio.
   - "area": Área en m².
   - "habitaciones": Número de habitaciones.
   - "ubicacion": Barrio o zona.

2. "resumen_mercado": Extrae un resumen conciso (máximo 2 párrafos) de la sección "RESUMEN EJECUTIVO". Prioriza la valoración y la rentabilidad.

3. "yield_zona": Busca el porcentaje de rentabilidad/yield mencionado en el análisis (ej: 0.5%). Devuélvelo como decimal (0.005).

Devuelve SOLO JSON válido.
        `.trim();

        let extractedData = {};
        try {
            const dsResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: 'Eres un extractor JSON experto. Tu prioridad es la fidelidad a los datos de origen.' },
                        { role: 'user', content: extractionPrompt },
                    ],
                    temperature: 0.0,
                }),
            });

            if (!dsResponse.ok) {
                const errDs = await dsResponse.text();
                return new Response(
                    JSON.stringify({ error: `Error DeepSeek (${dsResponse.status})`, details: errDs }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const dsData = await dsResponse.json();
            let content = dsData.choices?.[0]?.message?.content || '{}';

            // Limpieza Markdown
            content = content.trim();
            if (content.startsWith('```')) {
                const match = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
                if (match && match[1]) content = match[1].trim();
            }

            extractedData = JSON.parse(content);

        } catch (e) {
            return new Response(
                JSON.stringify({ error: 'Error Parseo DeepSeek', details: e.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // --- 4. PROCESAMIENTO Y LÓGICA DE NEGOCIO ---
        const sanitizeNumber = (n) => (typeof n === 'number' && Number.isFinite(n) ? n : null);

        const yieldDefault = 0.0055;
        const yieldExtracted = sanitizeNumber(extractedData.yield_zona);
        const yieldFinal = yieldExtracted || yieldDefault;

        // Portales
        const portalesUnicos = new Set(
            citations.map((url) => {
                try {
                    return new URL(url).hostname.replace('www.', '').replace('.com.co', '').replace('.com', '');
                } catch { return null; }
            }).filter(Boolean)
        );
        const portalesList = Array.from(portalesUnicos);
        if (portalesList.length === 0) portalesList.push('fincaraiz', 'metrocuadrado');

        // Procesamiento de Comparables (SIN HEURÍSTICA)
        const comparables = (extractedData.comparables || [])
            .map((c) => {
                const areaComp = sanitizeNumber(c.area);
                const precioLista = sanitizeNumber(c.precio_lista);

                // --- CLASIFICACIÓN ESTRICTA ---
                // Respetamos estrictamente lo que dice la fuente
                const esArriendo = c.tipo_operacion?.toLowerCase().includes('arriendo');
                // ---------------------------

                let precioVentaEstimado = 0;
                let precioM2 = 0;

                if (esArriendo) {
                    // Arriendo -> Capitalización
                    if (precioLista && yieldFinal > 0) {
                        precioVentaEstimado = Math.round(precioLista / yieldFinal);
                    }
                    if (precioVentaEstimado && areaComp) {
                        precioM2 = Math.round(precioVentaEstimado / areaComp);
                    }
                } else {
                    // Venta -> Directo
                    precioVentaEstimado = precioLista || 0;
                    if (precioVentaEstimado && areaComp) {
                        precioM2 = Math.round(precioVentaEstimado / areaComp);
                    }
                }

                return {
                    titulo: c.titulo || 'Inmueble',
                    tipo_origen: esArriendo ? 'arriendo' : 'venta',
                    barrio: c.ubicacion || formData.barrio,
                    municipio: formData.municipio,
                    area_m2: areaComp,
                    habitaciones: sanitizeNumber(c.habitaciones),
                    banos: sanitizeNumber(c.banos),

                    precio_publicado: precioLista,
                    precio_cop: precioVentaEstimado,
                    precio_m2: precioM2,
                    yield_mensual: esArriendo ? yieldFinal : null,
                };
            })
            .filter((c) => c.precio_cop > 0 && c.area_m2 > 0);

        // Validación Mínima
        if (comparables.length < 5) {
            return new Response(
                JSON.stringify({
                    error: 'Datos insuficientes',
                    details: `Solo se encontraron ${comparables.length} comparables válidos.`,
                    perplexity_full_text: perplexityContent,
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Cálculos Finales
        const compsVenta = comparables.filter((c) => c.tipo_origen === 'venta');
        const compsArriendo = comparables.filter((c) => c.tipo_origen === 'arriendo');

        // 1. Venta Directa
        let valorVentaDirecta = null;
        let precioM2Promedio = 0;
        if (compsVenta.length > 0) {
            const sumM2 = compsVenta.reduce((acc, c) => acc + c.precio_m2, 0);
            precioM2Promedio = Math.round(sumM2 / compsVenta.length);
            valorVentaDirecta = Math.round(precioM2Promedio * area);
        }

        // 2. Rentabilidad
        let valorRentabilidad = null;
        let canonPromedio = 0;
        if (compsArriendo.length > 0) {
            const sumCanon = compsArriendo.reduce((acc, c) => acc + c.precio_publicado, 0);
            canonPromedio = Math.round(sumCanon / compsArriendo.length);
            valorRentabilidad = Math.round(canonPromedio / yieldFinal);
        } else {
            // Fallback
            if (valorVentaDirecta) {
                valorRentabilidad = valorVentaDirecta;
                canonPromedio = Math.round(valorVentaDirecta * yieldFinal);
            }
        }

        // 3. Ponderación
        let valorFinal = 0;
        if (valorVentaDirecta && valorRentabilidad && compsArriendo.length > 0) {
            valorFinal = Math.round(valorVentaDirecta * 0.6 + valorRentabilidad * 0.4);
        } else {
            valorFinal = valorVentaDirecta || valorRentabilidad || 0;
        }

        const precioM2Usado = precioM2Promedio || (valorFinal > 0 ? Math.round(valorFinal / area) : 0);

        const resultado = {
            resumen_busqueda: extractedData.resumen_mercado || 'Análisis de mercado realizado.',
            valor_final: valorFinal,
            rango_valor_min: Math.round(valorFinal * 0.95),
            rango_valor_max: Math.round(valorFinal * 1.05),

            valor_estimado_venta_directa: valorVentaDirecta,
            precio_m2_usado: precioM2Usado,

            valor_estimado_rentabilidad: valorRentabilidad,
            canon_arriendo_promedio: canonPromedio,
            yield_mensual_mercado: yieldFinal,

            total_comparables: comparables.length,
            total_comparables_venta: compsVenta.length,
            total_comparables_arriendo: compsArriendo.length,
            portales_consultados: portalesList,

            comparables: comparables,
            perplexity_full_text: perplexityContent,
        };

        return new Response(JSON.stringify(resultado), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    },
};
