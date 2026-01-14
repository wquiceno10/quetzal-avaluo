/**
 * avaluos-api-analysis V14 (You.com + OpenAI Migration)
 * - Búsqueda: You.com Agent
 * - Verificación: You Contents API (ydc-index.io)
 * - Análisis: OpenAI gpt-4o
 * - Extracción JSON: OpenAI gpt-4o-mini
 * - Base: V13 (Dynamic Area Filters, Confidence V2, IQR Filter)
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
    const maxLen = Math.max(len1, len2);
    return maxLen > 0 ? 1 - distance / maxLen : 1;
}

// --- HELPER: Clean LaTeX Commands from Text ---
function cleanLatexCommands(text) {
    if (!text) return '';

    let cleanedText = text
        // LaTeX spacing commands
        .replace(/\\quad/g, '   ')
        .replace(/\\qquad/g, '    ')
        .replace(/\\,/g, ' ')
        .replace(/\\:/g, ' ')
        .replace(/\\;/g, ' ')
        .replace(/\\!/g, '')
        .replace(/\\enspace/g, ' ')
        .replace(/\\hspace\{[^}]*\}/g, ' ')

        // LaTeX math symbols
        .replace(/\\times/g, ' × ')
        .replace(/\\cdot/g, ' · ')
        .replace(/\\approx/g, ' ≈ ')
        .replace(/\\text\{([^}]+)\}/g, '$1')
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');

    // Limpiar notación científica: 3.18 × 10^6 → 3.180.000
    cleanedText = cleanedText.replace(/(\d+(?:[.,]\d+)?)\s*[×x]\s*10\^(\d+)/gi, (match, coefficient, exponent) => {
        const num = parseFloat(coefficient.replace(',', '.'));
        const power = parseInt(exponent);
        const result = num * Math.pow(10, power);
        return Math.round(result).toLocaleString('es-CO');
    });

    return cleanedText.trim();
}

// --- HELPER: Mapear estado_inmueble con rangos de precio ---
function mapearEstadoConPrecio(estado) {
    const mapa = {
        'nuevo': 'Nuevo',
        'remodelado': 'Remodelado',
        'buen_estado': 'Buen Estado',
        'requiere_reformas_ligeras': 'Requiere Reformas Ligeras (≤ $5.000.000)',
        'requiere_reformas_moderadas': 'Requiere Reformas Moderadas ($5.000.000 - $15.000.000)',
        'requiere_reformas_amplias': 'Requiere Reformas Amplias ($15.000.000 - $25.000.000)',
        'requiere_reformas_superiores': 'Requiere Reformas Superiores (>$25.000.000)',
        'obra_gris': 'Obra Gris'
    };
    return mapa[estado] || (estado ? estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'No especificado');
}

// --- GLOBAL STATE: Jobs en memoria para polling ---
const jobs = new Map();

// --- HELPER: Construcción Dinámica de Prompt para Análisis ---
function construirPromptAnalisis(formData, area, ubicacion, agentContext = '') {
    // --- INFORMACIÓN DEL INMUEBLE ---
    const infoInmueble = `
- Tipo: ${formData.tipo_inmueble || 'inmueble'}
- Ubicación: ${ubicacion}
${formData.departamento ? `- Departamento: ${formData.departamento}` : ''}
${formData.contexto_zona ? `- Tipo de zona: ${formData.contexto_zona === 'conjunto_cerrado' ? 'Conjunto Cerrado' : 'Barrio Abierto'}` : ''}
${formData.nombre_conjunto ? `- Conjunto/Edificio: ${formData.nombre_conjunto}` : ''}
- Habitaciones: ${formData.habitaciones || 'N/A'}
- Baños: ${formData.banos || 'N/A'}
${formData.tipo_inmueble === 'apartamento' && formData.piso ? `- Piso: ${formData.piso}` : ''}
${formData.tipo_inmueble === 'apartamento' && formData.ascensor ? `- Ascensor: ${formData.ascensor === 'si' ? 'Sí' : 'No'}` : ''}
${formData.tipo_inmueble === 'casa' && formData.numeropisos ? `- Niveles de la casa: ${formData.numeropisos}` : ''}
- Parqueadero: ${formData.tipo_parqueadero || 'No indicado'}
- Antigüedad: ${formData.antiguedad || 'No indicada'}
${formData.estrato ? `- Estrato: ${formData.estrato}` : ''}
- Estado: ${mapearEstadoConPrecio(formData.estado_inmueble)}
${formData.tipo_remodelacion ? `- Remodelación: ${formData.tipo_remodelacion.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (${formData.valor_remodelacion || 'Valor no indicado'})` : ''}
${formData.descripcion_mejoras ? `- Mejoras: ${formData.descripcion_mejoras}` : ''}
${formData.informacion_complementaria ? `- NOTAS ADICIONALES: ${formData.informacion_complementaria}` : ''}
- ÁREA CONSTRUIDA: ${area || '?'} m²
    `.trim();

    // Rangos de área para filtros (Sincronizado con Nueva Estrategia del Agente)
    const rangoAreaMin = Math.round(area * 0.70);  // Estándar Agente: 70%
    const rangoAreaMax = Math.round(area * 1.30);  // Estándar Agente: 130%
    const rangoExtendidoMin = Math.round(area * 0.50); // Fallback Agente: 50%
    const rangoExtendidoMax = Math.round(area * 1.50); // Fallback Agente: 180%

    const agentInsights = `
═══════════════════════════════════════════════════════════
INFORMACIÓN DE MERCADO (DE AGENTE EXPERTO)
═══════════════════════════════════════════════════════════
El buscador experto ha recolectado y analizado la web para encontrar los siguientes comparables y datos de mercado. 
ANALIZA esta información tal cual se presenta (incluyendo tablas y resúmenes) para realizar tu avalúo:

${agentContext}
`;

    const seccionBase = `
Eres un analista inmobiliario especializado en avalúos técnicos del mercado colombiano.
Tu objetivo es elaborar un **análisis completo, claro y profesional**, usando lenguaje 
simple que un usuario sin conocimientos técnicos pueda comprender.

**ESTILO NARRATIVO: PEDAGÓGICO**
Explica paso a paso cómo se realiza un avalúo.
Ejemplo: "Para determinar el valor, primero comparamos con propiedades similares vendidas recientemente..."

═══════════════════════════════════════════════════════════
DATOS DEL INMUEBLE
═══════════════════════════════════════════════════════════
${infoInmueble}

${agentInsights}

═══════════════════════════════════════════════════════════
INSTRUCCIONES CRÍTICAS (NO VIOLABLES)
═══════════════════════════════════════════════════════════

**ETIQUETAS DE UBICACIÓN (ANÁLISIS DE PROXIMIDAD)**
Es TU RESPONSABILIDAD verificar y asignar o corregir la etiqueta de ubicación a cada comparable basándote en el Barrio y Ciudad proporcionados, comparándolos con la ubicación del inmueble objetivo:

✓ **coincidencia**: mismo barrio o sector inmediatamente adyacente (≤2 km)
→ **zona_similar**: barrios cercanos con características socioeconómicas similares o mismo municipio (2–5 km)
≈ **zona_extendida**: mismo municipio o departamento, pero con dinámica de mercado diferente (5–12 km)

Prioriza **coincidencia** para los cálculos principales.

**CONTEXTO Y AJUSTES (NOTAS DEL INMUEBLE)**
Utiliza MANDATORIAMENTE la información del campo **NOTAS / Información Complementaria**.
Si se mencionan remodelaciones, acabados, vistas, problemas o condiciones especiales, DEBEN reflejarse en el análisis y en los ajustes.

**FILTROS DE CALIDAD Y DESCARTES (OBLIGATORIO)**
- Rango preferencial de área: ${rangoAreaMin} m² – ${rangoAreaMax} m²
- Rango extendido aceptable: ${rangoExtendidoMin} m² – ${rangoExtendidoMax} m²
- Las propiedades fuera del rango extendido NO deben listarse.

═══════════════════════════════════════════════════════════
**FORMATO DE ENTREGA OBLIGATORIO**
═══════════════════════════════════════════════════════════

**1 PRESENTACIÓN DE COMPARABLES**
Describe brevemente la propiedad objetivo y luego presenta los comparables.

🔴 **REGLA CRÍTICA Y NO NEGOCIABLE – ELIMINACIÓN DE DUPLICADOS**
DEBES eliminar comparables duplicados. Se considera **EL MISMO INMUEBLE** cuando coinciden: **área, precio, número de habitaciones, número de baños, tipo de inmueble y conjunto/ubicación**.
**ESPECÍFICO PARA ARRIENDOS:** Si existen múltiples anuncios de arriendo con la misma área, mismo conjunto y misma condición económica, TRÁTALOS COMO UNO SOLO.
**DECLARACIÓN:** Debes mencionar explícitamente cuántos comparables (venta o arriendo) fueron eliminados por duplicación al inicio de tu análisis.

**LISTADO DE COMPARABLES (FORMATO OBLIGATORIO)**
- NUNCA incluyas comparables sin precio.
- Crea tu propia numeración secuencial (1, 2, 3…).
- CONVIERTE LA INFORMACIÓN DEL BUSCADOR (que viene en tabla) al formato de salida solicitado abajo.
- Asigna tú mismo la etiqueta de ubicación al final.
- No incluyas propiedades fuera del rango de área.
- Si hay menos de 5 comparables, realiza el avalúo igualmente y declara la limitación.

**FORMATO OBLIGATORIO POR COMPARABLE:**
**Título exacto del anuncio del portal**
Tipo | Venta o Arriendo | $Precio
Área: XX m² | X hab | X baños | X niveles
Barrio | Ciudad
**[Portal](URL cruda)** ETIQUETA (coincidencia / zona_similar / zona_extendida)
**Nota:** Distancia aproximada y justificación breve

**2. ANÁLISIS DEL VALOR**

   **SELECCIÓN DE COMPARABLES PARA CÁLCULO**
   - USA PROPIEDADES EN VENTA Y ARRIENDO.
   - Indica cuántos comparables listaste, cuántos usas para cálculo y cuáles descartas y por qué.
   - **MÍNIMO OBLIGATORIO:** ≥3 de venta, ≥3 de arriendo (si existen).

   **REGLAS CRÍTICAS DE CÁLCULO:**
   - **DISPERSIÓN (VENTAS):** Si el $/m² máximo supera en >40% al mínimo, excluye el atípico o justifica su inclusión en una línea. Si quedan <3 comparables tras excluir, usa todos y decláralo.
   - **ARRIENDOS:** Tras deduplicar, usa TODOS los arriendos válidos para el canon promedio. Si hay <3, declara "muestra limitada" y reduce su peso en el resultado final.
   - **MEDIANA:** La mediana debe reflejar el mercado dominante, no un cálculo ciego. Declara cuántos comparables usaste y si excluiste alguno.

   **2.1 MÉTODO DE VENTA DIRECTA**
   - Calcula el precio por m² de cada comparable de venta.
   - Ordena los valores y calcula la **MEDIANA**.
   - Presenta: "Mediana $/m²: $X.XXX.XXX/m²"
   - Valor mercado = mediana × ${area} m²
   - NO apliques ajustes aquí (los ajustes van en la Sección 3).

   **2.2 MÉTODO DE RENTABILIDAD**
   - Calcula el canon promedio con TODOS los arriendos válidos listados en Sección 1.
   - Investiga el Yield promedio para ${formData.municipio} estrato ${formData.estrato}. Si usas yield municipal como fallback, decláralo.
   - Calcula: **Valor rentabilidad = canon promedio ÷ yield**

**3. AJUSTES APLICADOS**
- Parte de los valores mercado base de la Sección 2.1.
- Explica cada ajuste aplicado (ubicación, estado, antigüedad, contexto) basándote en las NOTAS.
- NO apliques ajustes positivos si los comparables ya reflejan esa prima.
- Muestra siempre el porcentaje, el factor y el resultado en pesos.

**4. RESULTADOS FINALES**
- Decide pesos entre métodos según calidad de datos y muestra la fórmula completa.
- **REGLA DE PESO POR MUESTRA:** Si el método de rentabilidad se basa en menos de 3 arriendos (n < 3), debe considerarse como MÉTODO SECUNDARIO y tener un peso significativamente menor en el cálculo del valor final.
- Presenta: **Valor Recomendado, Rango sugerido, Precio por m² y Posición en mercado**.

**5. RESUMEN EJECUTIVO**
2-3 párrafos claros con valor, rango y estrategia.
INCLUYE: "Este reporte es una estimación de mercado de carácter orientativo y no tiene validez legal para fines hipotecarios, judiciales o transaccionales."

**6. LIMITACIONES**
Explica brevemente escasez de datos, rangos extendidos o dependencia de listados.

**7. TRANSPARENCIA DE DATOS**
Redacta un párrafo explicando por qué los datos son reales, por qué algunos enlaces son listados y por qué los resultados pueden variar. 
NO formules preguntas ni pidas información adicional.

**RECORDATORIOS FINALES (CRÍTICOS):**
- Este es un REPORTE FINAL, no una conversación.
- NO ofrezcas ampliaciones ni actualizaciones. NO solicites más datos.
- Entrega SOLO el análisis final.

`;

    return seccionBase;
}

export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

        const url = new URL(request.url);

        // --- GET: Polling de Estado ---
        if (request.method === 'GET') {
            const jobId = url.searchParams.get('jobId');
            if (!jobId) return new Response(JSON.stringify({ error: 'jobId requerido' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

            const job = jobs.get(jobId);
            if (!job) {
                console.warn(`[GET] Job no encontrado: ${jobId}`);
                return new Response(JSON.stringify({ error: 'Job no encontrado' }), {
                    status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify(job), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // --- POST: Iniciar Análisis ---
        if (request.method === 'POST') {
            let body;
            try {
                body = await request.json();
            } catch (e) {
                return new Response(JSON.stringify({ error: 'JSON inválido' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const jobId = crypto.randomUUID();
            jobs.set(jobId, { status: 'processing', progress: 10 });

            // Iniciar proceso pesado en background
            ctx.waitUntil(this.procesarAnalisis(jobId, body, env, request.signal));

            return new Response(JSON.stringify({ jobId }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    },

    async procesarAnalisis(jobId, body, env, signal) {
        const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
        try {
            const { formData } = body;
            if (!formData) throw new Error('formData es requerido');

            const YOU_API_KEY = env.YOU_API_KEY ? env.YOU_API_KEY.trim() : null;
            const OPENAI_API_KEY = env.OPENAI_API_KEY ? env.OPENAI_API_KEY.trim() : null;

            if (!YOU_API_KEY || !OPENAI_API_KEY) {
                jobs.set(jobId, { status: 'failed', error: 'API keys no configuradas (YOU_API_KEY, OPENAI_API_KEY)' });
                return;
            }

            // --- PERFORMANCE TRACKING ---
            const perfStart = Date.now();
            let t_search_start = Date.now(), t_search_end = Date.now();
            let t_openai_start = Date.now(), t_openai_end = Date.now();
            let t_extraction_start = Date.now(), t_extraction_end = Date.now();
            let t_processing_start = Date.now(), t_processing_end = Date.now();
            console.log('⏱️ [PERF] Inicio análisis:', new Date().toISOString());

            // Usamos el signal que viene como parámetro

            // --- 1. PREPARACIÓN DE DATOS ---
            const tipoInmueble = (formData.tipo_inmueble || 'inmueble').toLowerCase();
            const ubicacion = `${formData.barrio || ''}, ${formData.municipio || ''}`.trim();
            const area = parseInt(formData.area_construida) || 0;

            console.log('--- INICIO ANÁLISIS ---');
            console.log('Propiedad:', tipoInmueble, 'en', ubicacion);
            const agentInput = [
                `Tipo: ${tipoInmueble}`,
                formData.area_construida ? `Área: ${formData.area_construida} m2` : '',
                formData.barrio ? `Barrio: ${formData.barrio}` : '',
                formData.nombre_conjunto ? `Conjunto: ${formData.nombre_conjunto} (conjunto cerrado)` : (formData.contexto_zona === 'conjunto_cerrado' ? 'Contexto: Conjunto Cerrado' : ''),
                formData.municipio ? `Municipio: ${formData.municipio}` : '',
                formData.departamento ? `Departamento: ${formData.departamento}` : '',
                formData.estrato ? `Estrato: ${formData.estrato}` : ''
            ].filter(Boolean).join(', ');

            console.log('Buscando en You.com:', agentInput);

            let responseText = '';
            t_search_start = Date.now();
            try {
                // Restauramos los headers que sabemos que funcionan para evitar bloqueos del servidor
                const agentResponse = await fetch('https://api.you.com/v1/agents/runs', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${YOU_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Accept': '*/*',
                        'User-Agent': 'curl/8.0.0'
                    },
                    body: JSON.stringify({
                        agent: '6e5e2bdf-384b-4c75-aff8-4dc54bc4bf0d',
                        input: agentInput,
                        stream: false
                    })
                    // ❌ REMOVED: signal -> Para evitar que el proceso de fondo se aborte si el cliente desconecta el POST
                });

                console.log('Status Agente:', agentResponse.status);

                if (agentResponse.ok) {
                    const agentData = await agentResponse.json();

                    responseText = "";
                    if (agentData.output && Array.isArray(agentData.output)) {
                        for (const item of agentData.output) {
                            if (item.type === 'message.answer' && item.text) responseText += item.text + "\n";
                        }
                    }

                    if (!responseText) responseText = agentData.response || agentData.content || '';

                    console.log('--- RESPUESTA AGENTE ---');
                    console.log(responseText);
                    console.log('--- FIN RESPUESTA AGENTE ---');

                    console.log('Respuesta Agente recibida');
                } else {
                    const errorText = await agentResponse.text();
                    console.error('Error Agente:', agentResponse.status, errorText);
                    jobs.set(jobId, { status: 'failed', error: `Error Agente You.com (${agentResponse.status})`, details: errorText });
                    return; // ❌ ABORTAR flujo si el Agente falla
                }
                t_search_end = Date.now();
            } catch (err) {
                t_search_end = Date.now();
                console.error('Error conexión Agente:', err.message);
                jobs.set(jobId, { status: 'failed', error: 'Error de conexión con el Agente', details: err.message });
                return;
            }

            // --- 2. ANALISTA AI (CONEXIÓN DIRECTA) ---
            const promptFinal = construirPromptAnalisis(formData, area, ubicacion, responseText);
            console.log('Iniciando Análisis GPT-4o...');
            let perplexityContent = '';
            let citations = [];

            t_openai_start = Date.now();
            console.log('⏱️ [PERF] Iniciando llamada OpenAI gpt-4o...');

            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            { role: 'system', content: 'Eres un analista inmobiliario preciso y profesional.' },
                            { role: 'user', content: promptFinal },
                        ],
                        temperature: 0.1,
                        max_tokens: 8000,
                    })
                    // ❌ REMOVED: signal
                });

                if (!response.ok) {
                    const errText = await response.text();
                    jobs.set(jobId, { status: 'failed', error: `Error OpenAI gpt-4o (${response.status})`, details: errText });
                    return;
                }

                const data = await response.json();
                const rawContent = data.choices?.[0]?.message?.content || '';

                perplexityContent = cleanLatexCommands(rawContent);
                perplexityContent = perplexityContent.replace(/\[\d+\]/g, '');

                // --- REPARACIÓN DE URLS Y BADGES EN TEXTO CRUDO ---
                const urlsGenericas = [
                    /fincaraiz\.com(?:\.co)?\/?$/i,
                    /metrocuadrado\.com\/?$/i,
                    /ciencuadras\.com\/?$/i,
                    /mercadolibre\.com(?:\.co)?\/?$/i,
                    /properati\.com(?:\.co)?\/?$/i,
                    /mitula\.com(?:\.co)?\/?$/i,
                    /\/casas\/?$/i,
                    /\/lotes\/?$/i,
                    /\/apartamentos\/?$/i,
                    /\/venta\/?$/i,
                    /\/arriendo\/?$/i,
                ];

                perplexityContent = perplexityContent.replace(/(\*\*)?\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)(\*\*)?\s*(verificado|coincidencia|zona_similar|zona_extendida)?/gi, (match, b1, portal, url, b2, tag) => {
                    try {
                        const urlObj = new URL(url);
                        const hasParams = urlObj.search.length > 1;
                        const isGenericPath = urlsGenericas.some(regex => regex.test(urlObj.origin + urlObj.pathname));

                        let hideLink = false;
                        let removeVerificado = false;

                        if (isGenericPath && !hasParams) {
                            hideLink = true;
                            removeVerificado = true;
                        } else if (isGenericPath && hasParams) {
                            hideLink = false;
                            removeVerificado = true;
                        } else if (urlObj.pathname.length < 5 && !hasParams) {
                            hideLink = true;
                            removeVerificado = true;
                        }

                        const linkMarkup = hideLink ? portal : `[${portal}](${url})`;
                        let tagFinal = tag || '';
                        if (removeVerificado && tagFinal.toLowerCase() === 'verificado') {
                            tagFinal = '';
                        }

                        return `**${linkMarkup}**${tagFinal ? ' ' + tagFinal : ''}`;
                    } catch {
                        return `**${portal}**${tag ? ' ' + tag : ''}`;
                    }
                });

                citations = data.citations || [];

                t_openai_end = Date.now();
                console.log(`⏱️ [PERF] Perplexity completado en ${((t_openai_end - t_openai_start) / 1000).toFixed(2)}s | Fuentes: ${citations.length}`);
                console.log(`📄 [PERPLEXITY] Respuesta completa:\n${perplexityContent}`);

            } catch (e) {
                jobs.set(jobId, { status: 'failed', error: 'Error conexión Perplexity/OpenAI', details: e.message });
                return;
            }

            // --- 3. EXTRACCIÓN ESTRUCTURADA CON GPT-4O-MINI ---
            let extractedData = {};

            const extractionPrompt = `
Del siguiente texto (que contiene listados y análisis), extrae un JSON estructurado.

TEXTO:
${perplexityContent}

INSTRUCCIONES DE EXTRACCIÓN:
1. "comparables": Extrae CADA INMUEBLE del listado (formato multi-línea, NO tabla).
   Cada comparable sigue este patrón:
   
   **Título**
   Tipo | Venta/Arriendo | $Precio
   Área: XX m² | X hab | X baños | X Niveles (o X Piso para apartamentos)
   Barrio | Ciudad
   **[Portal](URL)** etiqueta
   **Nota:** Distancia: X km. [Justificación]
   
   EJEMPLO Apartamento/Casa:
   **Apartamento Moderno**
   Apartamento | Venta | $450.000.000
   Área: 95 m² | 3 hab | 2 baños | Piso 5
   Las Acacias | Bogotá
   **[Fincaraíz](url cruda de la ficha o del listado donde aparece el anuncio)** coincidencia
   **Nota:** Distancia: 0.5 km. Mismo barrio del inmueble objeto.
   
   Extrae:
   - "titulo": Texto entre ** ** de la primera línea (sin etiquetas HTML)
   - "tipo_inmueble": Texto antes del | en la segunda línea (sin etiquetas HTML)
   - "tipo_operacion": Texto después del | en la segunda línea ("Venta" o "Arriendo")
   - "precio_lista": Número ENTERO (sin puntos, sin comas, sin $) extraído de la tercera línea.
   - "area": Número (puede tener decimales) antes de "m²" en la tercera línea.
   - "habitaciones": Número antes de "hab" en la tercera línea
   - "banos": Número antes de "baños" en la tercera línea
   - "niveles_piso": Número antes de "Niveles" o "Piso" en la tercera línea (si existe). Para apartamentos es "Piso X", para casas es "X Niveles".
   - "barrio": Texto antes del | en la cuarta línea (sin etiquetas HTML)
   - "ciudad": Texto después del | en la cuarta línea (sin etiquetas HTML)
   - "fuente": Texto entre **[ ]** (nombre del portal). Si está en formato Markdown [Nombre](URL), extrae solo "Nombre".
   - "url_fuente": Si la fuente tiene formato Markdown [Nombre](URL), extrae la URL completa. Si no, busca si hay un enlace https:// cerca.
   - "fuente_validacion": Palabra suelta después del portal (uno de: coincidencia, zona_similar, zona_extendida)
   - "nota_adicional": Si existe una línea que empieza con "**Nota:**" o "Nota:", extrae el texto completo incluyendo la distancia en km (opcional)
   - "distancia_km": Si la nota menciona "Distancia: X km", extrae SOLO el número como decimal (ej: 2.5)

   IMPORTANTE: 
   - Elimina cualquier etiqueta HTML (como <br>) de los valores extraídos.
   - Si NO encuentras "fuente_validacion", asume "zona_extendida" por defecto.

2. "resumen_mercado": Extrae un resumen conciso (máximo 2 párrafos) de la sección "RESUMEN EJECUTIVO". Prioriza la valoración y la rentabilidad.

3. "yield_zona": Busca la frase exacta "Yield promedio mercado: X.XX%" en el texto. Extrae SOLO el número como decimal (ej: si dice "0.5%", devuelve 0.005).

4. "valor_venta_directa": Busca "**Valor total = $XXX.XXX.XXX**".
   Extrae el número ENTERO (elimina puntos y $).

5. "rango_sugerido_min": Busca "Rango sugerido: $XXX.XXX.XXX -" o similar. Extrae el primer número (ENTERO).

6. "rango_sugerido_max": Extrae el segundo número del rango sugerido (ENTERO).

7. "precio_m2_ajustado": Busca "Precio por m² final: $XXX.XXX.XXX" o "Precio/m² ajustado: $XXX.XXX.XXX".
    Extrae SOLO el número (entero, sin puntos). Si no encuentra, devuelve null.

8. "factor_ajuste_total": Busca "Factor total: X.XX" o "Factor: X.XX".
    - Si dice "+17%" → devuelve 1.17
    - Si dice "-5%" → devuelve 0.95
    - Extrae el número decimal directamente si está en formato X.XX
    - Si no encuentra, devuelve 1.0 (sin ajustes)

9. "valor_rentabilidad_ajustado": Busca "Valor rentabilidad = $XXX.XXX.XXX".
    Extrae el número ENTERO (elimina puntos, comas, $). Si no encuentra, devuelve null.

10. "valor_recomendado_venta": Busca "Valor Recomendado de Venta: $XXX.XXX.XXX".
    Extrae el número ENTERO.

11. "canon_mensual_estimado": Busca "Canon mensual estimado: $XXX.XXX.XXX".

Devuelve SOLO JSON válido.
        `.trim();

            t_extraction_start = Date.now();
            console.log('⏱️ [PERF] Iniciando extracción OpenAI gpt-4o-mini...');

            try {
                const dsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: 'Eres un extractor JSON experto. Extrae numeros LIMPIOS (ej: 4200000, no 4.200.000).' },
                            { role: 'user', content: extractionPrompt },
                        ],
                        temperature: 0.0,
                    })
                    // ❌ REMOVED: signal
                });

                if (!dsResponse.ok) {
                    const errDs = await dsResponse.text();
                    jobs.set(jobId, { status: 'failed', error: `Error OpenAI gpt-4o-mini (${dsResponse.status})`, details: errDs });
                    return;
                }

                const dsData = await dsResponse.json();
                let content = dsData.choices?.[0]?.message?.content || '{}';

                content = content.trim();
                if (content.startsWith('```')) {
                    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
                    if (match && match[1]) content = match[1].trim();
                }

                extractedData = JSON.parse(content);
                if (!extractedData || typeof extractedData !== 'object') extractedData = {};

                t_extraction_end = Date.now();
                console.log(`⏱️ [PERF] OpenAI gpt-4o-mini completado en ${((t_extraction_end - t_extraction_start) / 1000).toFixed(2)}s`);

            } catch (e) {
                jobs.set(jobId, { status: 'failed', error: 'Error Parseo OpenAI gpt-4o-mini', details: e.message });
                return;
            }

            // --- 4. PROCESAMIENTO Y LÓGICA DE NEGOCIO ---
            try {
                const sanitizePrice = (n) => {
                    if (typeof n === 'number') return Number.isFinite(n) ? n : null;
                    if (typeof n === 'string') {
                        const clean = n.replace(/[.,]/g, '').replace(/\D/g, '');
                        const val = parseInt(clean, 10);
                        return (Number.isFinite(val) && val > 0) ? val : null;
                    }
                    return null;
                };

                const sanitizeFloat = (n) => {
                    if (typeof n === 'number') return Number.isFinite(n) ? n : null;
                    if (typeof n === 'string') {
                        const puntos = (n.match(/\./g) || []).length;
                        let clean;
                        if (puntos > 1) {
                            clean = n.replace(/[.,]/g, '');
                        } else if (puntos === 1) {
                            const parts = n.split('.');
                            if (parts[1] && parts[1].length === 3) {
                                clean = n.replace(/\./g, '');
                            } else {
                                clean = n.replace(',', '.');
                            }
                        } else {
                            clean = n.replace(/[^\d]/g, '');
                        }
                        clean = clean.replace(/[^\d.]/g, '');
                        const val = parseFloat(clean);
                        return Number.isFinite(val) ? val : null;
                    }
                    return null;
                };

                const yieldDefault = 0.005;
                const yieldExtracted = sanitizeFloat(extractedData.yield_zona);
                const yieldFinal = yieldExtracted || yieldDefault;
                console.log(`Yield usado: ${(yieldFinal * 100).toFixed(2)}% mensual (${yieldExtracted ? 'extraído de mercado' : 'fallback'})`);
                const yieldFuente = yieldExtracted ? 'mercado' : 'fallback';

                const portalesUnicos = new Set(
                    citations.map((url) => {
                        try {
                            return new URL(url).hostname.replace('www.', '').replace('.com.co', '').replace('.com', '');
                        } catch { return null; }
                    }).filter(Boolean)
                );
                const portalesList = Array.from(portalesUnicos);
                if (portalesList.length === 0) portalesList.push('fincaraiz', 'metrocuadrado');

                t_processing_start = Date.now();
                console.log('⏱️ [PERF] Iniciando procesamiento comparables...');

                const comparablesRaw = Array.isArray(extractedData.comparables) ? extractedData.comparables : [];

                // FILTRO DE ÁREA ELIMINADO
                // NOTA: Se eliminó el filtro de área para mostrar TODOS los comparables que Perplexity analizó.
                // Esto evita inconsistencias entre el texto del análisis y la tabla de comparables mostrada al usuario.
                // Perplexity ya aplica sus propios criterios de selección según el prompt (rangos de área, antigüedad, etc.)
                const finalComparablesRaw = comparablesRaw.filter((c) => {
                    const areaComp = sanitizeFloat(c.area);
                    // Solo validar que el área exista y sea válida (no null/undefined/0)
                    return areaComp && areaComp > 0;
                });

                console.log(`✓ Procesando ${finalComparablesRaw.length} comparables analizados por Analista AI (sin filtro de área)`);

                // Procesamiento de cada comparable
                const comparables = finalComparablesRaw
                    .map((c) => {
                        const areaComp = sanitizeFloat(c.area);
                        const precioLista = sanitizePrice(c.precio_lista);
                        const esArriendo = c.tipo_operacion && typeof c.tipo_operacion === 'string' && c.tipo_operacion.toLowerCase().includes('arriendo');

                        let precioVentaEstimado = 0;
                        let precioM2 = 0;

                        if (esArriendo) {
                            if (precioLista && yieldFinal > 0) {
                                precioVentaEstimado = Math.round(precioLista / yieldFinal);
                            }
                            if (precioVentaEstimado && areaComp) {
                                precioM2 = Math.round(precioVentaEstimado / areaComp);
                            }
                        } else {
                            precioVentaEstimado = precioLista || 0;
                            if (precioVentaEstimado && areaComp) {
                                precioM2 = Math.round(precioVentaEstimado / areaComp);
                            }
                        }

                        // Construir array de badges (verificado + ubicación)
                        const badges = [];

                        // Badge 1: Verificar URL (si existe y es válida)
                        const tieneURL = c.url_fuente && typeof c.url_fuente === 'string' && c.url_fuente.startsWith('http');

                        let urlValida = false;
                        let esVerificado = false;

                        if (tieneURL) {
                            // URLs genéricas/rotas
                            const urlsGenericas = [
                                /fincaraiz\.com(?:\.co)?\/?$/i,
                                /metrocuadrado\.com\/?$/i,
                                /ciencuadras\.com\/?$/i,
                                /mercadolibre\.com(?:\.co)?\/?$/i,
                                /properati\.com(?:\.co)?\/?$/i,
                                /mitula\.com(?:\.co)?\/?$/i,
                                /\/casas\/?$/i,
                                /\/lotes\/?$/i,
                                /\/apartamentos\/?$/i,
                                /\/venta\/?$/i,
                                /\/arriendo\/?$/i,
                            ];

                            const urlObj = new URL(c.url_fuente);
                            const hasParams = urlObj.search.length > 1; // ?X...
                            const isGenericPath = urlsGenericas.some(regex => regex.test(urlObj.origin + urlObj.pathname));

                            if (isGenericPath && !hasParams) {
                                // Home o sección sin filtros -> Inútil
                                urlValida = false;
                                esVerificado = false;
                            } else if (isGenericPath && hasParams) {
                                // Listado con filtros -> Aceptable pero no verificado
                                urlValida = true;
                                esVerificado = false;
                            } else if (urlObj.pathname.length < 5 && !hasParams) {
                                // Path muy corto (home) -> Inútil
                                urlValida = false;
                                esVerificado = false;
                            } else {
                                // URL profunda/específica -> Verificado
                                urlValida = true;
                                esVerificado = true;
                            }

                            if (esVerificado) {
                                badges.push('verificado');
                            }

                            if (!urlValida) {
                                console.log(`⚠️ URL inútil detectada: ${c.url_fuente}`);
                            }
                        }

                        // Badge 2: Etiqueta de ubicación (OBLIGATORIA si es válida)
                        const ubicacionBadge = c.fuente_validacion || null;

                        if (ubicacionBadge && ['coincidencia', 'zona_similar', 'zona_extendida'].includes(ubicacionBadge)) {
                            // Si Perplexity envió etiqueta válida de ubicación
                            badges.push(ubicacionBadge);
                        } else {
                            // Fallback: zona_extendida si no hay etiqueta de ubicación
                            badges.push('zona_extendida');
                        }

                        // Nota: 'verificado' ya se agregó arriba si urlValida === true

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
                            fuente: c.fuente || null,
                            fuente_validacion: badges, // ✅ AHORA ES ARRAY
                            nota_adicional: c.nota_adicional || null,
                            url_fuente: urlValida ? (c.url_fuente || null) : null
                        };

                        return comparable;
                    })
                    .filter((c) => c && c.precio_cop > 0 && c.area_m2 > 0);

                if (comparables.length < 5) {
                    jobs.set(jobId, {
                        status: 'failed',
                        error: 'Datos insuficientes',
                        details: `Solo se encontraron ${comparables.length} comparables válidos.`,
                        perplexity_full_text: perplexityContent
                    });
                    return;
                }

                const compsVenta = comparables.filter((c) => c.tipo_origen === 'venta');
                const compsArriendo = comparables.filter((c) => c.tipo_origen === 'arriendo');

                // PASO A: Calcular valor SIMPLE del Worker
                let precioM2PromedioSimple = 0;
                let valorVentaDirectaSimple = null;

                if (compsVenta.length > 0) {
                    const sortedByM2 = [...compsVenta].sort((a, b) => a.precio_m2 - b.precio_m2);
                    let filteredComps = sortedByM2;
                    if (sortedByM2.length >= 5) {
                        const cut = Math.floor(sortedByM2.length * 0.1);
                        filteredComps = sortedByM2.slice(cut, sortedByM2.length - cut);
                    }
                    const sumM2 = filteredComps.reduce((acc, c) => acc + c.precio_m2, 0);
                    precioM2PromedioSimple = Math.round(sumM2 / filteredComps.length);
                    valorVentaDirectaSimple = Math.round(precioM2PromedioSimple * area);
                }

                // PASO B: Extraer valor de Perplexity
                const valorVentaDirectaPerplexity = sanitizePrice(extractedData.valor_venta_directa);
                const factorAjusteTotal = sanitizeFloat(extractedData.factor_ajuste_total) || 1.0;
                const precioM2AjustadoExtraido = sanitizeFloat(extractedData.precio_m2_ajustado);
                const ajustesDetallados = Array.isArray(extractedData.ajustes_detallados) ? extractedData.ajustes_detallados : [];

                // PASO C: Validar Perplexity vs Simple (SSOT: Prioridad a Perplexity si existe)


                let valorVentaDirecta;
                let valorMercadoFuente;
                let precioM2Mercado;

                // Lógica "Trust Perplexity": Si la IA da un valor, lo usamos (especialmente si hay ajuste).
                // Solo usamos fallback si la IA no dio nada o el valor es absurdo (<= 0).
                if (valorVentaDirectaPerplexity && valorVentaDirectaPerplexity > 0) {
                    valorVentaDirecta = valorVentaDirectaPerplexity;
                    valorMercadoFuente = 'perplexity';
                    precioM2Mercado = Math.round(valorVentaDirectaPerplexity / area);
                    console.log(`✓ Usando Valor Perplexity: ${valorVentaDirecta.toLocaleString()} (Factor: ${factorAjusteTotal})`);
                } else {
                    valorVentaDirecta = valorVentaDirectaSimple;
                    valorMercadoFuente = 'calculado_fallback';
                    precioM2Mercado = precioM2PromedioSimple;
                    console.log(`⚠️ Usando Valor Fallback (Simple): ${valorVentaDirecta?.toLocaleString()}`);
                }

                // PASO E: Rentabilidad
                let valorRentabilidad = null;
                let canonPromedio = 0;
                let valorRentabilidadFallback = null;
                const valorRentabilidadPerplexity = sanitizePrice(extractedData.valor_rentabilidad_ajustado);

                // Calcular fallback del worker primero (para validación o uso si falta IA)
                if (compsArriendo.length > 0) {
                    const canonPorM2Array = compsArriendo
                        .filter(c => c.precio_publicado > 0 && c.area_m2 > 0)
                        .map(c => c.precio_publicado / c.area_m2);

                    if (canonPorM2Array.length > 0) {
                        const canonPorM2Promedio = canonPorM2Array.reduce((acc, val) => acc + val, 0) / canonPorM2Array.length;
                        canonPromedio = Math.round(canonPorM2Promedio * area);
                        valorRentabilidadFallback = Math.round(canonPromedio / yieldFinal);
                    } else {
                        const sumCanon = compsArriendo.reduce((acc, c) => acc + c.precio_publicado, 0);
                        canonPromedio = Math.round(sumCanon / compsArriendo.length);
                        valorRentabilidadFallback = Math.round(canonPromedio / yieldFinal);
                    }
                }

                // Lógica "Trust Perplexity" para Rentabilidad
                if (valorRentabilidadPerplexity && valorRentabilidadPerplexity > 0) {
                    valorRentabilidad = valorRentabilidadPerplexity;
                    console.log(`✓ Rentabilidad (Perplexity): ${valorRentabilidad.toLocaleString()}`);
                } else if (valorRentabilidadFallback) {
                    valorRentabilidad = valorRentabilidadFallback;
                    console.log(`⚠️ Rentabilidad (Fallback): ${valorRentabilidad.toLocaleString()}`);
                } else if (valorVentaDirecta) {
                    valorRentabilidad = valorVentaDirecta; // Fallback extremo
                    canonPromedio = Math.round(valorVentaDirecta * yieldFinal);
                }

                // PASO F: Valor Final (CÁLCULO SSOT EN WORKER)
                // Aquí imponemos la matemática estricta sobre los componentes confiables
                let valorCalculadoWorker = 0;
                // PRIMERO intentar usar el Valor Recomendado de Perplexity
                const valorRecomendadoPerplexity = sanitizePrice(extractedData.valor_recomendado_venta);
                if (valorRecomendadoPerplexity && valorRecomendadoPerplexity > 0) {
                    valorCalculadoWorker = valorRecomendadoPerplexity;
                    console.log(`✓ Usando Valor Recomendado Perplexity para propiedad: ${valorCalculadoWorker.toLocaleString()}`);
                } else {
                    // Fallback al cálculo Worker si Perplexity no dio valor recomendado
                    if (valorVentaDirecta && valorRentabilidad) {
                        valorCalculadoWorker = Math.round(valorVentaDirecta * 0.6 + valorRentabilidad * 0.4);
                        console.log('⚠️ Fallback: Cálculo Ponderado Worker 60/40 (Perplexity no envió valor recomendado)');
                    } else {
                        valorCalculadoWorker = valorVentaDirecta || valorRentabilidad || 0;
                        console.log('⚠️ Fallback: Usando solo un componente disponible');
                    }
                }

                // Forzamos que este sea el valor final
                const valorFinal = valorCalculadoWorker;
                const valorPonderado = valorCalculadoWorker; // Valor ponderado para referencia
                const valorFuente = 'worker_ssot_calculated';
                console.log(`Valor final (SSOT): ${valorFinal.toLocaleString()}`);

                // Precio m² de mercado (ajustado por comparables)
                const precioM2MercadoSeguro =
                    Number.isFinite(precioM2Mercado) && precioM2Mercado > 0
                        ? precioM2Mercado
                        : null;

                // Precio m² implícito del valor final
                const precioM2Implicito =
                    valorFinal > 0 && area > 0
                        ? Math.round(valorFinal / area)
                        : null;

                const rangoMin = sanitizePrice(extractedData.rango_sugerido_min) || Math.round(valorFinal * 1.00);
                const rangoMax = sanitizePrice(extractedData.rango_sugerido_max) || Math.round(valorFinal * 1.04);
                const rangoFuente = extractedData.rango_sugerido_min ? 'perplexity' : 'calculado';

                // --- 5. DEDUPLICACIÓN ELIMINADA ---
                // NOTA: Se eliminó la deduplicación para mostrar TODOS los comparables que Perplexity analizó
                // Esto evita inconsistencias entre el texto del análisis y la tabla de comparables

                // Usar TODOS los comparables procesados (sin filtros adicionales de deduplicación o área)
                // Esto asegura que la tabla muestre exactamente lo que Perplexity analizó y mencionó en el texto
                let comparablesParaTabla = comparables;

                // FILTRO DE ÁREA ELIMINADO
                // NOTA: Se eliminó el filtro de área para lotes grandes
                // Ahora se muestran TODOS los comparables que Perplexity analizó
                /*
                if (esLote && area > 1000) {
                    const filtradosEstrictos = uniqueComparables.filter(c => {
                        const a = c.area_m2 || 0;
                        return a >= area * 0.5 && a <= area * 1.5;
                    });
             
                    if (filtradosEstrictos.length >= 5) {
                        comparablesParaTabla = filtradosEstrictos;
                    } else {
                        const filtradosRelajados = uniqueComparables.filter(c => {
                            const a = c.area_m2 || 0;
                            return a >= area * 0.3 && a <= area * 1.7;
                        });
                        comparablesParaTabla = filtradosRelajados.length >= 3 ? filtradosRelajados : uniqueComparables;
                    }
                }
                */

                // FILTRO IQR ELIMINADO
                // NOTA: Se eliminó el filtro IQR (outliers) para mostrar TODOS los comparables
                // Perplexity ya hace su propia selección y filtrado de comparables
                /*
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
             
                        const filtradosIQR = comparablesParaTabla.filter(c => c.precio_m2 >= minThreshold && c.precio_m2 <= maxThreshold);
             
                        if (filtradosIQR.length >= 5) {
                            console.log(`Filtro IQR aplicado.`);
                            comparablesParaTabla = filtradosIQR;
                        }
                    }
                }
                */

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

                const totalReal = comparablesParaTabla.length;
                const totalVenta = comparablesParaTabla.filter(c => c.tipo_origen === 'venta').length;
                const totalArriendo = comparablesParaTabla.filter(c => c.tipo_origen === 'arriendo').length;

                let finalPerplexityText = perplexityContent || '';
                finalPerplexityText = finalPerplexityText.replace(/(presentan|listado de|encontraron|selección de)\s+(\d+)\s+(comparables|inmuebles|propiedades)/gi, `$1 ${totalReal} $3`);
                finalPerplexityText = finalPerplexityText.replace(/total_comparables:\s*\d+/gi, '');
                finalPerplexityText = cleanLatexCommands(finalPerplexityText);

                let resumenFinal = extractedData.resumen_mercado || 'Análisis de mercado realizado.';
                resumenFinal = resumenFinal.replace(/(presentan|listado de|encontraron|selección de)\s+(\d+)\s+(comparables|inmuebles|propiedades)/gi, `$1 ${totalReal} $3`);

                // Protección: Si no hay comparables
                if (!comparablesParaTabla || comparablesParaTabla.length === 0) {
                    const nivelConfianzaDetalle = {
                        fuente: 'calculado',
                        nivel_llm: extractedData.nivel_confianza || null,
                        total_comparables: 0,
                        porcentaje_reales: 0,
                        total_zonas_alternativas: 0,
                        dispersion_alta: false
                    };

                    const resultado = {
                        resumen_busqueda: resumenFinal,
                        valor_final: valorFinal,
                        valor_fuente: valorFuente,
                        valor_ponderado_referencia: valorPonderado,
                        rango_valor_min: rangoMin,
                        rango_valor_max: rangoMax,
                        rango_fuente: rangoFuente,
                        //valor_estimado_venta_directa: valorVentaDirecta,
                        valor_estimado_rentabilidad: valorRentabilidad,
                        precio_m2_implicito: precioM2Implicito,
                        metodo_mercado_label: 'Enfoque de Mercado (promedio real)',
                        metodo_ajuste_label: 'Promedio de Mercado',
                        comparables: [],
                        total_comparables: 0,
                        total_comparables_venta: 0,
                        total_comparables_arriendo: 0,
                        nivel_confianza: 'Bajo',
                        nivel_confianza_detalle: nivelConfianzaDetalle,
                        estadisticas_fuentes: {
                            total_coincidencia: 0,
                            total_verificado: 0,
                            total_zona_similar: 0,
                            total_zona_extendida: 0,
                        },
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

                    jobs.set(jobId, { status: 'completed', result: resultado });
                    return;
                }

                // CÁLCULO DE NIVEL DE CONFIANZA V2
                const total = comparablesParaTabla.length;

                // Adaptar a arrays de badges
                const totalVerificados = comparablesParaTabla.filter(c => {
                    const badges = Array.isArray(c.fuente_validacion) ? c.fuente_validacion : [c.fuente_validacion];
                    return badges.includes('coincidencia');
                }).length;

                const totalZonasSimilares = comparablesParaTabla.filter(c => {
                    const badges = Array.isArray(c.fuente_validacion) ? c.fuente_validacion : [c.fuente_validacion];
                    return badges.includes('zona_similar');
                }).length;

                const totalEstimaciones = comparablesParaTabla.filter(c => {
                    const badges = Array.isArray(c.fuente_validacion) ? c.fuente_validacion : [c.fuente_validacion];
                    return badges.includes('zona_extendida');
                }).length;
                // totalPromedioMunicipal deprecated

                const totalZonasAlternas = totalZonasSimilares; // Simplificado

                console.log(`Clasificación: ${totalVerificados} verificados, ${totalZonasSimilares} zonas similares, ${totalEstimaciones} estimaciones`);

                // Sistema de puntos ponderados
                let puntosConfianza = 0;
                puntosConfianza += totalVerificados * 3; // coincidencia
                puntosConfianza += totalZonasSimilares * 2; // zona_similar + verificado
                puntosConfianza += totalEstimaciones * 1; // zona_extendida

                const promedioCalidad = total > 0 ? puntosConfianza / total : 0;
                console.log(`Promedio calidad: ${promedioCalidad.toFixed(2)} (max: 3.0)`);

                // Penalización por dispersión
                let dispersionAlta = false;
                let cvDispersion = 0;
                const preciosM2Validos = comparablesParaTabla.map(c => c.precio_m2).filter(v => typeof v === 'number' && v > 0);

                if (preciosM2Validos.length >= 2) {
                    const max = Math.max(...preciosM2Validos);
                    const min = Math.min(...preciosM2Validos);
                    cvDispersion = (max - min) / ((max + min) / 2);
                    dispersionAlta = cvDispersion > 0.8;
                    console.log(`Dispersión CV: ${(cvDispersion * 100).toFixed(1)}% ${dispersionAlta ? '(ALTA)' : '(normal)'}`);
                }

                const factorDispersion = dispersionAlta ? 0.7 : 1.0;
                const puntuacionFinal = promedioCalidad * factorDispersion;
                console.log(`Puntuación final: ${puntuacionFinal.toFixed(2)}`);

                // Criterios de nivel
                let nivelConfianzaCalc = 'Bajo';

                if (puntuacionFinal >= 2.2 && total >= 8 && !dispersionAlta) {
                    nivelConfianzaCalc = 'Alto';
                } else if (puntuacionFinal >= 1.8 && total >= 6) {
                    nivelConfianzaCalc = 'Medio';
                } else if (puntuacionFinal >= 1.3 && total >= 5) {
                    nivelConfianzaCalc = 'Medio';
                } else {
                    nivelConfianzaCalc = 'Bajo';
                }

                // Casos especiales
                if (!dispersionAlta && total >= 6 && puntuacionFinal >= 1.8) {
                    nivelConfianzaCalc = 'Medio';
                }

                if (totalVerificados >= 5 && totalZonasSimilares === 0 && total >= 6) {
                    if (nivelConfianzaCalc === 'Medio' && !dispersionAlta) {
                        nivelConfianzaCalc = 'Alto';
                        console.log('↑ Ajuste propiedades: Medio → Alto (datos hiperlocales)');
                    }
                }

                if (totalEstimaciones > total * 0.5) {
                    if (nivelConfianzaCalc === 'Alto') {
                        nivelConfianzaCalc = 'Medio';
                        console.log('↓ Penalización: Alto → Medio (muchas estimaciones)');
                    } else if (nivelConfianzaCalc === 'Medio' && totalEstimaciones > total * 0.7) {
                        nivelConfianzaCalc = 'Bajo';
                        console.log('↓ Penalización: Medio → Bajo (mayoría estimaciones)');
                    }
                }

                console.log(`✓ Nivel de confianza final: ${nivelConfianzaCalc}`);

                const nivelConfianzaLLM = extractedData.nivel_confianza || null;

                const nivelConfianzaDetalle = {
                    fuente: 'calculado_v2',
                    nivel_llm: nivelConfianzaLLM,
                    total_comparables: total,
                    porcentaje_reales: total > 0 ? Math.round((totalVerificados / total) * 100) : 0,
                    total_coincidencia: totalVerificados,
                    total_verificado: comparablesParaTabla.filter(c => {
                        const badges = Array.isArray(c.fuente_validacion) ? c.fuente_validacion : [c.fuente_validacion];
                        return badges.includes('verificado');
                    }).length,
                    total_zona_similar: comparablesParaTabla.filter(c => {
                        const badges = Array.isArray(c.fuente_validacion) ? c.fuente_validacion : [c.fuente_validacion];
                        return badges.includes('zona_similar');
                    }).length,
                    total_zona_extendida: totalEstimaciones,
                    total_zonas_alternativas: totalZonasAlternas,
                    puntuacion_calidad: parseFloat(promedioCalidad.toFixed(2)),
                    puntuacion_final: parseFloat(puntuacionFinal.toFixed(2)),
                    dispersion_alta: dispersionAlta,
                    cv_dispersion: parseFloat(cvDispersion.toFixed(3)),
                    zonas_alternativas_positivas: totalZonasSimilares > 0
                };

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
                    //valor_mercado: valorVentaDirecta,
                    precio_m2_ref: precioM2Implicito,  // Para que el frontend lo muestre
                    precio_m2_implicito: precioM2Implicito, // Ponderado / Area
                    precio_m2_mercado: precioM2MercadoSeguro,
                    valor_mercado_fuente: valorMercadoFuente,
                    factor_ajuste_total: factorAjusteTotal,
                    ajustes_detallados: ajustesDetallados,
                    metodo_mercado_label: 'Enfoque de Mercado (promedio real)',
                    metodo_ajuste_label: valorMercadoFuente === 'perplexity' ? 'Ajuste de Perplexity (criterio técnico)' : 'Promedio de Mercado',
                    comparables: comparablesParaTabla,
                    total_comparables: comparablesParaTabla.length,
                    total_comparables_venta: totalVenta,
                    total_comparables_arriendo: totalArriendo,
                    nivel_confianza: nivelConfianzaCalc,
                    nivel_confianza_detalle: nivelConfianzaDetalle,
                    estadisticas_fuentes: {
                        total_coincidencia: comparablesParaTabla.filter(c => {
                            const badges = Array.isArray(c.fuente_validacion) ? c.fuente_validacion : [c.fuente_validacion];
                            return badges.includes('coincidencia');
                        }).length,
                        total_verificado: comparablesParaTabla.filter(c => {
                            const badges = Array.isArray(c.fuente_validacion) ? c.fuente_validacion : [c.fuente_validacion];
                            return badges.includes('verificado');
                        }).length,
                        total_zona_similar: comparablesParaTabla.filter(c => {
                            const badges = Array.isArray(c.fuente_validacion) ? c.fuente_validacion : [c.fuente_validacion];
                            return badges.includes('zona_similar');
                        }).length,
                        total_zona_extendida: comparablesParaTabla.filter(c => {
                            const badges = Array.isArray(c.fuente_validacion) ? c.fuente_validacion : [c.fuente_validacion];
                            return badges.includes('zona_extendida');
                        }).length,
                    },
                    ficha_tecnica_defaults: {
                        habitaciones: 'No especificado',
                        banos: 'No especificado',
                        garajes: 'No especificado',
                        estrato: 'No especificado',
                        antiguedad: 'No especificado'
                    },
                    yield_mensual_mercado: yieldFinal,
                    yield_fuente: yieldFuente,
                    canon_estimado: canonPromedio,
                    area_construida: area,
                    perplexity_full_text: finalPerplexityText
                };

                t_processing_end = Date.now();

                const perfEnd = Date.now();
                const perfTotal = ((perfEnd - perfStart) / 1000).toFixed(2);
                const perfSearch = ((t_search_end - t_search_start) / 1000).toFixed(1);
                const perfPerplexity = ((t_openai_end - t_openai_start) / 1000).toFixed(1);
                const perfExtraction = ((t_extraction_end - t_extraction_start) / 1000).toFixed(1);
                const perfProcessing = ((t_processing_end - t_processing_start) / 1000).toFixed(1);

                console.log(`⏱️ [PERF] ============================================`);
                console.log(`⏱️ [PERF] TOTAL: ${perfTotal}s`);
                console.log(`⏱️ [PERF] Desglose:`);
                console.log(`⏱️ [PERF]   - BUSCADOR: ${perfSearch}s`);
                console.log(`⏱️ [PERF]   - ANALISTA AI: ${perfPerplexity}s`);
                console.log(`⏱️ [PERF]   - EXTRACTOR AI: ${perfExtraction}s`);
                console.log(`⏱️ [PERF]   - PROCESAMIENTO: ${perfProcessing}s`);
                console.log(`⏱️ [PERF] ============================================`);

                // Guardar resultado exitoso
                jobs.set(jobId, { status: 'completed', result: resultado });
                console.log(`✅ Job ${jobId} completado exitosamente`);

            } catch (calcError) {
                console.error('❌ Error en lógica de negocio:', calcError);
                jobs.set(jobId, { status: 'failed', error: 'Error en cálculos técnicos', details: calcError.message });
                return;
            }

        } catch (processingError) {
            console.error('❌ Error crítico en Job:', processingError);
            jobs.set(jobId, {
                status: 'failed',
                error: processingError.message || 'Error interno desconocido'
            });
        }
    }
};
