/**
 * avaluos-api-analysis V12 (Dynamic Prompt + Confidence V2)
 * - Prompts V12: Dynamic prompt loading (lotes OR propiedades), improved explanations
 * - Confidence V2: Weighted points system, CV dispersion, special cases
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
}

// --- HELPER: Construcción Dinámica de Prompt Perplexity ---
/**
 * Construye el prompt para Perplexity según tipo de inmueble
 * Solo carga la sección relevante (lotes O propiedades) para ahorrar tokens
 * @param {Object} formData - Datos del formulario
 * @param {number} area - Área del inmueble
 * @param {boolean} esLote - Si es lote o no
 * @param {string} usoLote - Uso del lote (comercial/residencial)
 * @param {string} ubicacion - Ubicación completa (barrio, municipio)
 * @returns {string} Prompt completo optimizado
 */
function construirPromptPerplexity(formData, area, esLote, usoLote, ubicacion) {
    // --- SECCIÓN BASE (COMÚN PARA TODOS) ---
    const infoInmueble = `
- Tipo: ${formData.tipo_inmueble || 'inmueble'}
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

    const areaInstruction = area
        ? `
- ÁREA CONSTRUIDA: ${area} m²
- Rango de áreas VENTA (Estricto): ${Math.round(area * 0.5)} a ${Math.round(area * 1.5)} m² (±50%)
- SOLO incluye comparables de venta cuyas áreas estén dentro de este rango. Para arriendos, intenta mantener el área similar, pero prioriza encontrar datos.`
        : '';

    const seccionBase = `
Eres un analista inmobiliario especializado en avalúos técnicos del mercado colombiano.
Tu objetivo es elaborar un **análisis completo, claro y profesional**, usando lenguaje 
simple que un usuario sin conocimientos técnicos pueda entender.

═══════════════════════════════════════════════════════════
DATOS DEL INMUEBLE
═══════════════════════════════════════════════════════════
${infoInmueble}
${areaInstruction}

═══════════════════════════════════════════════════════════
INSTRUCCIONES GENERALES
═══════════════════════════════════════════════════════════

**1. PRINCIPIO: NO INVENTES DATOS ESPECÍFICOS**
   - Si encuentras listados reales en portales (Fincaraíz, Metrocuadrado, Ciencuadras, etc.), úsalos.
   - Si NO hay suficientes datos reales, PUEDES usar:
     * Promedios estadísticos del municipio/región (déjalo claro)
     * Datos de zonas similares cercanas (especifica cuál y por qué)
     * Valoraciones proporcionales (explica el método en lenguaje simple)
   - NUNCA inventes precios específicos de propiedades que no existan.

**2. META DE COMPARABLES:**
   - Ideal: 15-20 comparables totales
   - Mínimo: 8-10 comparables

**3. ETIQUETAS DE VALIDACIÓN (OBLIGATORIAS):**
   
   Para cada comparable, asigna UNA de estas etiquetas:
   
   - **portal_verificado**: Listado real de portal inmobiliario.
   
   - **zona_similar**: Listado verificado de municipio/barrio cercano.
     → OBLIGATORIO: Agrega NOTA explicando municipio, distancia aproximada, y razón de similitud.
   
   - **estimacion_zona**: Promedio estadístico (solo si necesario para muestra mínima).
   
   - **promedio_municipal**: Dato agregado municipal (último recurso).

**4. FORMATO DE LISTADO (ESTRICTO):**

**[Título descriptivo]**<br>
[Tipo] | [Venta/Arriendo]<br>
$[Precio con puntos] | [Área] m² | [Hab] hab | [Baños] baños<br>
[Barrio] | [Ciudad]<br>
**[Fuente: Nombre portal]**<br>
fuente_validacion: [etiqueta]<br>
[NOTA: Obligatoria si zona_similar - explicar contexto]

Ejemplo:

**Lote urbano comercial en Circasia**<br>
Lote | Venta<br>
$850.000.000 | 4200 m² | - hab | - baños<br>
Centro | Circasia<br>
**Fincaraíz**<br>
fuente_validacion: zona_similar<br>
**NOTA:** Circasia está a 8 km de ${formData.municipio || 'la zona objetivo'}. Se incluye por estar en el mismo corredor turístico, con características de uso comercial comparables.

**5. CIFRAS:**
   - SIEMPRE en pesos colombianos completos
   - CON puntos para miles: $4.200.000 (NO 4.2M ni $4200000)

**6. FORMATO FINAL:**
   - Usa <br> para saltos de línea en listados
   - NO incluyas URLs ni hipervínculos
   - Responde en español
   - NO devuelvas JSON
    `.trim();

    // --- SECCIÓN ESPECÍFICA: LOTES ---
    const seccionLotes = `
═══════════════════════════════════════════════════════════
INSTRUCCIONES ESPECIALES PARA LOTES
═══════════════════════════════════════════════════════════

**1. BÚSQUEDA GEOGRÁFICA AMPLIADA (OBLIGATORIO):**
   
   a) **ZONA PRIMARIA:** ${formData.municipio || 'el municipio objetivo'}
      - Busca PRIMERO lotes en venta en este municipio.
   
   b) **ZONA SECUNDARIA** (si zona primaria tiene <5 lotes):
      - Amplía a municipios del MISMO DEPARTAMENTO (${formData.departamento || 'departamento cercano'}).
      - Prioriza municipios cercanos (radio ~30km).
      - Ejemplos según región:
        * Filandia → Circasia, Salento, Armenia, Calarcá, Quimbaya
        * Pereira → Dosquebradas, La Virginia, Santa Rosa de Cabal, Marsella
        * Armenia → Circasia, Calarcá, La Tebaida, Montenegro
   
   c) **ZONA TERCIARIA** (si aún faltan datos):
      - Lotes de la región con características similares.
      - Mismo uso (${usoLote}), estrato socioeconómico similar.

