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
        const tipoInmueble = (formData.tipo_inmueble || 'inmueble').toLowerCase();
        const esLote = tipoInmueble === 'lote';
        const usoLote = formData.uso_lote || 'residencial'; // Default a residencial si no viene
        const ubicacion = `${formData.barrio || ''}, ${formData.municipio || ''}`.trim();

        // Fallback de área
        let areaBase = parseInt(formData.area_construida);
        if (!Number.isFinite(areaBase) || areaBase <= 0) areaBase = 60;
        const area = areaBase;

        const minArea = Math.round(area * 0.7); // -30%
        const maxArea = Math.round(area * 1.3); // +30%

        // --- VARIABLES V9 ---
        const areaConstruida = area;
        const infoInmueble = `
- Tipo: ${tipoInmueble}
${esLote ? `- Uso del Lote: ${usoLote}` : ''}
- Ubicación: ${ubicacion}
- Habitaciones: ${formData.habitaciones || '?'}
`.trim();

        const areaInstruction = areaConstruida
            ? `
- ÁREA CONSTRUIDA: ${areaConstruida} m²
- Rango de áreas VENTA (Estricto): ${Math.round(area * 0.5)} a ${Math.round(area * 1.5)} m² (±50%)
- SOLO incluye comparables de venta cuyas áreas estén dentro de este rango. Para arriendos, intenta mantener el área similar, pero prioriza encontrar datos.`
            : '';

        // --- INSTRUCCIONES ESPECÍFICAS PARA LOTES ---
        const instruccionesLote = esLote ? `
INSTRUCCIONES ESPECIALES PARA LOTES:
1. OMITIR POR COMPLETO EL ENFOQUE DE RENTABILIDAD. No busques arriendos.
2. Busca SOLO comparables de VENTA de lotes con uso ${usoLote}.
3. Si no encuentras suficientes lotes comparables en venta en la zona:
   - Puedes considerar inmuebles ${usoLote === 'comercial' ? 'comerciales' : 'residenciales'} construidos en el mismo sector.
   - Estima el valor aproximado del terreno como un porcentaje razonable del valor total del inmueble (Método Residual).
   - Por ejemplo, un lote puede valer entre 25% y 40% del valor de una propiedad construida si el terreno es el activo principal.
   - Explica claramente si usas esta lógica de "proxy" en el análisis.
4. Evita comparar con fincas productivas o proyectos de gran escala si el lote es pequeño/urbano.
` : '';

        // --- PROMPT V9 (ROBUSTO + FALLBACK) ---
        const perplexityPrompt = `
Eres un analista inmobiliario especializado en avalúos comerciales técnicos y estimación de valor apoyada en datos estadísticos del mercado colombiano.
Tu tarea es elaborar un **análisis completo, claro y profesional**, incluso cuando la información disponible sea limitada.

DATOS DEL INMUEBLE
-------------------
Basado en estos datos proporcionados por el usuario:
${infoInmueble}
${areaInstruction}

${instruccionesLote}

INSTRUCCIONES GENERALES (GESTIÓN DE FALLBACK)
---------------------------------------------
1. Si no encuentras suficientes datos reales en portales inmobiliarios, DEBES complementar con:
   - Estadísticas municipales y regionales.
   - Valores típicos de mercado según tamaño del inmueble y ubicación.
2. NUNCA devuelvas valores "0", "null", "N/A" o similares.
3. Si un dato no aparece directamente, GENERA una estimación razonable basada en promedios municipales.
4. Siempre entrega comparables suficientes:
   - Entrega idealmente entre 15 y 20 comparables en total.
   - ${esLote ? 'SOLO incluye propiedades en VENTA.' : 'Incluye propiedades en arriendo (mínimo 3).'}
   - Incluye propiedades de barrios similares.
5. NO incluyas hipervínculos ni enlaces. Solo textos descriptivos.
6. Incluye precios, áreas y valores de mercado siempre en pesos colombianos.
7. Responde SIEMPRE en español.

TAREAS
------

## 1. BÚSQUEDA Y SELECCIÓN DE COMPARABLES

Primero, detalla brevemente la disponibilidad de información encontrada.

Luego presenta un listado de **entre 15 a 20 comparables** usando EXACTAMENTE este formato (usa la etiqueta <br> para saltos de línea):

**[Título descriptivo del inmueble]**<br>
[Tipo de inmueble] | [Venta/Arriendo]<br>
$[Precio] | [Área] m² | [Hab] hab | [Baños] baños<br>
[Barrio] | [Ciudad]<br>
**[Fuente]**

Ejemplo:
**Apartamento en Condina, Pereira**<br>
Apartamento | Venta<br>
$245.000.000 | 68 m² | 3 hab | 2 baños<br>
Condina | Pereira<br>
**Fincaraiz**

IMPORTANTE: 
- Respeta EXACTAMENTE este formato.
- Usa la etiqueta HTML \`<br>\` al final de cada línea para garantizar el salto de línea visual.
- Separa cada comparable con una línea en blanco adicional.

## 2. ANÁLISIS DEL VALOR

### 2.1. Método de Venta Directa (Precio por m²)
- Calcula el valor promedio por m² del mercado basándote en los comparables de venta filtrados.
- Indica el valor por m² FINAL que decides usar (ajustado por antigüedad, estado, etc.).
- Calcula el valor estimado: Precio por m² final × ${areaConstruida || 'área'} m².

${!esLote ? `### 2.2. Método de Rentabilidad (Yield Mensual)
- **CÁLCULO DEL CANON:** No uses un promedio simple de precios totales.
  1. Calcula el precio por m² de arriendo de cada comparable (Precio / Área).
  2. Obtén el promedio de canon/m².
  3. Multiplica ese promedio por los ${areaConstruida || 'metros'} m² del inmueble objetivo para obtener el Canon Mensual Estimado.
