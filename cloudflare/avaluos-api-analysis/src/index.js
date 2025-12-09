/**
 * avaluos-api-analysis V11 (Anti-Hallucination + Robust + IQR + Deduplication)
 * - Prompts V11: Anti-hallucination system with fuente_validacion
 * - Prompt V2 (Recomendado): Lógica de área dinámica + Fallback robusto
 * - Extracción estricta (V7 logic)
 * - Resumen conciso (V8 logic)
 * - Filtro IQR y Normalización (V10 logic)
 */


// --- HELPER: Similitud de Texto (Levenshtein simplificado -> Ratio) ---
function getSimilarity(s1, s2) {
    if (!s1 || !s2) return 0;
    const str1 = s1.toLowerCase().trim();
    const str2 = s2.toLowerCase().trim();
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    const distance = matrix[len1][len2];
    return 1 - distance / Math.max(len1, len2);
}

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

        // --- VARIABLES V9 ---
        const areaConstruida = area;
        const infoInmueble = `
- Tipo: ${tipoInmueble}
${esLote ? `- Uso del Lote: ${usoLote}` : ''}
- Ubicación: ${ubicacion}
${formData.nombre_conjunto ? `- Conjunto/Edificio: ${formData.nombre_conjunto}` : ''}
${!esLote ? `- Habitaciones: ${formData.habitaciones || '?'}` : ''}
${!esLote ? `- Baños: ${formData.banos || '?'}` : ''}
${!esLote ? `- Parqueadero: ${formData.tipo_parqueadero || 'No indicado'}` : ''}
${!esLote ? `- Antigüedad: ${formData.antiguedad || 'No indicada'}` : ''}
${!esLote ? `- Estado: ${formData.estado_inmueble || 'No especificado'}` : ''}
${!esLote && formData.tipo_remodelacion ? `- Remodelación: ${formData.tipo_remodelacion} (${formData.valor_remodelacion || 'Valor no indicado'})` : ''}
${!esLote && formData.descripcion_mejoras ? `- Mejoras: ${formData.descripcion_mejoras}` : ''}
${formData.informacion_complementaria ? `- NOTAS ADICIONALES: ${formData.informacion_complementaria}` : ''}
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
1. OMITIR POR COMPLETO EL ENFOQUE DE RENTABILIDAD.
   - PROHIBIDO BUSCAR O INCLUIR ARRIENDOS. SOLO VENTA.
2. Busca SOLO comparables de VENTA de lotes con uso ${usoLote}.
3. Si no encuentras suficientes lotes comparables en venta en la zona:
   - Puedes considerar inmuebles ${usoLote === 'comercial' ? 'comerciales' : 'residenciales'} construidos en el mismo sector.
   - Estima el valor aproximado del terreno como un porcentaje razonable del valor total del inmueble (Método Residual).
   - Por ejemplo, un lote puede valer entre 25% y 40% del valor de una propiedad construida si el terreno es el activo principal.
   - Explica claramente si usas esta lógica de "proxy" en el análisis.
4. Evita comparar con fincas productivas o proyectos de gran escala si el lote es pequeño/urbano.
5. METODOLOGÍA:
   - NUNCA uses la frase "Punto de equilibrio" ni "Enfoque de ingresos".
   - USA EXACTAMENTE ESTA FRASE en tu resumen: "Valor obtenido a partir del análisis de mercado y método residual, sin aplicar enfoque de rentabilidad".
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
1. **PRIORIDAD ABSOLUTA: NO INVENTES DATOS ESPECÍFICOS**
   - Si encuentras información real de portales (Fincaraíz, Metrocuadrado, Ciencuadras, etc.), úsala.
   - Si NO encuentras suficientes datos reales en portales, DEBES complementar con:
     * Estadísticas municipales y regionales VERIFICABLES.
     * Valores típicos de mercado según tamaño del inmueble y ubicación.
     * Datos de barrios o zonas CERCANAS similares en características.
   - **NUNCA inventes precios específicos de propiedades individuales que no existan.**
   - Si usas promedios o datos agregados, DÉJALO CLARO en la descripción del comparable.

2. **ESTRATEGIA PARA COMPLETAR MUESTRA:**
   - Si hay pocos datos en la zona exacta, amplía tu búsqueda a:
     * Barrios adyacentes o del mismo estrato socioeconómico
     * Municipios cercanos (Dosquebradas, La Virginia, Santa Rosa de Cabal si es Pereira)
     * Zonas con características demográficas similares
   - Indica CLARAMENTE cuando uses datos de zonas alternativas.

3. **PRESENTACIÓN DE COMPARABLES:**
   - Entrega idealmente entre 15 y 20 comparables en total.
   - ${esLote ? 'SOLO incluye propiedades en VENTA (Estrictamente prohibido arriendos).' : 'Incluye AL MENOS 6 propiedades en ARRIENDO en barrios similares para enriquecer el análisis.'}
   - Para cada comparable, indica:
     * Si es dato REAL de portal inmobiliario (fuente_validacion: portal_verificado)
     * Si es ESTIMACIÓN basada en promedios de zona (fuente_validacion: estimacion_zona)
     * Si proviene de zona ALTERNATIVA (fuente_validacion: zona_similar, especificar cuál)

4. NUNCA devuelvas valores "0", "null", "N/A" o similares.
5. Incluye precios, áreas y valores de mercado siempre en pesos colombianos.
6. Responde SIEMPRE en español.
7. IMPORTANTE: Todas las cifras deben escribirse COMPLETAS en pesos colombianos, sin abreviaciones.
   Ejemplo: usar $4.200.000, NO 4.2M ni 4.200K.
8. Sincronización de Conteos:
    - Ajusta el campo "total_comparables" mencionado en el texto para que COINCIDA EXACTAMENTE con el número de items listados.

TAREAS
------

## 1. BÚSQUEDA Y SELECCIÓN DE COMPARABLES

Primero, detalla brevemente la disponibilidad de información encontrada.

Luego presenta un listado de **entre 15 a 20 comparables** usando EXACTAMENTE este formato (usa la etiqueta <br> para saltos de línea):

**[Título descriptivo del inmueble]**<br>
[Tipo de inmueble] | [Venta/Arriendo]<br>
$[Precio] | [Área] m² | [Hab] hab | [Baños] baños<br>
[Barrio] | [Ciudad]<br>
**[Fuente]**<br>
fuente_validacion: [portal_verificado/estimacion_zona/zona_similar/promedio_municipal]<br>
[NOTA: Si es zona_similar o estimacion_zona, añade una línea explicativa breve]

Ejemplo:
**Apartamento en Condina, Pereira**<br>
Apartamento | Venta<br>
$245.000.000 | 68 m² | 3 hab | 2 baños<br>
Condina | Pereira<br>
**Fincaraiz**<br>
fuente_validacion: portal_verificado

IMPORTANTE: 
- Respeta EXACTAMENTE este formato.
- Usa la etiqueta HTML \`<br>\` al final de cada línea para garantizar el salto de línea visual.
- Separa cada comparable con una línea en blanco adicional.
- NO incluyas URLs, enlaces ni hipervínculos en ninguna parte del texto.

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
- Presenta el Yield mensual promedio del sector **Yield promedio mercado: 0.5%**
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
        let extractedData = {};
        let nivelConfianza = 'Medio'; // Default
        let estadisticasComparables = {}; // Default

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
   - "precio_lista": Número ENTERO (sin puntos, sin comas, sin $) extraído de la tercera línea.
   - "area": Número (puede tener decimales) antes de "m²" en la tercera línea.
   - "habitaciones": Número antes de "hab" en la tercera línea
   - "banos": Número antes de "baños" en la tercera línea
   - "barrio": Texto antes del | en la cuarta línea (sin etiquetas HTML)
   - "ciudad": Texto después del | en la cuarta línea (sin etiquetas HTML)
   - "fuente": Texto entre ** ** (usualmente antepenúltima línea)
   - "fuente_validacion": Valor después de "fuente_validacion: " (uno de: portal_verificado, estimacion_zona, zona_similar, promedio_municipal)
   - "nota_adicional": Si existe una línea que empieza con "NOTA:", extrae el texto completo (opcional)

   IMPORTANTE: 
   - Elimina cualquier etiqueta HTML (como <br>) de los valores extraídos.
   - Si NO encuentras el campo "fuente_validacion", asume "portal_verificado" por defecto.

2. "resumen_mercado": Extrae un resumen conciso (máximo 2 párrafos) de la sección "RESUMEN EJECUTIVO". Prioriza la valoración y la rentabilidad.

3. "nivel_confianza": Busca en el texto la frase "Nivel de confianza:" y extrae el valor (Alto/Medio/Bajo). Si no existe, devuelve null.

4. "yield_zona": ${esLote ? 'IGNORAR (Devolver null)' : 'Busca la frase exacta "Yield promedio mercado: X.XX%" en el texto. Extrae SOLO el número como decimal (ej: si dice "0.5%", devuelve 0.005).'}

5. "valor_recomendado_venta": Busca "Valor Recomendado de Venta: $XXX.XXX.XXX".
   Extrae el número ENTERO (elimina puntos y $).

6. "rango_sugerido_min": Busca "Rango sugerido: $XXX.XXX.XXX - $YYY.YYY.YYY". Extrae el primer número (ENTERO).

7. "rango_sugerido_max": Extrae el segundo número del rango sugerido (ENTERO).

8. "estadisticas_comparables": Busca en sección 5 (LIMITACIONES) y extrae:
   - "porcentaje_datos_reales": Si menciona "X% de comparables son datos reales", extrae el número
   - "porcentaje_estimaciones": Si menciona porcentaje de estimaciones, extrae el número
   - "zonas_alternativas_usadas": Array de strings con nombres de barrios/zonas alternativas mencionadas

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
                        { role: 'system', content: 'Eres un extractor JSON experto. Extrae numeros LIMPIOS (ej: 4200000, no 4.200.000).' },
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
            if (!extractedData || typeof extractedData !== 'object') extractedData = {};

            // Procesar nivel_confianza y estadísticas (ahora asignamos a variables ya declaradas)
            nivelConfianza = extractedData.nivel_confianza || 'Medio';
            estadisticasComparables = extractedData.estadisticas_comparables || {};

            console.log(`Nivel de confianza: ${nivelConfianza}`);
            if (estadisticasComparables.porcentaje_datos_reales) {
                console.log(`Datos reales: ${estadisticasComparables.porcentaje_datos_reales}%`);
            }

        } catch (e) {
            return new Response(
                JSON.stringify({ error: 'Error Parseo DeepSeek', details: e.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // --- 4. PROCESAMIENTO Y LÓGICA DE NEGOCIO ---
        // GLOBAL TRY-CATCH: Captura CUALQUIER error no manejado
        try {
            // Helpers robustos para parseo
            const sanitizePrice = (n) => {
                if (typeof n === 'number') return Number.isFinite(n) ? n : null;
                if (typeof n === 'string') {
                    const clean = n.replace(/\D/g, '');
                    const val = parseInt(clean, 10);
                    return (Number.isFinite(val) && val > 0) ? val : null;
                }
                return null;
            };

            const sanitizeFloat = (n) => {
                if (typeof n === 'number') return Number.isFinite(n) ? n : null;
                if (typeof n === 'string') {
                    const clean = n.replace(',', '.').replace(/[^\d.]/g, '');
                    const val = parseFloat(clean);
                    return Number.isFinite(val) ? val : null;
                }
                return null;
            };

            const yieldDefault = 0.005;  // 0.5% mensual (6% anual) - solo fallback
            const yieldExtracted = sanitizeFloat(extractedData.yield_zona);
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
            const comparablesRaw = Array.isArray(extractedData.comparables) ? extractedData.comparables : [];
            const comparables = comparablesRaw
                .map((c) => {
                    const areaComp = sanitizeFloat(c.area);
                    const precioLista = sanitizePrice(c.precio_lista);

                    const esArriendo = c.tipo_operacion && typeof c.tipo_operacion === 'string' && c.tipo_operacion.toLowerCase().includes('arriendo');

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


                    const comparable = {
                        titulo: c.titulo || 'Inmueble',
                        tipo_origen: esArriendo ? 'arriendo' : 'venta',
                        tipo_inmueble: c.tipo_inmueble || tipoInmueble,
                        barrio: c.barrio || c.ubicacion || formData.barrio,
                        municipio: c.ciudad || formData.municipio,
                        area_m2: areaComp,
                        habitaciones: sanitizeFloat(c.habitaciones),
                        banos: sanitizeFloat(c.banos),

                        precio_publicado: precioLista,
                        precio_cop: precioVentaEstimado,
                        precio_m2: precioM2,
                        yield_mensual: esArriendo ? yieldFinal : null,

                        fuente_validacion: c.fuente_validacion || 'portal_verificado',
                        nota_adicional: c.nota_adicional || null
                    };

                    // Logging interno para verificación (no se envía al frontend)
                    const notaSafe = comparable.nota_adicional ? String(comparable.nota_adicional) : '';
                    console.log(`[${comparable.titulo}] Validación: ${comparable.fuente_validacion}${notaSafe ? ' | Nota: ' + notaSafe.substring(0, 50) : ''}`);

                    return comparable;
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
                const sortedByM2 = [...compsVenta].sort((a, b) => a.precio_m2 - b.precio_m2);
                // Poda del 10%
                let filteredComps = sortedByM2;
                if (sortedByM2.length >= 5) {
                    const cut = Math.floor(sortedByM2.length * 0.1);
                    filteredComps = sortedByM2.slice(cut, sortedByM2.length - cut);
                }

                const sumM2 = filteredComps.reduce((acc, c) => acc + c.precio_m2, 0);
                precioM2Promedio = Math.round(sumM2 / filteredComps.length);
                valorVentaDirecta = Math.round(precioM2Promedio * area);
            }

            // 2. Rentabilidad
            let valorRentabilidad = null;
            let canonPromedio = 0;

            if (!esLote) {
                if (compsArriendo.length > 0) {
                    const sumCanon = compsArriendo.reduce((acc, c) => acc + c.precio_publicado, 0);
                    canonPromedio = Math.round(sumCanon / compsArriendo.length);
                    valorRentabilidad = Math.round(canonPromedio / yieldFinal);
                } else {
                    if (valorVentaDirecta) {
                        valorRentabilidad = valorVentaDirecta;
                        canonPromedio = Math.round(valorVentaDirecta * yieldFinal);
                    }
                }
            }

            // 3. Valor Recomendado Perplexity
            const valorRecomendado = sanitizePrice(extractedData.valor_recomendado_venta);

            let valorPonderado = null;
            if (esLote) {
                valorPonderado = valorVentaDirecta;
            } else {
                valorPonderado = (valorVentaDirecta && valorRentabilidad && compsArriendo.length > 0)
                    ? Math.round(valorVentaDirecta * 0.6 + valorRentabilidad * 0.4)
                    : null;
            }

            const valorFinal = valorRecomendado || valorVentaDirecta || valorRentabilidad || 0;
            const valorFuente = valorRecomendado ? 'perplexity' : 'calculado';

            // Corrección Lotes
            if (esLote && valorRecomendado) {
                valorVentaDirecta = valorRecomendado;
                precioM2Promedio = Math.round(valorRecomendado / area);
            }

            console.log(`Valor final: $${valorFinal.toLocaleString()} (fuente: ${valorFuente})`);

            const precioM2Usado = precioM2Promedio || (valorFinal > 0 ? Math.round(valorFinal / area) : 0);

            // 4. Rangos
            const rangoMin = sanitizePrice(extractedData.rango_sugerido_min) || Math.round(valorFinal * 1.00);
            const rangoMax = sanitizePrice(extractedData.rango_sugerido_max) || Math.round(valorFinal * 1.04);
            const rangoFuente = extractedData.rango_sugerido_min ? 'perplexity' : 'calculado';

            // --- 5. DEDUPLICACIÓN Y FILTRADO (V10) ---
            const uniqueComparables = [];
            for (const comp of comparables) {
                const isDuplicate = uniqueComparables.some(existing => {
                    const precioBaseExisting = existing.precio_cop || existing.precio_publicado || 0;
                    const precioBaseComp = comp.precio_cop || comp.precio_publicado || 0;
                    const areaBaseExisting = existing.area_m2 || 0;
                    const areaBaseComp = comp.area_m2 || 0;

                    const priceMatch = precioBaseExisting > 0
                        ? Math.abs(precioBaseExisting - precioBaseComp) / precioBaseExisting < 0.01
                        : false;
                    const areaMatch = areaBaseExisting > 0
                        ? Math.abs(areaBaseExisting - areaBaseComp) / areaBaseExisting < 0.01
                        : false;
                    const titleSim = getSimilarity(existing.titulo, comp.titulo);

                    return priceMatch && areaMatch && titleSim >= 0.7;
                });
                if (!isDuplicate) uniqueComparables.push(comp);
            }

            // Filtro Area
            let comparablesFiltradosPorArea = uniqueComparables;
            if (!esLote || area <= 1000) {
                comparablesFiltradosPorArea = uniqueComparables.filter(c => {
                    const a = c.area_m2 || 0;
                    return a >= area * 0.5 && a <= area * 1.5;
                });
            }

            // Filtro Lote Grande
            let comparablesParaTabla = comparablesFiltradosPorArea;
            if (esLote && area > 1000) {
                const filtrados = comparablesFiltradosPorArea.filter(c => (c.area_m2 || 0) >= 500);
                comparablesParaTabla = filtrados.length >= 3 ? filtrados : comparablesFiltradosPorArea;
            }

            // D) FILTRO IQR (New V10 Logic)
            if (comparablesParaTabla.length >= 5) {
                const preciosM2 = comparablesParaTabla.map(c => c.precio_m2).filter(p => p > 0).sort((a, b) => a - b);
                if (preciosM2.length >= 4) {
                    const q1Index = Math.floor(preciosM2.length * 0.25);
                    const q3Index = Math.floor(preciosM2.length * 0.75);
                    const q1 = preciosM2[q1Index];
                    const q3 = preciosM2[q3Index];
                    const iqr = q3 - q1;
                    const minThreshold = q1 - iqr * 1.5;
                    const maxThreshold = q3 + iqr * 1.5;

                    const filtradosIQR = comparablesParaTabla.filter(c =>
                        c.precio_m2 >= minThreshold && c.precio_m2 <= maxThreshold
                    );

                    if (filtradosIQR.length >= 5) {
                        console.log(`Filtro IQR aplicado.`);
                        comparablesParaTabla = filtradosIQR;
                    }
                }
            }

            // Normalización Nombres
            comparablesParaTabla = comparablesParaTabla.map(c => {
                let fuente = c.fuente || 'Portal Inmobiliario';
                if (typeof fuente === 'string') {
                    fuente = fuente.replace(/Clencuadras/i, 'Ciencuadras')
                        .replace(/Fincaraiz/i, 'FincaRaíz')
                        .replace(/MetroCuadrado/i, 'Metrocuadrado')
                        .replace(/Mercadolibre/i, 'MercadoLibre');
                }
                return { ...c, fuente };
            });

            // Sincronización de Conteos
            const totalReal = comparablesParaTabla.length;
            const totalVenta = comparablesParaTabla.filter(c => c.tipo_origen === 'venta').length;
            const totalArriendo = comparablesParaTabla.filter(c => c.tipo_origen === 'arriendo').length;

            let finalPerplexityText = perplexityContent || '';
            finalPerplexityText = finalPerplexityText.replace(/(presentan|listado de|encontraron|selección de)\s+(\d+)\s+(comparables|inmuebles|propiedades)/gi, `$1 ${totalReal} $3`);

            let resumenFinal = extractedData.resumen_mercado || 'Análisis de mercado realizado.';
            resumenFinal = resumenFinal.replace(/(presentan|listado de|encontraron|selección de)\s+(\d+)\s+(comparables|inmuebles|propiedades)/gi, `$1 ${totalReal} $3`);

            const resultado = {
                resumen_busqueda: resumenFinal,
                valor_final: valorFinal,
                valor_fuente: valorFuente,
                valor_ponderado_referencia: valorPonderado,
                rango_valor_min: rangoMin,
                rango_valor_max: rangoMax,
                rango_fuente: rangoFuente,

                valor_estimado_venta_directa: valorVentaDirecta,
                valor_estimado_rentabilidad: valorRentabilidad,

                // ERROR 2
                precio_m2_final: precioM2Usado,

                // ERROR 3
                metodo_mercado_label: 'Enfoque de Mercado (promedio real)',
                metodo_ajuste_label: valorRecomendado ? 'Ajuste de Perplexity (criterio técnico)' : 'Promedio de Mercado',

                comparables: comparablesParaTabla,
                total_comparables: comparablesParaTabla.length,
                total_comparables_venta: totalVenta,
                total_comparables_arriendo: totalArriendo,

                // Nivel de confianza y estadísticas de fuentes (V11)
                nivel_confianza: nivelConfianza,
                estadisticas_fuentes: {
                    total_portal_verificado: comparablesParaTabla.filter(c => c.fuente_validacion === 'portal_verificado').length,
                    total_estimacion_zona: comparablesParaTabla.filter(c => c.fuente_validacion === 'estimacion_zona').length,
                    total_zona_similar: comparablesParaTabla.filter(c => c.fuente_validacion === 'zona_similar').length,
                    total_promedio_municipal: comparablesParaTabla.filter(c => c.fuente_validacion === 'promedio_municipal').length,
                },

                // ERROR 1: Defaults
                ficha_tecnica_defaults: {
                    habitaciones: 'No especificado',
                    banos: 'No especificado',
                    garajes: 'No especificado',
                    estrato: 'No especificado',
                    antiguedad: 'No especificado'
                },

                yield_mensual_mercado: yieldFinal,
                area_construida: area,
                perplexity_full_text: finalPerplexityText
            };

            return new Response(JSON.stringify(resultado), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });

        } catch (processingError) {
            // GLOBAL CATCH: Captura CUALQUIER error no manejado en el procesamiento
            console.error('Error crítico en procesamiento:', processingError);
            return new Response(
                JSON.stringify({
                    error: 'Error interno en procesamiento',
                    details: processingError.message || 'Error desconocido',
                    stack: processingError.stack || null
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
    },
};