**2. VALORACIÓN PROPORCIONAL - LENGUAJE SIMPLE (si aplica):**
   
   ❌ NUNCA digas solo: "se aplicó método residual"
   
   ✅ SIEMPRE explica así:
   
   "Como los lotes en venta en ${formData.municipio || '[municipio]'} son escasos, complementamos 
   el análisis con propiedades construidas en la misma zona. Esto nos permite estimar 
   el valor del terreno, ya que típicamente un lote representa entre 25% y 40% del 
   valor total de una propiedad construida, dependiendo del uso y la ubicación."
   
   Luego detalla:
   - ¿Qué propiedades construidas usaste como referencia?
   - ¿Qué porcentaje aplicaste y por qué? (25%-40% según caso)
   - ¿Cómo ajustaste por características específicas?

**3. OMITIR ARRIENDOS COMPLETAMENTE:**
   - PROHIBIDO buscar o mencionar arriendos para lotes.
   - PROHIBIDO calcular rentabilidad o yield.
   - Solo análisis de VENTA directa.

**4. FRASE FINAL OBLIGATORIA (en Resumen Ejecutivo):**
   
   "Valor determinado mediante análisis comparativo del mercado regional de lotes, 
   complementado cuando fue necesario con valoración proporcional de propiedades 
   construidas (método que estima el valor del terreno como porcentaje del valor 
   total de construcciones similares en la zona)."

**5. TAREAS:**

## 1. BÚSQUEDA Y SELECCIÓN DE COMPARABLES

Presenta un listado de **entre 15 a 20 comparables** SOLO en VENTA usando el formato especificado arriba.

## 2. ANÁLISIS DEL VALOR

### 2.1. Método de Venta Directa (Precio por m²)
- Calcula el valor promedio por m² basándote en los comparables de venta.
- Indica el valor por m² FINAL (ajustado por ubicación, características, etc.).
- Calcula: Precio por m² final × ${area || 'área'} m².