- Investiga y Estima el Yield mensual promedio del sector (ej: 0.4% - 0.6%).
- Presenta el Yield mensual promedio del sector **Yield promedio mercado: 0.45%**
- Aplica la fórmula: Valor estimado = Canon Mensual Estimado / Yield mensual promedio.` : ''}

## 3. RESULTADOS FINALES
Entrega de forma clara:
- **Valor Recomendado de Venta: $XXX.XXX.XXX** (valor único, ajustado por todos los factores)
- **Rango sugerido: $XXX.XXX.XXX - $XXX.XXX.XXX** (rango de publicación recomendado)
- Precio por m² final usado para el cálculo.
- Comentario sobre la posición del inmueble en el mercado (liquidez).

## 4. AJUSTES APLICADOS
Explica ajustes aplicados por antigüedad, estado, parqueadero, características especiales, etc.

## 5. LIMITACIONES
Menciona escasez de datos, dependencias de promedios regionales, o cualquier limitación del análisis.

## 6. RESUMEN EJECUTIVO
Cierra con 2-3 párrafos claros que incluyan:
1. Valor técnico recomendado
2. Rango de publicación sugerido
3. Estrategia de venta y posicionamiento de mercado

FORMATO FINAL
--------
- La sección 1 DEBE usar el formato de lista especificado (NO tabla markdown).
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
Del siguiente texto (que contiene listados y análisis), extrae un JSON estructurado.

TEXTO:
${perplexityContent}

INSTRUCCIONES DE EXTRACCIÓN:
1. "comparables": Extrae CADA INMUEBLE del listado (formato multi-línea, NO tabla).
   Cada comparable sigue este patrón:
   
   **Título**
   Tipo | Venta/Arriendo
   Precio | Área | Habitaciones | Baños
   Barrio | Ciudad
   **Fuente**
   
   Extrae:
   - "titulo": Texto entre ** ** de la primera línea (sin etiquetas HTML)
   - "tipo_inmueble": Texto antes del | en la segunda línea (sin etiquetas HTML)
   - "tipo_operacion": Texto después del | en la segunda línea ("Venta" o "Arriendo")
   - "precio_lista": Número después del símbolo $ en la tercera línea (sin puntos ni $)
   - "area": Número antes de "m²" en la tercera línea
   - "habitaciones": Número antes de "hab" en la tercera línea
   - "banos": Número antes de "baños" en la tercera línea
   - "barrio": Texto antes del | en la cuarta línea (sin etiquetas HTML)
   - "ciudad": Texto después del | en la cuarta línea (sin etiquetas HTML)
   - "fuente": Texto entre ** ** de la última línea

   IMPORTANTE: Elimina cualquier etiqueta HTML (como <br>) de los valores extraídos.

2. "resumen_mercado": Extrae un resumen conciso (máximo 2 párrafos) de la sección "RESUMEN EJECUTIVO". Prioriza la valoración y la rentabilidad.

3. "yield_zona": ${esLote ? 'IGNORAR (Devolver null)' : 'Busca la frase exacta "Yield promedio mercado: X.XX%" en el texto. Extrae SOLO el número como decimal (ej: si dice "0.45%", devuelve 0.0045).'}

4. "valor_recomendado_venta": Busca "Valor Recomendado de Venta: $XXX.XXX.XXX".
   Extrae el número (sin separadores de miles ni símbolo $).

5. "rango_sugerido_min": Busca "Rango sugerido: $XXX.XXX.XXX - $YYY.YYY.YYY". Extrae el primer número.

6. "rango_sugerido_max": Extrae el segundo número del rango sugerido.

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

        const yieldDefault = 0.005;  // 0.5% mensual (6% anual) - solo fallback
        const yieldExtracted = sanitizeNumber(extractedData.yield_zona);
        const yieldFinal = yieldExtracted || yieldDefault;
        console.log(`Yield usado: ${(yieldFinal * 100).toFixed(2)}% mensual (${yieldExtracted ? 'extraído de mercado' : 'fallback'})`);
        const yieldFuente = yieldExtracted ? 'mercado' : 'fallback';

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

                // SI ES LOTE, IGNORAR ARRIENDOS
                if (esLote && esArriendo) return null;

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
                    tipo_inmueble: c.tipo_inmueble || tipoInmueble,
                    barrio: c.barrio || c.ubicacion || formData.barrio,
                    municipio: c.ciudad || formData.municipio,
                    area_m2: areaComp,
                    habitaciones: sanitizeNumber(c.habitaciones),
                    banos: sanitizeNumber(c.banos),

                    precio_publicado: precioLista,
                    precio_cop: precioVentaEstimado,
                    precio_m2: precioM2,
                    yield_mensual: esArriendo ? yieldFinal : null,
                };
            })
            .filter((c) => c && c.precio_cop > 0 && c.area_m2 > 0);

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

        // 1. Venta Directa (CON PODA DE OUTLIERS)
        let valorVentaDirecta = null;
        let precioM2Promedio = 0;

        if (compsVenta.length > 0) {
            // Ordenar por precio m2
            const sortedByM2 = [...compsVenta].sort((a, b) => a.precio_m2 - b.precio_m2);

            // Poda del 10% superior e inferior (si hay suficientes datos)
            let filteredComps = sortedByM2;
            if (sortedByM2.length >= 5) {
                const cut = Math.floor(sortedByM2.length * 0.1); // 10%
                filteredComps = sortedByM2.slice(cut, sortedByM2.length - cut);
            }

            const sumM2 = filteredComps.reduce((acc, c) => acc + c.precio_m2, 0);
            precioM2Promedio = Math.round(sumM2 / filteredComps.length);
            valorVentaDirecta = Math.round(precioM2Promedio * area);
        }

        // 2. Rentabilidad
        let valorRentabilidad = null;
        let canonPromedio = 0;

        if (!esLote) { // SOLO SI NO ES LOTE
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
        }

        // 3. Usar valor recomendado por Perplexity (o calcular como fallback)
        const valorRecomendado = sanitizeNumber(extractedData.valor_recomendado_venta);

        let valorPonderado = null;
        if (esLote) {
            // Para lotes, solo mercado
            valorPonderado = valorVentaDirecta;
        } else {
            // Para otros, ponderado
            valorPonderado = (valorVentaDirecta && valorRentabilidad && compsArriendo.length > 0)
                ? Math.round(valorVentaDirecta * 0.6 + valorRentabilidad * 0.4)
                : null;
        }

        const valorFinal = valorRecomendado || valorVentaDirecta || valorRentabilidad || 0;
        const valorFuente = valorRecomendado ? 'perplexity' : 'calculado';
        console.log(`Valor final: $${valorFinal.toLocaleString()} (fuente: ${valorFuente})`);

        const precioM2Usado = precioM2Promedio || (valorFinal > 0 ? Math.round(valorFinal / area) : 0);

        // 4. Usar rango sugerido por Perplexity (o calcular como fallback)
        const rangoMin = sanitizeNumber(extractedData.rango_sugerido_min) || Math.round(valorFinal * 1.00);
        const rangoMax = sanitizeNumber(extractedData.rango_sugerido_max) || Math.round(valorFinal * 1.04);
        const rangoFuente = extractedData.rango_sugerido_min ? 'perplexity' : 'calculado';
        console.log(`Rango: $${rangoMin.toLocaleString()} - $${rangoMax.toLocaleString()} (fuente: ${rangoFuente})`);

        const resultado = {
            resumen_busqueda: extractedData.resumen_mercado || 'Análisis de mercado realizado.',
            valor_final: valorFinal,
            valor_fuente: valorFuente,
            valor_ponderado_referencia: valorPonderado,
            rango_valor_min: rangoMin,
            rango_valor_max: rangoMax,
            rango_fuente: rangoFuente,

            valor_estimado_venta_directa: valorVentaDirecta,
            precio_m2_usado: precioM2Usado,

            valor_estimado_rentabilidad: valorRentabilidad,
            canon_arriendo_promedio: canonPromedio,
            yield_mensual_mercado: yieldFinal,
            yield_fuente: yieldFuente,

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
