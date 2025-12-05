/**
 * avaluos-api-analysis
 * Cloudflare Worker para análisis de mercado con Perplexity + DeepSeek
 */
console.log("Deploy test - " + new Date().toISOString());

export default {
    async fetch(request, env) {
        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle OPTIONS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if (request.method !== 'POST') {
            return new Response(
                JSON.stringify({ error: 'Method not allowed' }),
                { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 1. Leer body
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

        if (!PERPLEXITY_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'PERPLEXITY_API_KEY no configurada' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!DEEPSEEK_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'DEEPSEEK_API_KEY no configurada' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // -----------------------------
        // 2. Contexto del inmueble
        // -----------------------------

        const tipoInmueble = formData.tipo_inmueble || 'inmueble';

        const ubicacionPrincipal =
            formData.nombre_conjunto && formData.contexto_zona === 'conjunto_cerrado'
                ? `${formData.nombre_conjunto}, ${formData.barrio}, ${formData.municipio}`
                : `${formData.barrio}, ${formData.municipio}`;

        const ubicacionCiudad = `${formData.municipio}, ${formData.departamento}`;

        const infoInmueble = `
- Tipo: ${tipoInmueble}
- Ubicación principal: ${ubicacionPrincipal}
- Ciudad: ${ubicacionCiudad}
- Área construida: ${formData.area_construida} m²
- Habitaciones: ${formData.habitaciones || 'No especificado'}
- Baños: ${formData.banos || 'No especificado'}
- Parqueadero: ${formData.tipo_parqueadero || 'No especificado'}
- Estado: ${formData.estado_inmueble || 'No especificado'}
- Antigüedad: ${formData.antiguedad || 'No especificada'}
${formData.tipo_remodelacion ? `- Tipo de remodelación: ${formData.tipo_remodelacion}` : ''}
${formData.informacion_complementaria ? `- Información adicional: ${formData.informacion_complementaria}` : ''}
  `.trim();

        // -----------------------------
        // 3. PROMPT PARA PERPLEXITY
        // -----------------------------

        const areaConstruida = formData.area_construida ? parseInt(formData.area_construida) : null;
        const margenArea = 0.30;
        const minArea = areaConstruida ? Math.round(areaConstruida * (1 - margenArea)) : null;
        const maxArea = areaConstruida ? Math.round(areaConstruida * (1 + margenArea)) : null;

        const areaInstruction = areaConstruida
            ? `

CRITERIOS DE SELECCIÓN PARA COMPARABLES DE VENTA:
   - Área construida del inmueble objetivo: ${areaConstruida} m²
   - Rango de áreas aceptable para comparables de venta: ${minArea} a ${maxArea} m² (±30%)
   - SOLO incluye comparables de venta cuyas áreas estén dentro de este rango.
   - Para arriendos, el área puede ser más flexible pero intenta mantenerla similar.`
            : '';

        const perplexityPrompt = `
Eres un analista inmobiliario especializado en avalúos comerciales técnicos y estimación de valor apoyada en datos estadísticos del mercado colombiano.
Tu tarea es elaborar un **análisis completo, claro y profesional**, incluso cuando la información disponible sea limitada.

DATOS DEL INMUEBLE
-------------------
Basado en estos datos proporcionados por el usuario:

${infoInmueble}

INSTRUCCIONES GENERALES
------------------------
1. Si no encuentras suficientes datos reales en portales inmobiliarios, DEBES complementar con:
   - Estadísticas municipales y regionales (promedios por m² según ciudad y estrato).
   - Barrios de características socioeconómicas similares (mismo estrato, antigüedad promedio, tipología).
   - Valores típicos de mercado según tamaño del inmueble y ubicación.
2. NUNCA devuelvas valores "0", "null", "N/A" o similares.
3. Si un dato no aparece directamente, GENERA una estimación razonable basada en promedios municipales, del estrato o del tipo de inmueble.
4. Siempre entrega comparables suficientes aunque no existan exactos en la zona:
   - Entrega idealmente entre 15 y 25 comparables en total (si el mercado lo permite).
   - Incluye propiedades en arriendo. Incluye al menos 3.
   - Incluye propiedades de barrios similares (en barrios cercanos o condiciones socioeconómicas equivalentes, rangos de area y precios comparables). Incluye al menos 3.
   ${areaInstruction}
5. NO incluyas hipervínculos ni enlaces. Solo textos descriptivos.
6. Incluye precios, áreas y valores de mercado siempre en pesos colombianos.
7. Responde SIEMPRE en español.
8. AL FINAL DEL ANÁLISIS, agrega una sección explícita llamada "FUENTES CONSULTADAS" donde listes los dominios de los portales visitados (ej: fincaraiz.com.co, metrocuadrado.com, ciencuadras.com).

TAREAS
------

## 1. BÚSQUEDA Y SELECCIÓN DE COMPARABLES

Primero, comenta brevemente qué tan abundante o escasa es la información del mercado para este inmueble.

Luego presenta un listado de **entre 15 a 25 comparables**. Para cada uno indica:

- Título o descripción del inmueble.
- Barrio y municipio.
- Tipo de operación: Venta o Arriendo.
- Si el barrio es:
  - "Mismo barrio/conjunto"
  - "Barrio similar (mismo estrato y tipología)"
  - "Zona cercana de referencia regional"
- Área aproximada en m².
- Precio total aproximado.
- Precio por m² aproximado.

Aunque la información de portales no sea perfecta, debes estimar valores razonables usando contexto de mercado (ciudad, estrato, tipo de inmueble).

## 2. ANÁLISIS DEL VALOR

### 2.1. Método de Venta Directa (Precio por m²)

- Explica cómo calculas el valor promedio por m² del mercado para este inmueble:
  - Si usas promedio simple, recortado o ponderado.
  - Si combina datos del barrio, barrios similares y promedios municipales.
- Indica el valor por m² FINAL que decides usar para el cálculo del inmueble objetivo.
- Calcula el valor estimado del inmueble objetivo por este método (precio por m² x área).

### 2.2. Método de Rentabilidad (Yield mensual promedio del mercado)

- Estima el canon de arrendamiento mensual promedio para este inmueble usando los comparables.
- Estima el Yield (Rentabilidad) mensual promedio del sector (ej: 0.4%, 0.5%, 0.6%).
- Aplícalo a la fórmula:

  Valor estimado = Canon mensual estimado / Yield mensual estimado

- Indica claramente el Canon mensual y el Yield mensual utilizados.
- Calcula el valor estimado del inmueble objetivo por este método.

## 3. RESULTADOS FINALES

Entrega de forma clara:

- Valor comercial estimado (promedio ponderado entre ambos métodos, explica cuál pesa más y por qué).
- Rango sugerido de negociación (mínimo y máximo razonables).
- Precio por m² final usado para el cálculo.
- Comentario sobre si el resultado se ubica en la parte baja, media o alta del mercado del sector.

## 4. AJUSTES APLICADOS

Explica qué ajustes aplicas y por qué:

- Ajustes por antigüedad vs. comparables.
- Ajustes por estado de conservación (bueno, regular, excelente).
- Ajustes por parqueadero (tener, no tener, tipo).
- Ajustes por remodelaciones (mejoras significativas o necesidad de inversión).
- Ajustes por entorno (plusvalía del sector, accesos, comercio, servicios).

## 5. LIMITACIONES

Menciona las principales limitaciones del análisis:

- Escasez de datos reales en el barrio.
- Dependencia de promedios municipales o regionales.
- Diferencias de estrato o tipología entre comparables.

## 6. RESUMEN EJECUTIVO PARA EL PROPIETARIO

Cierra con 1 a 2 párrafos claros que expliquen:

- El valor final recomendado.
- El rango sugerido de publicación.
- El nivel de confianza del análisis.
- Recomendaciones de estrategia (publicar un poco arriba del valor recomendado, márgenes de negociación, etc.).

FORMATO
--------
- No uses tablas Markdown.
- Usa subtítulos y listas claras.
- NO devuelvas JSON.
- NO incluyas enlaces.
- Asegúrate de incluir la sección "FUENTES CONSULTADAS" al final con los dominios de los portales.
`.trim();

        // -----------------------------
        // 4. Llamar a Perplexity
        // -----------------------------

        let perplexityContent = '';
        try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'sonar-pro',
                    messages: [
                        {
                            role: 'system',
                            content:
                                'Eres un valuador inmobiliario colombiano experto en análisis de mercado residencial y comercial.',
                        },
                        {
                            role: 'user',
                            content: perplexityPrompt,
                        },
                    ],
                    temperature: 0.25,
                    max_tokens: 8000,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Perplexity API error:', response.status, errorText);
                return new Response(
                    JSON.stringify({
                        error: `Error en Perplexity (${response.status})`,
                        details: errorText,
                    }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const perplexityResponse = await response.json();
            perplexityContent =
                (perplexityResponse.choices &&
                    perplexityResponse.choices[0] &&
                    perplexityResponse.choices[0].message &&
                    perplexityResponse.choices[0].message.content) ||
                '';

            console.log(
                'Perplexity Raw Content (first 2000 chars):',
                perplexityContent.slice(0, 2000),
            );
        } catch (err) {
            console.error('Perplexity request failed:', err);
            return new Response(
                JSON.stringify({ error: 'Error al llamar a Perplexity', details: err.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!perplexityContent) {
            return new Response(
                JSON.stringify({ error: 'Perplexity devolvió una respuesta vacía' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // -----------------------------
        // 5. Esquema JSON para DeepSeek
        // -----------------------------

        const jsonSchema = {
            type: 'object',
            properties: {
                resumen_busqueda: {
                    type: 'string',
                    description:
                        'Resumen ejecutivo completo y rico en detalles, explicando las variables usadas, el valor m² y las principales conclusiones. DEBE SER EXTENSO Y EXPLICATIVO.',
                },
                total_comparables: { type: 'number' },
                total_comparables_venta: { type: 'number' },
                total_comparables_arriendo: { type: 'number' },
                portales_consultados: {
                    type: 'array',
                    items: { type: 'string' },
                },

                valor_final: {
                    type: ['number', 'null'],
                    description: 'Valor final recomendado explícitamente en el análisis (ej: "Valor recomendado: $270.000.000")'
                },

                valor_estimado_venta_directa: { type: ['number', 'null'] },
                precio_m2_venta_directa: { type: ['number', 'null'] },
                metodologia_venta_directa: { type: ['string', 'null'] },

                valor_estimado_rentabilidad: { type: ['number', 'null'] },
                canon_arriendo_promedio: { type: ['number', 'null'] },
                metodologia_rentabilidad: { type: ['string', 'null'] },
                yield_mensual_mercado: {
                    type: ['number', 'null'],
                    description: 'Yield mensual promedio del mercado según el análisis (ej: 0.0055 para 0.55%)'
                },

                rango_valor_min: { type: ['number', 'null'] },
                rango_valor_max: { type: ['number', 'null'] },

                precio_m2_usado: { type: ['number', 'null'] },
                metodo_calculo_m2: { type: ['string', 'null'] },
                precio_m2_regional: { type: ['number', 'null'] },

                ajustes_antiguedad: { type: ['string', 'null'] },
                ajustes_parqueadero: { type: ['string', 'null'] },
                limitaciones: { type: ['string', 'null'] },

                comparables: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            titulo: { type: 'string' },
                            tipo_origen: { type: 'string', enum: ['venta', 'arriendo'] },
                            fuente_zona: {
                                type: ['string', 'null'],
                                description:
                                    '"Mismo barrio/conjunto", "Barrio similar", "Zona cercana de referencia regional", etc.',
                            },
                            barrio: { type: ['string', 'null'] },
                            municipio: { type: ['string', 'null'] },
                            area_m2: { type: ['number', 'null'] },
                            habitaciones: { type: ['number', 'null'] },
                            banos: { type: ['number', 'null'] },
                            precio_publicado: { type: ['number', 'null'] },
                            precio_cop: { type: ['number', 'null'] },
                            precio_m2: { type: ['number', 'null'] },
                            yield_mensual: {
                                type: ['number', 'null'],
                                description: 'Yield mensual si es comparable de arriendo (ej: 0.0052 para 0.52%)'
                            }
                        },
                    },
                },
            },
            required: ['comparables'],
        };

        // -----------------------------
        // 6. Prompt de extracción para DeepSeek
        // -----------------------------

        const extractionPrompt = `
A partir del siguiente ANÁLISIS COMERCIAL INMOBILIARIO, extrae la información en el esquema JSON especificado.

INFORMACIÓN DEL INMUEBLE:
${infoInmueble}

ANÁLISIS DE MERCADO (texto generado por Perplexity):
${perplexityContent}

INSTRUCCIONES PARA LA EXTRACCIÓN:

1. EXTRACCIÓN COMPLETA DE COMPARABLES
   - Extrae TODOS los comparables que aparecen en el análisis.
   - NO filtres, NO omitas, NO apliques criterios de área o precio.
   - Incluye todos los comparables que encuentres, tanto de venta como de arriendo.
   - Si el análisis menciona "al menos 15-25 comparables", espera extraer esa cantidad.

2. VALOR FINAL RECOMENDADO
   - Busca en el análisis frases como:
     * "Valor recomendado: $XXX.XXX.XXX"
     * "Valor comercial estimado: $XXX.XXX.XXX" 
     * "Valor final recomendado: $XXX.XXX.XXX"
     * "Valor sugerido: $XXX.XXX.XXX"
   - Extrae ese número exacto como "valor_final".

3. PARA CADA COMPARABLE
   - Llena el arreglo "comparables" con TODOS los elementos que encuentres.
   - Para cada comparable identifica:
     * titulo: nombre o descripción breve.
     * tipo_origen: "venta" o "arriendo".
     * fuente_zona: "Mismo barrio/conjunto", "Barrio similar", etc.
     * barrio y municipio.
     * area_m2: área aproximada.
     * habitaciones y banos: si están mencionados.
     * precio_publicado: precio total aproximado.
     * precio_cop: igual a precio_publicado (si es venta) o valor estimado de venta si es arriendo (canon / yield apropiado).
     * precio_m2: precio_cop / area_m2 si el texto no lo da explícito.
     * yield_mensual: si es comparable de arriendo y se menciona el rendimiento.

4. TOTALES
   - total_comparables: número total de comparables listados (debe coincidir con el tamaño del arreglo).
   - total_comparables_venta: cuántos comparables son de venta.
   - total_comparables_arriendo: cuántos comparables son de arriendo.

5. INDICADORES GLOBALES
   - valor_estimado_venta_directa: valor de venta calculado por el método de precio por m².
   - valor_estimado_rentabilidad: valor calculado como (canon_arriendo_promedio / yield_mensual_mercado).
   - canon_arriendo_promedio: canon mensual estimado.
   - yield_mensual_mercado: yield mensual estimado (ej: 0.005).
   - rango_valor_min y rango_valor_max: rango de negociación recomendado.
   - precio_m2_usado: valor m² final usado en el cálculo.

6. PORTALES CONOCIDOS
   - portales_consultados: Extrae los dominios listados en la sección "FUENTES CONSULTADAS" del análisis. Si no existe esa sección, busca menciones de portales en el texto.

7. AJUSTES Y LIMITACIONES
   - ajustes_antiguedad, ajustes_parqueadero, limitaciones.

8. RESUMEN
   - resumen_busqueda: 1 - 2 párrafos orientados al propietario.

REGLA IMPORTANTE:
   - Extrae TODOS los comparables sin filtrar. El análisis ya aplicó filtros de área y relevancia.
   - Usa null para datos faltantes, nunca 0.
`.trim();

        // -----------------------------
        // 7. Llamar a DeepSeek y procesar
        // -----------------------------
        try {
            const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: 'Eres un asistente experto en análisis y extracción de datos estructurados de textos de avalúos inmobiliarios. TU SALIDA DEBE SER ÚNICAMENTE UN JSON VÁLIDO QUE SIGA EL ESQUEMA SOLICITADO. NO incluyas bloques de código markdown (```json), solo el JSON puro.'
                        },
                        {
                            role: 'user',
                            content: extractionPrompt
                        }
                    ],
                    // response_format removed as it causes 400 error
                    temperature: 0.1
                })
            });

            if (!deepseekResponse.ok) {
                const errorText = await deepseekResponse.text();
                console.error('DeepSeek API error:', deepseekResponse.status, errorText);
                return new Response(
                    JSON.stringify({
                        error: `Error en DeepSeek (${deepseekResponse.status})`,
                        details: errorText,
                        perplexity_full_text: perplexityContent
                    }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const deepseekData = await deepseekResponse.json();
            let content = deepseekData.choices[0].message.content;

            // Limpiar bloques de código si DeepSeek los incluye
            content = content.replace(/```json\n?|```/g, '').trim();

            const extractedData = JSON.parse(content);

            // --- REGEX FALLBACKS PARA VALORES CRÍTICOS ---
            // Si DeepSeek devuelve null en valores clave, intentamos extraerlos con Regex del texto de Perplexity

            if (!extractedData.valor_final) {
                const match = perplexityContent.match(/valor\s+(?:comercial|recomendado|sugerido|final).*?\$?\s*([\d.,]+)/i);
                if (match) extractedData.valor_final = parseFloat(match[1].replace(/[.,](?=\d{3})/g, '').replace(',', '.'));
            }

            if (!extractedData.valor_estimado_venta_directa) {
                const match = perplexityContent.match(/venta\s+directa.*?\$?\s*([\d.,]+)/i);
                if (match) extractedData.valor_estimado_venta_directa = parseFloat(match[1].replace(/[.,](?=\d{3})/g, '').replace(',', '.'));
            }

            if (!extractedData.valor_estimado_rentabilidad) {
                const match = perplexityContent.match(/rentabilidad.*?\$?\s*([\d.,]+)/i);
                if (match) extractedData.valor_estimado_rentabilidad = parseFloat(match[1].replace(/[.,](?=\d{3})/g, '').replace(',', '.'));
            }
            // ---------------------------------------------

            console.log(
                'DeepSeek Extracted Data (first part):',
                JSON.stringify(extractedData, null, 2).slice(0, 2000),
            );

            const comparablesRaw = Array.isArray(extractedData.comparables)
                ? extractedData.comparables
                : [];

            // ==============================================
            // FUNCIONES HELPER SIMPLIFICADAS
            // ==============================================

            // Normalizar números
            const sanitizeNumber = (n) => {
                if (typeof n !== 'number') return null;
                if (!isFinite(n)) return null;
                if (n === 0) return null;
                return n;
            };

            const crearComparable = (c, yieldMercado) => {
                // ✅ AGREGAR VALIDACIÓN INICIAL CRÍTICA
                if (!c || typeof c !== 'object') {
                    console.warn('Comparable raw es null o no es objeto:', c);
                    return null;
                }

                const area = sanitizeNumber(c.area_m2);
                let precioPublicado = sanitizeNumber(c.precio_publicado);
                let precioCop = sanitizeNumber(c.precio_cop);
                let precioM2 = sanitizeNumber(c.precio_m2);
                const yieldComparable = sanitizeNumber(c.yield_mensual);

                // Normalizar tipo de operación
                const tipoRaw = (c.tipo_origen || '').toString().toLowerCase();
                const esArriendo = tipoRaw.includes('arriendo');

                // ✅ CORRECCIÓN CRÍTICA: CONVERSIÓN ARRIENDO → VENTA
                if (esArriendo && precioPublicado && !precioCop) {
                    // Si es arriendo y tenemos canon pero no precioCop, convertir
                    const yieldToUse = yieldComparable || yieldMercado || 0.005; // Default 0.5%
                    if (yieldToUse > 0) {
                        precioCop = Math.round(precioPublicado / yieldToUse);
                        console.log(`💰 Conversión arriendo: ${precioPublicado} / ${yieldToUse} = ${precioCop}`);
                    }
                } else if (esArriendo && precioCop && precioPublicado && Math.abs(precioCop - precioPublicado) < 1000000) {
                    // Si precioCop es muy cercano al canon (error de extracción), convertir
                    const yieldToUse = yieldComparable || yieldMercado || 0.005;
                    if (yieldToUse > 0) {
                        precioCop = Math.round(precioPublicado / yieldToUse);
                        console.log(`🔄 Corrección: ${precioPublicado} → ${precioCop} (yield: ${yieldToUse})`);
                    }
                }

                // Si no tenemos precioCop pero sí precioPublicado (para ventas)
                if (!precioCop && precioPublicado && !esArriendo) {
                    precioCop = precioPublicado;
                }

                // Calcular precio por m² si falta
                if (!precioM2 && precioCop && area) {
                    precioM2 = Math.round(precioCop / area);
                }

                return {
                    titulo: c.titulo || 'Propiedad comparable',
                    tipo_origen: esArriendo ? 'arriendo' : 'venta',
                    fuente_zona: c.fuente_zona || null,
                    barrio: c.barrio || null,
                    municipio: c.municipio || null,
                    area_m2: area,
                    habitaciones: sanitizeNumber(c.habitaciones),
                    banos: sanitizeNumber(c.banos),
                    precio_publicado: precioPublicado,
                    precio_cop: precioCop,
                    precio_m2: precioM2,
                    yield_mensual: yieldComparable,
                };
            };

            // Función para calcular promedio de precio/m² de ventas (solo para estadísticas)
            const calcularPromedioM2Ventas = (comps) => {
                const ventas = comps.filter(c =>
                    c.tipo_origen === 'venta' && c.precio_m2 && c.precio_m2 > 0
                );

                if (ventas.length === 0) return null;

                const suma = ventas.reduce((total, c) => total + c.precio_m2, 0);
                return Math.round(suma / ventas.length);
            };

            // Normalizar nombre de portal
            const normalizarPortal = (p) => {
                if (!p || typeof p !== 'string') return null;
                const limpio = p.trim().toLowerCase();
                if (!limpio) return null;

                const dominio = limpio
                    .replace(/^(https?:\/\/)?(www\.)?/, '')
                    .split('/')[0]
                    .split('?')[0];

                return dominio || null;
            };

            // ==============================================
            // LÓGICA PRINCIPAL - SIN FILTROS
            // ==============================================

            // 1. Determinar yield a usar
            const yieldMercado = sanitizeNumber(extractedData.yield_mensual_mercado) || 0.005;

            // 2. Crear TODOS los comparables que DeepSeek extrajo
            const comparables = comparablesRaw
                .map(c => crearComparable(c, yieldMercado))
                .filter(c => c !== null); // Solo filtrar los nulos por error de creación

            console.log(`✅ Comparables extraídos: ${comparables.length}`);
            console.log(`📊 Distribución: ${comparables.filter(c => c.tipo_origen === 'venta').length} venta, ${comparables.filter(c => c.tipo_origen === 'arriendo').length} arriendo`);

            // 3. Calcular estadísticas de los comparables (solo para información)
            const promedioM2Ventas = calcularPromedioM2Ventas(comparables);
            if (promedioM2Ventas) {
                console.log(`📈 Promedio precio/m² ventas: ${promedioM2Ventas.toLocaleString()}`);

                // Calcular rango de precios para referencia
                const preciosM2Ventas = comparables
                    .filter(c => c.tipo_origen === 'venta' && c.precio_m2)
                    .map(c => c.precio_m2)
                    .sort((a, b) => a - b);

                if (preciosM2Ventas.length >= 2) {
                    const minPrecioM2 = preciosM2Ventas[0];
                    const maxPrecioM2 = preciosM2Ventas[preciosM2Ventas.length - 1];
                    console.log(`🎯 Rango precio/m²: ${minPrecioM2.toLocaleString()} - ${maxPrecioM2.toLocaleString()}`);
                }
            }

            // 4. Calcular totales (coherentes con comparables mostrados)
            const totalComparables = comparables.length;
            const totalVenta = comparables.filter((c) => c.tipo_origen === 'venta').length;
            const totalArriendo = comparables.filter((c) => c.tipo_origen === 'arriendo').length;

            // 5. Procesar portales consultados
            const portalesSet = new Set();
            if (Array.isArray(extractedData.portales_consultados)) {
                for (const p of extractedData.portales_consultados) {
                    const dom = normalizarPortal(p);
                    if (dom) portalesSet.add(dom);
                }
            }
            const portales_consultados = Array.from(portalesSet);

            // ==============================================
            // RESULTADO FINAL - SIN FILTROS
            // ==============================================

            // Precio m² usado: priorizar el que viene del análisis, luego el promedio calculado
            const precioM2UsadoDirecto = sanitizeNumber(extractedData.precio_m2_usado);
            const precioM2VentaDirecta = sanitizeNumber(extractedData.precio_m2_venta_directa);
            const precioM2Final = precioM2UsadoDirecto || precioM2VentaDirecta || promedioM2Ventas;

            // Yield del mercado
            const yieldDelAnalisis = sanitizeNumber(extractedData.yield_mensual_mercado);
            const yieldFinal = yieldDelAnalisis || yieldMercado;

            // --- CÁLCULOS DE RESPALDO (FALLBACKS) ---
            // Si DeepSeek no devolvió los valores calculados, los calculamos aquí.

            // 1. Fallback Venta Directa
            let valVentaDirecta = sanitizeNumber(extractedData.valor_estimado_venta_directa);
            if (!valVentaDirecta && precioM2Final && areaConstruida) {
                valVentaDirecta = Math.round(precioM2Final * areaConstruida);
                console.log(`🧮 Recalculando Valor Venta Directa: ${precioM2Final} * ${areaConstruida} = ${valVentaDirecta}`);
            }

            // 2. Fallback Rentabilidad
            let valRentabilidad = sanitizeNumber(extractedData.valor_estimado_rentabilidad);
            const canonPromedio = sanitizeNumber(extractedData.canon_arriendo_promedio);

            if (!valRentabilidad && canonPromedio && yieldFinal) {
                valRentabilidad = Math.round(canonPromedio / yieldFinal);
                console.log(`🧮 Recalculando Valor Rentabilidad: ${canonPromedio} / ${yieldFinal} = ${valRentabilidad}`);
            }

            // 3. Fallback Valor Final
            let valFinal = sanitizeNumber(extractedData.valor_final);
            if (!valFinal) {
                if (valVentaDirecta && valRentabilidad) {
                    valFinal = Math.round((valVentaDirecta + valRentabilidad) / 2);
                } else {
                    valFinal = valVentaDirecta || valRentabilidad;
                }
                console.log(`🧮 Recalculando Valor Final: ${valFinal}`);
            }

            const resultado = {
                resumen_busqueda:
                    extractedData.resumen_busqueda ||
                    'Análisis completado a partir de comparables de venta y arriendo en el mercado local.',

                valor_final: valFinal,

                // TOTALES que reflejan TODOS los comparables
                total_comparables: totalComparables,
                total_comparables_venta: totalVenta,
                total_comparables_arriendo: totalArriendo,
                portales_consultados,

                valor_estimado_venta_directa: valVentaDirecta,
                precio_m2_venta_directa: precioM2VentaDirecta,
                metodologia_venta_directa:
                    extractedData.metodologia_venta_directa || null,

                valor_estimado_rentabilidad: valRentabilidad,
                canon_arriendo_promedio: canonPromedio,
                metodologia_rentabilidad:
                    extractedData.metodologia_rentabilidad || null,
                yield_mensual_mercado: yieldFinal,

                rango_valor_min: sanitizeNumber(extractedData.rango_valor_min),
                rango_valor_max: sanitizeNumber(extractedData.rango_valor_max),

                precio_m2_usado: precioM2Final,
                metodo_calculo_m2: extractedData.metodo_calculo_m2 || null,
                precio_m2_regional: sanitizeNumber(extractedData.precio_m2_regional),

                ajustes_antiguedad: extractedData.ajustes_antiguedad || null,
                ajustes_parqueadero: extractedData.ajustes_parqueadero || null,
                limitaciones: extractedData.limitaciones || null,

                comparables,
                perplexity_full_text: perplexityContent,
            };

            console.log('✅ Resultado final generado:', {
                comparables: resultado.comparables.length,
                precio_m2_usado: resultado.precio_m2_usado,
                totales_coherentes: resultado.total_comparables === resultado.comparables.length
            });

            return new Response(
                JSON.stringify(resultado),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );

        } catch (llmError) {
            console.error('DeepSeek error:', llmError);
            return new Response(
                JSON.stringify({
                    error: 'Error al extraer datos estructurados',
                    details: llmError.message,
                    perplexity_full_text: perplexityContent,
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
    }
};