## 3. RESULTADOS FINALES
- **Valor Recomendado de Venta: $XXX.XXX.XXX**
- **Rango sugerido: $XXX.XXX.XXX - $XXX.XXX.XXX**
- Precio por m² final usado
- Posición en el mercado (liquidez)

## 4. AJUSTES APLICADOS
Explica ajustes por características específicas del lote.

## 5. LIMITACIONES
Menciona escasez de datos, dependencias de promedios o zonas similares.

## 6. RESUMEN EJECUTIVO
2-3 párrafos con valor recomendado, rango y estrategia de venta.
INCLUYE la frase final obligatoria (ver punto 4 arriba).
    `.trim();

    // --- SECCIÓN ESPECÍFICA: PROPIEDADES ---
    const seccionPropiedades = `
═══════════════════════════════════════════════════════════
INSTRUCCIONES PARA PROPIEDADES (Apartamentos/Casas)
═══════════════════════════════════════════════════════════

**1. BÚSQUEDA GEOGRÁFICA ENFOCADA:**
   
   a) **ZONA PRIMARIA:** ${formData.barrio || ''}, ${formData.municipio || 'el municipio'}
      - Prioriza comparables del MISMO BARRIO.
      - Busca al menos 8-12 propiedades en venta.
   
   b) **ZONA SECUNDARIA** (complemento):
      - Barrios adyacentes del mismo estrato socioeconómico.
   
   c) **ARRIENDOS (OBLIGATORIO):**
      - Busca AL MENOS 6 propiedades en arriendo en la misma zona.
      - Necesitamos canon mensual para cálculo de rentabilidad.

**2. MÉTODO DE RENTABILIDAD - CÁLCULO CORRECTO:**
   
   **PASO 1: Canon Mensual Estimado**
   - NO uses promedio simple de precios totales de arriendo.
   - Calcula: Precio arriendo / Área = Canon por m²
   - Promedia los "canon por m²" de todos los arriendos.
   - Multiplica: Canon promedio/m² × ${area || 'área'} m² = Canon Mensual Estimado
   
   **PASO 2: Yield del Mercado**
   - Investiga el yield mensual REAL del mercado de ${formData.municipio || 'la zona'}.
   - Busca datos de rentabilidad típica para ${formData.tipo_inmueble || 'apartamentos'}.
   - Si encuentras datos específicos, úsalos.
   - Si no, usa rangos conservadores (0.4% - 0.6% mensual).
   
   **IMPORTANTE:** Presenta el yield con formato EXACTO:
   "**Yield promedio mercado: 0.XX%**" (ejemplo: 0.52%, 0.48%)
   
   **PASO 3: Valoración**
   - Valor estimado = Canon Mensual Estimado / Yield mensual promedio

**3. TAREAS:**

## 1. BÚSQUEDA Y SELECCIÓN DE COMPARABLES

Presenta **entre 15 a 20 comparables** (venta + arriendo) usando el formato especificado.
- Mínimo 8-12 en VENTA
- Mínimo 6 en ARRIENDO

## 2. ANÁLISIS DEL VALOR

### 2.1. Método de Venta Directa (Precio por m²)
- Calcula el valor promedio por m² basándote en comparables de venta.
- Indica el valor por m² FINAL (ajustado).
- Calcula: Precio por m² final × ${area || 'área'} m².

### 2.2. Método de Rentabilidad (Yield Mensual)
- Sigue los 3 pasos descritos arriba.
- Muestra el yield encontrado con formato exacto.

## 3. RESULTADOS FINALES
- **Valor Recomendado de Venta: $XXX.XXX.XXX**
- **Rango sugerido: $XXX.XXX.XXX - $XXX.XXX.XXX**
- Precio por m² final
- Posición en mercado

## 4. AJUSTES APLICADOS
Explica ajustes por antigüedad, estado, parqueadero, etc.

## 5. LIMITACIONES
Menciona escasez de datos o dependencias.

## 6. RESUMEN EJECUTIVO
2-3 párrafos con valor recomendado (ponderando venta + rentabilidad), rango y estrategia.
    `.trim();

    // --- ENSAMBLAR PROMPT FINAL ---
    return `${seccionBase}\n\n${esLote ? seccionLotes : seccionPropiedades}`;
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

        // --- CONSTRUCCIÓN DEL PROMPT (V12 - DINÁMICO) ---
        const perplexityPrompt = construirPromptPerplexity(
            formData,
            area,
            esLote,
            usoLote,
            ubicacion
        );


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

            // Filtro Lote Grande (Estricto con Fallback)
            let comparablesParaTabla = comparablesFiltradosPorArea;
            if (esLote && area > 1000) {
                // Filtro primario: ±50% (estándar de la industria para lotes)
                const filtradosEstrictos = uniqueComparables.filter(c => {
                    const a = c.area_m2 || 0;
                    return a >= area * 0.5 && a <= area * 1.5;
                });

                // Si hay suficientes comparables (≥5), usar filtro estricto
                if (filtradosEstrictos.length >= 5) {
                    comparablesParaTabla = filtradosEstrictos;
                } else {
                    // Fallback: ±70% para mercados con poca oferta
                    const filtradosRelajados = uniqueComparables.filter(c => {
                        const a = c.area_m2 || 0;
                        return a >= area * 0.3 && a <= area * 1.7;
                    });
                    comparablesParaTabla = filtradosRelajados.length >= 3
                        ? filtradosRelajados
                        : uniqueComparables; // Último recurso: usar todos y dejar que IQR filtre
                }
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
            // Reemplazar frases naturales
            finalPerplexityText = finalPerplexityText.replace(/(presentan|listado de|encontraron|selección de)\s+(\d+)\s+(comparables|inmuebles|propiedades)/gi, `$1 ${totalReal} $3`);
            // Eliminar literal "total_comparables: X" (no debe ser visible)
            finalPerplexityText = finalPerplexityText.replace(/total_comparables:\s*\d+/gi, '');

            let resumenFinal = extractedData.resumen_mercado || 'Análisis de mercado realizado.';
            resumenFinal = resumenFinal.replace(/(presentan|listado de|encontraron|selección de)\s+(\d+)\s+(comparables|inmuebles|propiedades)/gi, `$1 ${totalReal} $3`);

            // --- CÁLCULO AUTOMÁTICO DEL NIVEL DE CONFIANZA ---
            // Protección: Si no hay comparables, nivel = Bajo
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
                    valor_estimado_venta_directa: valorVentaDirecta,
                    valor_estimado_rentabilidad: valorRentabilidad,
                    precio_m2_final: precioM2Usado,
                    metodo_mercado_label: 'Enfoque de Mercado (promedio real)',
                    metodo_ajuste_label: valorRecomendado ? 'Ajuste de Perplexity (criterio técnico)' : 'Promedio de Mercado',
                    comparables: [],
                    total_comparables: 0,
                    total_comparables_venta: 0,
                    total_comparables_arriendo: 0,
                    nivel_confianza: 'Bajo',
                    nivel_confianza_detalle: nivelConfianzaDetalle,
                    estadisticas_fuentes: {
                        total_portal_verificado: 0,
                        total_estimacion_zona: 0,
                        total_zona_similar: 0,
                        total_promedio_municipal: 0,
                    },
                    ficha_tecnica_defaults: {
                        habitaciones: 'No especificado',
                        banos: 'No especificado',
                        garajes: 'No especificado',
                        estrato: 'No especificado',
                        antiguedad: 'No especificado'
                    },
                    yield_mensual_mercado: esLote ? null : yieldFinal,
                    area_construida: area,
                    perplexity_full_text: finalPerplexityText
                };

                return new Response(JSON.stringify(resultado), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            // ========================================
            // CÁLCULO DE NIVEL DE CONFIANZA V2
            // Sistema de puntos ponderados + casos especiales
            // ========================================

            // Verificar que esLote está definido
            console.assert(typeof esLote === 'boolean', 'esLote debe estar definido');

            const total = comparablesParaTabla.length;

            // --- PASO 1: CLASIFICAR COMPARABLES POR CALIDAD ---
            const totalVerificados = comparablesParaTabla.filter(
                c => c.fuente_validacion === 'portal_verificado'
            ).length;

            const totalZonasSimilares = comparablesParaTabla.filter(
                c => c.fuente_validacion === 'zona_similar'
            ).length;

            const totalEstimacionZona = comparablesParaTabla.filter(
                c => c.fuente_validacion === 'estimacion_zona'
            ).length;

            const totalPromedioMunicipal = comparablesParaTabla.filter(
                c => c.fuente_validacion === 'promedio_municipal'
            ).length;

            // Suma total de estimaciones (para lógica de penalización)
            const totalEstimaciones = totalEstimacionZona + totalPromedioMunicipal;

            // Compatibilidad con frontend (alias)
            const totalZonasAlternas = totalZonasSimilares + totalPromedioMunicipal;

            console.log(`Clasificación: ${totalVerificados} verificados, ${totalZonasSimilares} zonas similares, ${totalEstimaciones} estimaciones`);

            // --- PASO 2: SISTEMA DE PUNTOS PONDERADOS ---
            // Cada tipo de fuente tiene un "peso" de calidad
            let puntosConfianza = 0;

            puntosConfianza += totalVerificados * 3;      // Datos reales valen más
            puntosConfianza += totalZonasSimilares * 2;   // Zonas similares son buenas (especialmente lotes)
            puntosConfianza += totalEstimaciones * 1;     // Estimaciones cuentan menos

            // Normalizar: promedio de calidad por comparable
            const promedioCalidad = total > 0 ? puntosConfianza / total : 0;
            console.log(`Promedio calidad: ${promedioCalidad.toFixed(2)} (max: 3.0)`);

            // --- PASO 3: PENALIZACIÓN POR DISPERSIÓN (CV 80%) ---
            let dispersionAlta = false;
            let cvDispersion = 0;
            const preciosM2Validos = comparablesParaTabla
                .map(c => c.precio_m2)
                .filter(v => typeof v === 'number' && v > 0);

            if (preciosM2Validos.length >= 2) {
                const max = Math.max(...preciosM2Validos);
                const min = Math.min(...preciosM2Validos);
                cvDispersion = (max - min) / ((max + min) / 2); // Coeficiente de variación simplificado
                dispersionAlta = cvDispersion > 0.8; // 80% de variación
                console.log(`Dispersión CV: ${(cvDispersion * 100).toFixed(1)}% ${dispersionAlta ? '(ALTA)' : '(normal)'}`);
            }

            const factorDispersion = dispersionAlta ? 0.7 : 1.0; // Penalización 30% si hay alta dispersión

            // --- PASO 4: PUNTUACIÓN FINAL ---
            const puntuacionFinal = promedioCalidad * factorDispersion;
            console.log(`Puntuación final: ${puntuacionFinal.toFixed(2)}`);

            // --- PASO 5: CRITERIOS DE NIVEL ---
            let nivelConfianzaCalc = 'Bajo';

            if (puntuacionFinal >= 2.2 && total >= 8 && !dispersionAlta) {
                // Alto: Datos mayormente verificados, muestra suficiente, baja dispersión
                nivelConfianzaCalc = 'Alto';
            } else if (puntuacionFinal >= 1.8 && total >= 6) {
                // Medio: Mix de verificados y zonas similares, muestra aceptable
                nivelConfianzaCalc = 'Medio';
            } else if (puntuacionFinal >= 1.3 && total >= 5) {
                // Medio-Bajo: Pocas fuentes verificadas pero suficientes para referencia
                nivelConfianzaCalc = 'Medio';
            } else {
                // Bajo: Muy pocos datos o demasiadas estimaciones
                nivelConfianzaCalc = 'Bajo';
            }

            // --- PASO 6: CASOS ESPECIALES ---

            // CASO A: Lotes con buena cobertura regional
            if (esLote && totalZonasSimilares >= 4 && totalVerificados >= 2 && total >= 7) {
                // Para lotes, las zonas similares son VALIOSAS (mercado más homogéneo regionalmente)
                if (nivelConfianzaCalc === 'Bajo') {
                    nivelConfianzaCalc = 'Medio';
                    console.log('↑ Ajuste lotes: Bajo → Medio (buena cobertura regional)');
                }
            }

            // CASO B: Propiedades con zona muy específica (hiperlocales)
            if (!esLote && totalVerificados >= 5 && totalZonasSimilares === 0 && total >= 6) {
                // Apartamentos/casas con datos solo del barrio objetivo (muy confiable)
                if (nivelConfianzaCalc === 'Medio' && !dispersionAlta) {
                    nivelConfianzaCalc = 'Alto';
                    console.log('↑ Ajuste propiedades: Medio → Alto (datos hiperlocales)');
                }
            }

            // CASO C: Penalización por exceso de estimaciones
            if (totalEstimaciones > total * 0.5) {
                // Más del 50% son estimaciones → Bajar nivel
                if (nivelConfianzaCalc === 'Alto') {
                    nivelConfianzaCalc = 'Medio';
                    console.log('↓ Penalización: Alto → Medio (muchas estimaciones)');
                } else if (nivelConfianzaCalc === 'Medio' && totalEstimaciones > total * 0.7) {
                    nivelConfianzaCalc = 'Bajo';
                    console.log('↓ Penalización: Medio → Bajo (mayoría estimaciones)');
                }
            }

            console.log(`✓ Nivel de confianza final: ${nivelConfianzaCalc}`);

            // --- PASO 7: METADATA DETALLADA ---
            const nivelConfianzaLLM = extractedData.nivel_confianza || null;
            const ratioReal = total > 0 ? totalVerificados / total : 0;

            const nivelConfianzaDetalle = {
                fuente: 'calculado_v2', // Versión del algoritmo
                nivel_llm: nivelConfianzaLLM, // Guardamos lo que dijo Perplexity (informativo)

                // Métricas principales
                total_comparables: total,
                porcentaje_reales: total > 0 ? Math.round((totalVerificados / total) * 100) : 0,

                // Desglose de fuentes (separado para claridad)
                total_portal_verificado: totalVerificados,
                total_zona_similar: totalZonasSimilares,
                total_estimacion_zona: totalEstimacionZona,
                total_promedio_municipal: totalPromedioMunicipal,

                // Compatibilidad con frontend actual
                total_zonas_alternativas: totalZonasAlternas,

                // Indicadores de calidad (NUEVOS)
                puntuacion_calidad: parseFloat(promedioCalidad.toFixed(2)),
                puntuacion_final: parseFloat(puntuacionFinal.toFixed(2)),
                dispersion_alta: dispersionAlta,
                cv_dispersion: parseFloat(cvDispersion.toFixed(3)),

                // Contexto
                es_lote: esLote,
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

                // ERROR 2
                precio_m2_final: precioM2Usado,

                // ERROR 3
                metodo_mercado_label: 'Enfoque de Mercado (promedio real)',
                metodo_ajuste_label: valorRecomendado ? 'Ajuste de Perplexity (criterio técnico)' : 'Promedio de Mercado',

                comparables: comparablesParaTabla,
                total_comparables: comparablesParaTabla.length,
                total_comparables_venta: totalVenta,
                total_comparables_arriendo: totalArriendo,

                // Nivel de confianza y estadísticas de fuentes (V11 - Calculado)
                nivel_confianza: nivelConfianzaCalc,
                nivel_confianza_detalle: nivelConfianzaDetalle,
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

                yield_mensual_mercado: esLote ? null : yieldFinal,
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