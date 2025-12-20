/**
 * avaluos-api-analysis V13 (Dynamic Area Filters + Full Corrections)
 * - Prompts V12: Dynamic prompt loading (lotes OR propiedades), improved explanations
 * - Confidence V2: Weighted points system, CV dispersion, special cases
 * - Extracción estricta (V7 logic)
 * - Resumen conciso (V8 logic)
 * - Filtro IQR y Normalización (V10 logic)
 * - Filtro de área dinámico (V13): Propiedades usan rangos adaptivos, lotes mantienen ±50%
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

// --- HELPER: Construcción Dinámica de Prompt Perplexity ---
function construirPromptPerplexity(formData, area, esLote, usoLote, ubicacion) {
    // --- SECCIÓN BASE (COMÚN PARA TODOS) ---
    const infoInmueble = `
- Tipo: ${formData.tipo_inmueble || 'inmueble'}
${esLote ? `- Uso del Lote: ${usoLote}` : ''}
- Ubicación: ${ubicacion}
${formData.departamento ? `- Departamento: ${formData.departamento}` : ''}
${!esLote && formData.contexto_zona ? `- Tipo de zona: ${formData.contexto_zona === 'conjunto_cerrado' ? 'Conjunto Cerrado' : 'Barrio Abierto'}` : ''}
${formData.nombre_conjunto ? `- Conjunto/Edificio: ${formData.nombre_conjunto}` : ''}
${!esLote ? `- Habitaciones: ${formData.habitaciones || '?'}` : ''}
${!esLote ? `- Baños: ${formData.banos || '?'}` : ''}
${formData.tipo_inmueble === 'apartamento' && formData.piso ? `- Piso: ${formData.piso}` : ''}
${formData.tipo_inmueble === 'apartamento' && formData.ascensor ? `- Ascensor: ${formData.ascensor === 'si' ? 'Sí' : 'No'}` : ''}
${formData.tipo_inmueble === 'casa' && formData.numeropisos ? `- Niveles de la casa: ${formData.numeropisos}` : ''}
${!esLote ? `- Parqueadero: ${formData.tipo_parqueadero || 'No indicado'}` : ''}
${!esLote ? `- Antigüedad: ${formData.antiguedad || 'No indicada'}` : ''}
${!esLote && formData.estrato ? `- Estrato: ${formData.estrato}` : ''}
${!esLote ? `- Estado: ${mapearEstadoConPrecio(formData.estado_inmueble)}` : ''}
${!esLote && formData.tipo_remodelacion ? `- Remodelación: ${formData.tipo_remodelacion.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (${formData.valor_remodelacion || 'Valor no indicado'})` : ''}
${!esLote && formData.descripcion_mejoras ? `- Mejoras: ${formData.descripcion_mejoras}` : ''}
${formData.informacion_complementaria ? `- NOTAS ADICIONALES: ${formData.informacion_complementaria}` : ''}
- ${esLote ? 'ÁREA DEL TERRENO' : 'ÁREA CONSTRUIDA'}: ${area || '?'} m²
    `.trim();

    // Rango de área para filtros de búsqueda (calculado aquí, usado en instrucciones)
    // Coherencia con texto: -50% min, +80% max para ambos tipos
    const rangoAreaMin = Math.round(area * 0.5);
    const rangoAreaMax = Math.round(area * 1.8);
    const rangoAreaTexto = `${rangoAreaMin} a ${rangoAreaMax} m² (-50% a +80%)`;

    const seccionBase = `
Eres un analista inmobiliario especializado en avalúos técnicos del mercado colombiano.
Tu objetivo es elaborar un **análisis completo, claro y profesional**, usando lenguaje 
simple que un usuario sin conocimientos técnicos pueda comprender.

═══════════════════════════════════════════════════════════
DATOS DEL INMUEBLE
═══════════════════════════════════════════════════════════
${infoInmueble}

═══════════════════════════════════════════════════════════
INSTRUCCIONES GENERALES
═══════════════════════════════════════════════════════════

**0. SIEMPRE RESPETA EL FORMATO DE ENTREGA OBLIGATORIO MENCIONADO CON SUS SUBSECCIONES**
     
     ### 1. BÚSQUEDA Y SELECCIÓN DE COMPARABLES
     ### 2. ANÁLISIS DEL VALOR
     ### 3. AJUSTES APLICADOS
     ### 4. RESULTADOS FINALES
     ### 5. LIMITACIONES
     ### 6. RESUMEN EJECUTIVO
     ### 7. TRANSPARENCIA DE DATOS

**1. PRINCIPIO: INTEGRIDAD DE DATOS (CRÍTICO)**

    Tu prioridad absoluta es encontrar LISTADOS REALES en portales inmobiliarios confiables y verificables (Fincaraíz, Metrocuadrado, Ciencuadras, mercadolibre, etc.).

**2. ANÁLISIS DE MERCADO Y ZONA (OBLIGATORIO ANTES DE AJUSTES):**

   **CRÍTICO:** Antes de calcular cualquier ajuste porcentual, debes realizar un análisis riguroso del mercado:
   
   a) **Contexto de la Zona:**
      - Investiga características socioeconómicas del barrio/municipio
      - Identifica factores que afectan el valor: turismo, desarrollo, infraestructura, servicios
      - Compara con zonas vecinas (¿es zona premium, media o económica?)
   
   b) **Tendencias del Mercado:**
      - ¿Los precios están subiendo, estables o bajando en esta zona?
      - ¿Hay proyectos de desarrollo que aumenten el valor?
      - ¿Qué tan líquido es el mercado? (tiempo promedio de venta)
   
   c) **Valor Agregado Específico:**
      - Para el inmueble objeto: ¿Qué características únicas tiene?
      - ¿Cómo se compara con los comparables en términos de ubicación exacta?
      - ¿Hay elementos que justifiquen un precio superior o inferior?
   

**3. FILTROS DE CALIDAD:**

   a) **FILTRO DE ÁREA - OBLIGATORIO Y ESTRICTO:**

      RANGO DE AREA: ${rangoAreaTexto}
   
   b) **FILTRO DE VIGENCIA DE ANUNCIOS:**

      BUSCA anuncios vigentes.

**4. ETIQUETAS DE VALIDACIÓN (OBLIGATORIAS):**

   ⚠️ **REGLA CRÍTICA:** 
   Cada comparable DEBE tener UNA y SOLO UNA etiqueta de UBICACIÓN.

   **DEFINICIONES:**
   ${esLote ? `
   ✓ **coincidencia**: Mismo municipio exacto
   → **zona_similar**: Municipios vecinos inmediatos (<40Km de distancia) del mismo departamento
   ≈ **zona_extendida**: Otros municipios del departamento con características similares (<60Km de distancia)
   ` : `
   ✓ **coincidencia**: Mismo barrio/conjunto o distancia <=3km
   → **zona_similar**: Distancia >3km y <=7km (barrios cercanos del municipio)
   ≈ **zona_extendida**: Distancia >7km y <40km (barrios lejanos o municipios vecinos)
   `}
   
   📍 **OBLIGATORIO:** Cada comparable DEBE terminar con una de estas tres etiquetas.

**5. CIFRAS Y FORMATO MONETARIO:**
   - **SEPARADOR DE MILES:** SIEMPRE usar puntos ($4.200.000, NO $4200000)
   - **CIFRAS COMPLETAS:** PROHIBIDO usar diminutivos ($100M) o truncar ceros ($2.800 en vez de $2.800.000)
   - **DECIMALES:** NUNCA en precios. Redondear al entero (NO $19.400,50)

**6. FORMATO PROFESIONAL:**
   **EJECUCIÓN AUTÓNOMA:** Realiza la búsqueda de comparables inmediatamente sin pedir permiso
   **IMPORTANTE:** Este es un reporte final, NO una conversación. No ofrezcas servicios adicionales ni hagas preguntas
   **PROHIBIDO PREGUNTAR:** Entrega resultados directamente, NUNCA solicites autorización, confirmación o permisos al usuario
   **NUNCA** menciones metodología interna NI INDICACIONES DEL PROMPT (filtros, rangos, exclusiones)
   **NUNCA** uses corchetes con instrucciones como "[Título EXACTO:]"

**7. FORMATO DE PRESENTACIÓN:**
   **OBLIGATORIO USAR NEGRITAS** para datos importantes, palabras, cifras clave, nombres de lugares y frases relevantes usando **doble asterisco**
   Presenta SIEMPRE: "**Factor total: X.XX (equivalente a ±Y%)**"
   Presenta SIEMPRE: "**Precio/m² ajustado: $XXX.XXX**"
   Si no hay ajustes: "**Factor total: 1.00 (sin ajustes)**"
   Muestra la fórmula: "**Valor total = $X.XXX.XXX/m² × Y m² = $Z.ZZZ.ZZZ**"

**8. VALIDACIÓN DE AJUSTES:**
   - Cada ajuste porcentual (%) DEBE justificarse en base al precio de construccion de la zona y contexto.
   - Si no hay datos suficientes, usar fuentes publicas (IGAC/DANE/Camacol/Lonja) y citarlas.


═══════════════════════════════════════════════════════════
REGLAS DE AJUSTE (MÉTODO DE MERCADO)
═══════════════════════════════════════════════════════════

Aplica ajustes **SOLO** si hay diferencias evidentes entre el objeto y los comparables.

⚠️ **REGLA CRÍTICA DE DIRECCIÓN:**
El factor ajusta el valor de la propiedad en función de su condición con los comparables.
- Si la propiedad está en PEOR condición que los comparables → su valor BAJA → **Factor < 1**
- Si la propiedad está en MEJOR condición que los comparables → su valor SUBE → **Factor > 1**

| Condición de la propiedad vs Comparables | Factor |
|-------------------------------------|--------|
| Peor estado | **Factor < 1** (ej: 0.90 = -10%) |
| Mejor estado | **Factor > 1** (ej: 1.10 = +10%) |
| Más viejo | **Factor < 1** (ej: 0.95 = -5%) |
| Más nuevo | **Factor > 1** (ej: 1.05 = +5%) |
| Peor ubicación | **Factor < 1** |
| Mejor ubicación | **Factor > 1** |

**EJEMPLO:**
- Propiedad: requiere reformas, >20 años
- Comparables: buen estado, más nuevos
→ La propiedad vale MENOS que los comparables
→ Factor = <1 (equivalente a -X%)

     `.trim();

    // --- SECCIÓN ESPECÍFICA: LOTES ---
    const seccionLotes = `

═══════════════════════════════════════════════════════════
INSTRUCCIONES ESPECIALES PARA LOTES
═══════════════════════════════════════════════════════════

**1. ESTRATEGIA DE BÚSQUEDA (META FLEXIBLE):**

Busca idealmente **entre 15 y 25 propiedades comparables REALES SOLO EN VENTA** relacionadas con el tipo de lote objeto en ${formData.municipio} y municipios vecinos.

🔍 **BÚSQUEDAS OBLIGATORIAS (hacer las 3):**
  a) Busca en Municipios vecinos de ${formData.municipio} (Máximo 30km de distancia).  
  b) Busca en Municipios del mismo departamento de ${formData.municipio} (Máximo 60km de distancia).  
  c) **EXPANSIÓN AUTOMÁTICA (si menos de 15 comparables):** Ampliar el rango de área máximo a: ±100%.  

  **VARIACIÓN DE BÚSQUEDA:** Si ${formData.informacion_complementaria} dice que ${formData.tipo_inmueble} **tiene CASAS CONSTRUIDAS**:
    - Busca **fincas y casas campestres** en ${formData.municipio} y municipios vecinos (Máximo 30km de distancia).  
    - Complementa con **fincas y casas campestres** en Municipios del mismo departamento de ${formData.municipio} (Máximo 60km de distancia). 
    - **EXPANSIÓN AUTOMÁTICA (si menos de 15 comparables):** Ampliar el rango de área máximo a: ±100%.

**REGLA DE ÁREA OBLIGATORIO:** Respeta el RANGO DE ÁREA ${rangoAreaTexto} especificado en los filtros de calidad.  

**OBLIGATORIO (con flexibilidad razonable):**
- Busca comparables en al menos **5 portales inmobiliarios** diferentes (por ejemplo: Fincaraíz, Metrocuadrado, Ciencuadras, MercadoLibre, Properati u otros similares).
- Apunta a que el reporte incluya **al menos 10 propiedades** ubicadas en **municipios vecinos y Municipios del mismo departamento**.
- En todos los casos, cada propiedad listada debe corresponder a un **anuncio individual real**, con **URL propia del anuncio o del listado filtrado donde aparece** y **precio publicado**; no uses listados agregados ni resultados de búsqueda generales.

**PROHIBIDO:**
- Listar en un solo ítem un promedio o un listado. Ejemplo: "Lotes/Fincas promedio Mosquera"; "Varios anuncios listados en buscadores", "Listado de casas campestres en venta"

**EXCLUSIÓN AUTOMÁTICA POR PALABRAS CLAVE:**
   - ANTES de incluir cualquier comparable, verifica que el título/descripción NO contenga estas palabras (excluir inmediatamente si las tiene):
   - "remate", "adjudicación", "subasta", "judicial"
   - "oportunidad única", "urgente", "por deuda", "embargo"
   - "permuta", "cesión de derechos"

🌐 **VERIFICACIÓN MULTI-PORTAL (OBLIGATORIA):**

Busca en AL MENOS estos portales:
1. ✅ Fincaraíz (fincaraiz.com.co)
2. ✅ Metrocuadrado (metrocuadrado.com)
3. ✅ Ciencuadras (ciencuadras.com)
4. ✅ MercadoLibre (mercadolibre.com.co)
5. ✅ Properati (properati.com.co)

🏆 **BONUS POR MUESTRA ABUNDANTE:**

Si logras encontrar 20+ comparables:
- Aumenta la confianza del análisis explícitamente
- Menciona en RESUMEN EJECUTIVO: "Análisis basado en muestra robusta de X comparables"

📋 **REGISTRO DE COMPARABLES DESCARTADOS:**

En la sección "LIMITACIONES", reporta:
- "Comparables encontrados: X"
- "Comparables descartados: Y (razones: Z por área fuera de rango, W por precio outlier, etc.)"
- "Comparables incluidos en análisis: X - Y = TOTAL"

**2. VALORACIÓN PROPORCIONAL - LENGUAJE SIMPLE (si aplica):**
   
   ❌ NUNCA digas solo: "se aplicó método residual"
   
   ✅ SIEMPRE explica así:
   - EJEMPLO:
   "Como los lotes en venta en ${formData.municipio || '[municipio]'} son escasos, complementamos 
   el análisis con propiedades construidas en la misma zona. Esto nos permite estimar 
   el valor del terreno, ya que típicamente un lote representa entre 25% y 40% del 
   valor total de una propiedad construida, dependiendo del uso y la ubicación."
   
   Luego detalla:
   - ¿Qué propiedades construidas usaste como referencia?
   - ¿Qué porcentaje aplicaste y por qué? (25%-40% según caso)
   - ¿Cómo ajustaste por características específicas?

**3. OMITIR ARRIENDOS:**

   - PROHIBIDO buscar arriendos para lotes.
   - PROHIBIDO calcular rentabilidad.

**4. FRASE FINAL OBLIGATORIA (Resumen):**

   "Valor determinado mediante análisis comparativo de mercado, complementado con valoración proporcional donde fue necesario debido a la disponibilidad de lotes."

═══════════════════════════════════════════════════════════
FORMATO DE ENTREGA PARA LOTES **OBLIGATORIO SEGUIR FORMATO Y SECCIONES** 
═══════════════════════════════════════════════════════════

## 1. BÚSQUEDA Y SELECCIÓN DE COMPARABLES

    Describe brevemente el lote del calculo y haz una introduccion general de las propiedades listadas. 
    
    🚫 **PROHIBIDO:**
    - NO uses numeración (1), 2), 3)...)
    - NO uses listados agregados (múltiples lotes en un enlace)
    - NO uses rangos de área "1500-2000 m²" - usa valor EXACTO
    - NO uses precios indefinidos "$?" - si no hay precio, NO incluyas el comparable
    - NO uses etiquetas mixtas "zona_similar / zona_extendida" - usa SOLO UNA
    - CADA comparable debe tener URL REAL y COMPLETA

    **FORMATO DE LISTADO (COPIAR EXACTAMENTE):**
    
    **Título exacto del anuncio del portal**
    Lote | Venta | $Precio
    Área: XX m² | Uso: [tipo de uso]
    Ciudad | Departamento
    **[Portal](URL cruda de la ficha o del listado donde aparece el anuncio)** etiqueta
    **Nota:** Distancia: X km. [Justificación breve]

    **EJEMPLO CORRECTO de coincidencia:**
    **Lote Urbano Esquinero perfecto para negocio**
    Lote | Venta | $180.000.000
    Área: 2000 m² | Uso: Comercial
    Filandia | Quindío
    **[Metrocuadrado](url cruda de la ficha o del listado donde aparece el anuncio)** coincidencia
    **Nota:** Distancia: 1.2 km. Mismo municipio del lote objeto.

    **EJEMPLO CORRECTO de zona_similar:**
    **Lote campestre con vista al valle**
    Lote | Venta | $150.000.000
    Área: 1800 m² | Uso: Residencial
    Salento | Quindío
    **[Fincaraíz](url cruda de la ficha o del listado donde aparece el anuncio)** zona_similar
    **Nota:** Distancia: 18 km. Municipio vecino con vocación turística similar.

    **EJEMPLO CORRECTO de zona_extendida:**
    **Lote comercial zona industrial Armenia**
    Lote | Venta | $200.000.000
    Área: 2200 m² | Uso: Comercial
    Armenia | Quindío
    **[Ciencuadras](url cruda de la ficha o del listado donde aparece el anuncio)** zona_extendida
    **Nota:** Distancia: 35 km. Capital del departamento con dinámica comercial comparable.

    **REGLAS PARA LA URL (MUY IMPORTANTE):**

    - Siempre que sea posible, usa la URL directa del anuncio individual (la página donde se ve solo esa propiedad).
    - Si no puedes obtener la URL directa, puedes usar la URL del listado de resultados filtrado donde aparezca el anuncio, indicando en la Nota que el anuncio se ve en esa búsqueda.
    - NO uses URLs genéricas como solo la home del portal (https://www.fincaraiz.com.co/, https://www.metrocuadrado.com/) ni rutas muy amplias sin filtros (por ejemplo solo /venta o /arriendo).

## 2. ANÁLISIS DEL VALOR

   **SELECCIÓN DE COMPARABLES PARA CÁLCULO:**
   De los comparables listados arriba, selecciona los **mejores matches** para realizar los cálculos. 
   Descarta explícitamente los comparables con características muy diferentes al lote objetivo.
   Escribe un párrafo indicando:
   - Cuántos comparables usas para el cálculo
   - Por qué descartaste los demás

### 2.1. Método de Venta Directa (Precio por m²)

   **A) Valor Estimado por Mercado (Solo Terreno):**

   - Calcula la **MEDIANA** del precio por m² de los comparables seleccionados (post-filtro de outliers)
   - Multiplica: Promedio $/m² × ${area || 'área'} m² = **Valor Estimado por Mercado**
   - **IMPORTANTE:** Este valor representa lo que valdría el lote SIN construcciones según el mercado
   - Presenta este valor claramente: "**Valor Estimado por Mercado: $XXX.XXX.XXX**"

   **B) Valor Base del Lote Ajustado:**

   - Ajusta el valor de mercado por características específicas (ubicación, topografía, servicios)
   - Precio por m² ajustado × ${area || 'área'} m² = **Valor Base del Lote**

   **C) Valor de Construcciones (Si existen):**

   - Si el lote tiene construcciones, valóralas por separado (ver sección 3. AJUSTES APLICADOS)
   - Suma el valor de cada construcción al valor base del lote

   **USO DE MUNICIPIOS VECINOS TURÍSTICOS (zona_similar / zona_extendida):**

   - Cuando uses **municipios vecinos turísticos** como comparables:
     - Explica brevemente si su nivel de precios y proyección es **similar, superior o inferior** al de ${formData.municipio}.
     - Ajusta y comenta si los precios/m² de esos municipios se están tomando **como referencia directa** o si se están **ajustando al contexto de ${formData.municipio}** (por ejemplo: “Salento tiene valores ligeramente inferiores/similares, por lo que se usa como referencia razonable para Filandia”).


## 3. AJUSTES APLICADOS

   **OBLIGATORIO** Usar negritas para destacar información relevante del informe, subtitulos, palabras, datos, cifras, etc.
   **IMPORTANTE:** Solo si el lote tiene construcciones (mencionadas en NOTAS ADICIONALES), debes valorarlas por separado:

### 3.1. Valor Base del Lote (Sin Construcciones)

   - Calcula el valor del terreno usando comparables de **lotes vacíos** similares
   - Precio/m² base × área total del lote = Valor Base

### 3.2. Ajustes Generales

   Explica brevemente ajustes por ubicación,servicios, topografía.

### 3.3. Valor de Construcciones Existentes (Si Aplica)

   **IMPORTANTE:** Asegúrate de incluir **TODAS** las construcciones mencionadas en las NOTAS ADICIONALES. No omitas ninguna.

Para CADA construcción mencionada:

1. Identifica tipo, área y estado
2. Busca precio/m² de construcciones similares en la zona
3. Aplica depreciación (Excelente 1.0, Bueno 0.8, Regular 0.6, Requiere reformas 0.4)
4. Calcula: Precio/m² × Área × Factor

**IMPORTANTE - VALORACIÓN DE PARQUEADEROS:**
   
   **Si uso comercial/turístico (genera ingresos):**
   - Busca tarifas de parqueaderos públicos en ${formData.municipio || formData.departamento} o en Colombia.
   - Calcula: (Carros × Tarifa día × Ocupación × 30) / Yield mensual
   - Presenta tabla con: Carros, Tarifa diaria, Ocupación, Ingreso mensual, Yield, Valor final
   - Verifica si el valor del parqueadero supera el valor de las construcciones, haz un ajuste proporcional que equilibre los valores y explícalo.
   
   **Si uso residencial:**
   - Busca costo de construcción de parqueaderos/exteriores en Camacol o DANE para ${formData.departamento}
   - Calcula: Área (carros × 15-20 m²) × Costo/m²
   - Presenta tabla con: Área, Costo/m², Valor final
   
   **Explicar al usuario:** "El valor del parqueadero se calcula por su capacidad de generar ingresos. Si es de uso privado o no hay datos de tarifas, se valora por costo de construcción. Usted puede ajustar estos valores según las tarifas reales de su zona."

   **AJUSTE TOTAL CONSTRUCCIONES: +$XXX.XXX**

   **REGLAS DE CONSISTENCIA PARA CONSTRUCCIONES Y PARQUEADEROS:**

   - Compara siempre el **valor total de construcciones + parqueaderos** contra el **valor del terreno (Valor Base Lote)**:
     - Si el cálculo inicial de construcciones/parqueaderos supera el valor del terreno, revisa y ajusta los supuestos (precios/m², yields, ocupación) y explica el ajuste en el texto.


### 3.4. VALOR ESTIMADO TOTAL

   Valor Base Lote: $XXX.XXX.XXX
   + Construcciones: $XXX.XXX.XXX  
   + Otros: $XXX.XXX.XXX
   = **TOTAL: $XXX.XXX.XXX**

## 4. RESULTADOS FINALES

   **Valor Recomendado de Venta:** $XXX.XXX.XXX
   
   **Rango sugerido:** $XXX.XXX.XXX - $XXX.XXX.XXX
   
   **Precio por m² final usado:** $XXX.XXX.XXX
   
   **Posición en el mercado (liquidez):**

## 5. LIMITACIONES

Menciona escasez de datos, dependencias de promedios o zonas similares.

## 6. RESUMEN EJECUTIVO

   2-3 párrafos con valor recomendado, rango y estrategia de venta.
   INCLUYE la frase final obligatoria (ver punto 4 en instrucciones).

## 7. TRANSPARENCIA DE DATOS

   Crea un parrafo argumentativo respondiendo esto:
   ¿TODOS LOS RESULTADOS QUE HAS ENVIADO SON REALES?
   ¿Por qué algunos enlaces no muestran la propiedad que mencionas?
   ¿Por que un resultado es diferente al anterior?
   **NO PREGUNTES NADA ADICIONAL, NI MENCIONES LAS PREGUNTAS.** Es un mensaje orientativo de la calidad de datos. 

**RECORDATORIO CRÍTICO:**
- Este es un REPORTE FINAL, no una conversación.
- NO ofrezcas actualizaciones, ampliaciones ni solicites más datos.
- NO uses frases como "Si desea, puedo...", "Puedo actualizar...", "Obtener medición exacta..."
- Entrega SOLO el análisis completo basado en los datos disponibles.

    `.trim();

    // --- SECCIÓN ESPECÍFICA: PROPIEDADES ---
    const seccionPropiedades = `
═══════════════════════════════════════════════════════════
INSTRUCCIONES PARA PROPIEDADES (Apartamentos/Casas)
═══════════════════════════════════════════════════════════

**1. BÚSQUEDA DE COMPARABLES:**

   Busca 25+ propiedades comparables combinando venta, arriendo y otros barrios (ubicaciones):

   Si no encuentras parqueadero, antigüedad, piso, estrato, niveles, baños o habitaciones, igual incluye el anuncio siempre que tenga precio y ubicación útiles para el análisis. En esos campos, escribe N/R en lugar de inventar datos.

   **PROHIBIDO:**
   - Listar en un solo ítem un promedio o un listado. Ejemplo: "Casas promedio Mosquera estrato 3"; "Varios anuncios listados en buscadores", "Listado de casas en venta"
   - Arriendos "estimados", "típicos" o "basados en promedios de mercado"; ejemplo: "Canon mensual típico zona, basado en promedios"

🔍 **BÚSQUEDAS OBLIGATORIAS (hacer las 6):**
   1. "${formData.tipo_inmueble} venta ${formData.barrio} ${formData.municipio}" → coincidencia
   2. "${formData.tipo_inmueble} arriendo ${formData.barrio} ${formData.municipio}" → coincidencia
   3. "${formData.tipo_inmueble} venta ${formData.municipio}" → zona_similar (otros barrios)
   4. "${formData.tipo_inmueble} arriendo ${formData.municipio}" → zona_similar (otros barrios)
   5. "${formData.tipo_inmueble} venta" + municipios vecinos → zona_extendida
   6. "${formData.tipo_inmueble} arriendo" + municipios vecinos → zona_extendida

   **OBLIGATORIO (con flexibilidad razonable):**

   - Busca comparables en al menos **5 portales inmobiliarios** diferentes (por ejemplo: Fincaraíz, Metrocuadrado, Ciencuadras, MercadoLibre, Properati u otros similares).
   - El reporte debe incluir **como mínimo 5 propiedades en arriendo** (con canon publicado), sin importar si son de:
     - coincidencia (mismo barrio/conjunto), zona_similar (otros barrios del mismo municipio) o zona_extendida (municipios vecinos).
   - Además, el reporte debe incluir **al menos 10 propiedades adicionales** (venta o arriendo) ubicadas en **zona_similar o zona_extendida**, de forma que en total haya **por lo menos 15 propiedades** entre:
     - arriendos de cualquier zona (coincidencia / similar / extendida),
     - y ventas de zona_similar o zona_extendida.

   - En todos los casos, cada propiedad listada debe corresponder a un **anuncio individual real**, con **URL propia del anuncio o del listado filtrado donde aparece** y **precio publicado**; no uses listados agregados ni resultados de búsqueda generales.

   
   **REGLA DE TIPO:** Busca SOLO **${formData.tipo_inmueble === 'casa' ? 'casas' : 'apartamentos'}**. NO mezcles tipos de inmueble.
   
   ⚠️ RESTRICCIÓN DE ÁREA (con expansión automática):
   - Primero, intenta usar solo propiedades entre ${rangoAreaMin} y ${rangoAreaMax} m².
   - Si después de aplicar todas las búsquedas y filtros tienes menos de 25 comparables, activa la EXPANSIÓN AUTOMÁTICA DE ÁREA:
      - Propiedades <100 m²: permite hasta ±60 m² adicionales.
      - Propiedades ≥100 m²: permite hasta ±100 m² adicionales.
   - Siempre que incluyas propiedades fuera del rango inicial, indícalo brevemente en la nota del comparable.

   **FILTRO DE PRECIO:**
   - VENTAS: Si precio/m² desvía >40% de la mediana, NO LO LISTES
   - ARRIENDOS: Si canon/m² desvía >40% de la mediana, NO LO LISTES

   **EXCLUSIÓN AUTOMÁTICA POR PALABRAS CLAVE:**
   ANTES de incluir cualquier comparable, verifica que el título/descripción 
   NO contenga estas palabras (excluir inmediatamente si las tiene):
   - "remate", "adjudicación", "subasta", "judicial"
   - "oportunidad única", "urgente", "por deuda", "embargo"
   - "permuta", "cesión de derechos"
   - "VIS", "VIP", "interés social", "interés prioritario"
   
   ⚠️ **REGLA DE DISTANCIA (CRÍTICA):**
   - Si la distancia es **<=3km** → SIEMPRE es **coincidencia**
   - Si la distancia es **>3km y <=7km** → es **zona_similar**
   - Si la distancia es **>7km pero <40km** → es **zona_extendida**
   - **NUNCA** etiquetes como zona_extendida algo que esté a <=7km
   
 🌐 VERIFICACIÓN MULTI-PORTAL (OBLIGATORIA):
   Busca comparables en múltiples portales inmobiliarios, incluyendo AL MENOS los siguientes siempre que tengan resultados útiles para el caso:

   - ✅ Fincaraíz (fincaraiz.com.co)
   - ✅ Metrocuadrado (metrocuadrado.com)
   - ✅ Ciencuadras (ciencuadras.com)
   - ✅ MercadoLibre (mercadolibre.com.co)
   - ✅ Properati (properati.com.co)

   Si alguno de estos portales no tiene anuncios relevantes para la zona o el tipo de inmueble, puedes usar otros portales inmobiliarios similares (con anuncios reales y precio publicado) y mencionarlos claramente como fuente.

   🏆 **BONUS POR MUESTRA ABUNDANTE:**

   Si logras encontrar 30+ comparables:
   - Aumenta la confianza del análisis explícitamente
   - Menciona en RESUMEN EJECUTIVO: "Análisis basado en muestra robusta de X comparables"

   📋 **REGISTRO DE COMPARABLES DESCARTADOS:**

   En la sección "LIMITACIONES", reporta:
   - "Comparables encontrados: X"
   - "Comparables descartados: Y (razones: Z por área fuera de rango, W por precio outlier, etc.)"
   - "Comparables incluidos en análisis: X - Y = TOTAL"

**2. MÉTODO DE RENTABILIDAD:**
   
   **Canon Mensual:** Calcula precio arriendo/m² de cada arriendo, promedia, multiplica por el área del objeto.
   
   **Yield del Mercado:** Busca el yield real de ${formData.municipio || 'la zona'}. Si no encuentras datos específicos, usa 0.4%-0.6% mensual según el perfil de la zona.
   
   **IMPORTANTE:** Escribe: "**Yield promedio mercado: 0.XX%**"
   
   **Valoración:** Valor = Canon Mensual / Yield mensual

═══════════════════════════════════════════════════════════
FORMATO DE ENTREGA PARA PROPIEDADES **OBLIGATORIO SEGUIR FORMATO Y SECCIONES**
═══════════════════════════════════════════════════════════

## 1. BÚSQUEDA Y SELECCIÓN DE COMPARABLES

    Describe brevemente la propiedad del cálculo y haz una introduccion general de las propiedades listadas.
    
    🚫 **PROHIBIDO:**
    - NO uses numeración (1), 2), 3)...)
    - NO uses rangos de área "65-90 m²" - usa valor EXACTO
    - NO uses precios indefinidos "$?" - si no hay precio, NO incluyas el comparable
    - NO uses etiquetas mixtas "zona_similar / zona_extendida" - usa SOLO UNA

    **FORMATO DE LISTADO (COPIAR EXACTAMENTE):**
    
    **Título exacto del anuncio del portal**
    Tipo | Venta o Arriendo | $Precio
    Área: XX m² | X hab | X baños | X Niveles
    Barrio | Ciudad
    **[Portal](URL cruda de la ficha o del listado donde aparece el anuncio)** etiqueta
    **Nota:** Distancia: X km. [Justificación breve]

    **EJEMPLO CORRECTO de coincidencia:**
    **Casa moderna 65m2 remodelada Las Villas**
    Casa | Venta | $320.000.000
    Área: 65 m² | 3 hab | 2 baños | 2 Niveles
    Las Villas | Mosquera
    **[Fincaraíz](url cruda de la ficha o del listado donde aparece el anuncio)** coincidencia
    **Nota:** Distancia: 0.3 km. Mismo barrio del inmueble objeto.

    **EJEMPLO CORRECTO de zona_similar:**
    **Apartamento remodelado sector centro 60m2**
    Apartamento | Arriendo | $1.200.000
    Área: 60 m² | 2 hab | 2 baños | Piso 3
    Centro | Mosquera
    **[Metrocuadrado](url cruda de la ficha o del listado donde aparece el anuncio)** zona_similar
    **Nota:** Distancia: 5 km. Barrio del mismo municipio entre 3km y 7km.

    **EJEMPLO CORRECTO de zona_extendida:**
    **Casa esquinera cerca parque Funza**
    Casa | Venta | $350.000.000
    Área: 70 m² | 3 hab | 2 baños | 2 Niveles
    Centro | Funza
    **[Ciencuadras](url cruda de la ficha o del listado donde aparece el anuncio)** zona_extendida
    **Nota:** Distancia: 8 km. Municipio vecino con condiciones socioeconómicas similares.

## 2. ANÁLISIS DEL VALOR

   **SELECCIÓN DE COMPARABLES PARA CÁLCULO:**
   De los comparables listados arriba, selecciona los **mejores matches** para realizar los cálculos.
   Descarta explícitamente los comparables con características muy diferentes al inmueble objeto (PRIORIZA: precio fuera de rango).
   Escribe un párrafo indicando:
   - Cuántos comparables usas para el cálculo (separados por venta y arriendo)
   - Por qué descartaste los demás

   ### 2.1. Método de Venta Directa (Precio por m²)
   - Calcula la **MEDIANA** del precio por m² de los comparables de venta seleccionados.
   - Indica el valor por m² FINAL (ajustado).
   - Calcula: Precio por m² final × ${area || 'área'} m².

   ### 2.2. Método de Rentabilidad (Yield Mensual)
   - Sigue los 3 pasos descritos arriba.
   - Muestra el yield encontrado con formato exacto.

## 3. AJUSTES APLICADOS
   
   Explica cada ajuste aplicado, cómo se usó y por qué.
   Separa por lineas para que se lea mejor. 

   **EJEMPLO:**
    - **Ajuste por ubicación:** +x% zona de alta demanda
    - **Ajuste por estado:** +x% Requiere inversión en mejoras entre $X.XXX.XXX y $X.XXX.XXX, se estimó un valor intermedio de $X.XXX.XXX aplicando un ajuste de +x%
    - **Ajuste por antigüedad:** -x% (fuente: Camacol)
    - **Factor total:** 0.85 (equivalente a -x%). 
    - **Precio/m² ajustado venta:** $3.545.455 × 0.85 = $3.013.637. 
    - **Valor total ajustado:** $3.013.637/m² × 60 m² = $180.818.220. 
    - **Yield ajustado similar (-15%):** $170.003.400. 

   **AJUSTE POR CONTEXTO (si aplica):**
   Si el objeto está en barrio abierto y los comparables incluyen conjuntos cerrados:
   - Investiga la diferencia de precio típica entre conjuntos y barrios abiertos en ${formData.municipio}
   - Aplica ajuste NEGATIVO al valor (conjuntos suelen valer más que barrios abiertos)
   
   Si el objeto está en conjunto cerrado y los comparables incluyen barrios abiertos:
   - Investiga la diferencia de precio típica entre conjuntos y barrios abiertos en ${formData.municipio}
   - Aplica ajuste POSITIVO al valor

   **OTROS AJUSTES (COMPARATIVOS):**

   - Comparando propiedades con ÁREA TOTAL similar:
     - MENOS niveles que los comparables → espacios más amplios por nivel → posible ajuste POSITIVO.
     - MÁS niveles que los comparables → espacios más fragmentados por nivel → posible ajuste NEGATIVO.
     Validar siempre con evidencia de mercado.

   - En apartamentos:
     - Piso superior al de los comparables → posible ajuste POSITIVO si el mercado valora altura, vista o menor ruido.
     - Piso inferior al de los comparables → posible ajuste NEGATIVO si el mercado penaliza iluminación, ruido o seguridad.

   - Validar siempre con evidencia de mercado.

   **REGLAS ESPECIALES PARA EL YIELD AJUSTADO:**

   - Siempre que menciones **“Yield ajustado”**, debes explicar claramente:
     - cuál es el **valor de rentabilidad base** usado (por ejemplo, el valor obtenido al dividir el canon mensual estimado entre el yield del mercado),
     - qué **factor o porcentaje de ajuste total** estás aplicando (por ejemplo, el mismo factor por ubicación, estado y antigüedad),
     - y mostrar la **operación numérica completa** en una sola línea.
     - Ejemplo de estilo (NO lo copies literal): “Yield ajustado: $XXX.XXX.XXX × 0,XX (mismo factor total de ajustes) = $XXX.XXX.XXX”.

   - Evita frases como “Yield ajustado (-X%)” sin mostrar la fórmula ni explicar por qué se aplica ese porcentaje al valor de rentabilidad.


## 4. RESULTADOS FINALES

   - **Valor Recomendado de Venta:** $XXX.XXX.XXX
   - **Rango sugerido:** $XXX.XXX.XXX - $XXX.XXX.XXX
   - **Precio por m² final:** $XXX.XXX.XXX
   - **Posición en mercado:**

   **REGLAS DE EXPLICACIÓN DE MÉTODOS:**

   - Si combinas el resultado del **método de venta directa** con el **método de rentabilidad**:
     - Explica con palabras cómo se hace la ponderación (por ejemplo: “se dio mayor peso al valor por venta directa y menor peso al valor por rentabilidad debido a la calidad de los comparables de venta”).
     - Muestra también el **cálculo numérico final** indicando los porcentajes usados y los valores de cada método.
     - Ejemplo de estilo (solo ilustrativo): “Valor ponderado = 0,60 × Valor venta + 0,40 × Valor rentabilidad = $XXX.XXX.XXX” (los porcentajes son solo ilustrativos).

   - **No uses una fórmula fija de la forma** Valor ponderado = 0,7 × Valor venta + 0, 3 × Valor rentabilidad.
   - Ajusta los porcentajes según el contexto del caso (calidad y cantidad de comparables de venta vs arriendo) y explícitalos en el texto cuando los uses.


## 5. LIMITACIONES

   Menciona escasez de datos o dependencias.

## 6. RESUMEN EJECUTIVO

   2-3 párrafos con valor recomendado (ponderando venta + rentabilidad), rango y estrategia.

## 7. TRANSPARENCIA DE DATOS

   Crea un parrafo argumentativo respondiendo esto:
   ¿TODOS LOS RESULTADOS QUE HAS ENVIADO SON REALES?
   ¿Por qué algunos enlaces no muestran la propiedad que mencionas?
   ¿Por que un resultado es diferente al anterior?
   **NO PREGUNTES NADA ADICIONAL, NI MENCIONES LAS PREGUNTAS.** Es un mensaje orientativo de la calidad de datos. 

**RECORDATORIO CRÍTICO:**
- Este es un REPORTE FINAL, no una conversación.
- NO ofrezcas actualizaciones, ampliaciones ni solicites más datos.
- NO uses frases como "Si desea, puedo...", "Puedo actualizar...", "Obtener medición exacta..."
- Entrega SOLO el análisis completo basado en los datos disponibles.

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

        // --- PERFORMANCE TRACKING ---
        const perfStart = Date.now();
        let t1, t2, t3, t4, t5, t6;
        console.log('⏱️ [PERF] Inicio análisis:', new Date().toISOString());

        // --- 1. PREPARACIÓN DE DATOS ---
        const tipoInmueble = (formData.tipo_inmueble || 'inmueble').toLowerCase();
        const esLote = tipoInmueble === 'lote';
        const usoLote = formData.uso_lote || 'residencial';
        const ubicacion = `${formData.barrio || ''}, ${formData.municipio || ''}`.trim();

        let areaBase = parseInt(formData.area_construida);
        if (!Number.isFinite(areaBase) || areaBase <= 0) areaBase = 60;
        const area = areaBase;

        // --- CONSTRUCCIÓN DEL PROMPT ---
        const perplexityPrompt = construirPromptPerplexity(formData, area, esLote, usoLote, ubicacion);

        // --- 2. LLAMADA A PERPLEXITY ---
        let perplexityContent = '';
        let citations = [];

        t1 = Date.now();
        console.log('⏱️ [PERF] Iniciando llamada Perplexity...');

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
                    max_tokens: 8000, // Aumentado para evitar cortes en análisis de lotes con construcciones
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

            t2 = Date.now();
            console.log(`⏱️ [PERF] Perplexity completado en ${((t2 - t1) / 1000).toFixed(2)}s | Fuentes: ${citations.length}`);
            console.log(`📄 [PERPLEXITY] Respuesta completa:\n${perplexityContent}`);

        } catch (e) {
            return new Response(
                JSON.stringify({ error: 'Error conexión Perplexity', details: e.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // --- 3. EXTRACCIÓN ESTRUCTURADA CON DEEPSEEK ---
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
   
   EJEMPLO Lote:
   **Lote Urbano Esquinero**
   Lote | Venta | $180.000.000
   Área: 2000 m² | Uso: Residencial
   Filandia | Quindío
   **[Metrocuadrado](url cruda de la ficha o del listado donde aparece el anuncio)** zona_similar
   **Nota:** Distancia: 18 km. Municipio vecino con vocación turística similar.
   
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

3. "yield_zona": ${esLote ? 'IGNORAR (Devolver null)' : 'Busca la frase exacta "Yield promedio mercado: X.XX%" en el texto. Extrae SOLO el número como decimal (ej: si dice "0.5%", devuelve 0.005).'}

4. "valor_venta_directa": ${esLote
                ? 'Busca "**Valor Estimado por Mercado: $XXX.XXX.XXX**" en la sección 2.1. Si no encuentra, busca "**Valor total = $XXX.XXX.XXX**".'
                : 'Busca "**Valor total = $XXX.XXX.XXX**".'
            }
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

        t3 = Date.now();
        console.log('⏱️ [PERF] Iniciando extracción DeepSeek...');

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

            content = content.trim();
            if (content.startsWith('```')) {
                const match = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
                if (match && match[1]) content = match[1].trim();
            }

            extractedData = JSON.parse(content);
            if (!extractedData || typeof extractedData !== 'object') extractedData = {};

            t4 = Date.now();
            console.log(`⏱️ [PERF] DeepSeek completado en ${((t4 - t3) / 1000).toFixed(2)}s`);

        } catch (e) {
            return new Response(
                JSON.stringify({ error: 'Error Parseo DeepSeek', details: e.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
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

            t5 = Date.now();
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

            console.log(`✓ Procesando ${finalComparablesRaw.length} comparables analizados por Perplexity (sin filtro de área)`);

            // Procesamiento de cada comparable
            const comparables = finalComparablesRaw
                .map((c) => {
                    const areaComp = sanitizeFloat(c.area);
                    const precioLista = sanitizePrice(c.precio_lista);
                    const esArriendo = c.tipo_operacion && typeof c.tipo_operacion === 'string' && c.tipo_operacion.toLowerCase().includes('arriendo');

                    if (esLote && esArriendo) return null;

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
                return new Response(
                    JSON.stringify({
                        error: 'Datos insuficientes',
                        details: `Solo se encontraron ${comparables.length} comparables válidos.`,
                        perplexity_full_text: perplexityContent,
                    }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
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

            if (!esLote) {
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
            }

            // PASO F: Valor Final (CÁLCULO SSOT EN WORKER)
            // Aquí imponemos la matemática estricta sobre los componentes confiables
            let valorCalculadoWorker = 0;
            if (esLote) {
                // Para lotes, usar el valor recomendado de Perplexity que incluye construcciones
                const valorRecomendadoPerplexity = sanitizePrice(extractedData.valor_recomendado_venta);
                if (valorRecomendadoPerplexity && valorRecomendadoPerplexity > 0) {
                    valorCalculadoWorker = valorRecomendadoPerplexity;
                    console.log(`✓ Usando Valor Recomendado Perplexity para lote: ${valorCalculadoWorker.toLocaleString()} (incluye construcciones)`);
                } else {
                    // Fallback al valor de mercado si Perplexity no dio valor recomendado
                    valorCalculadoWorker = valorVentaDirecta;
                    console.log(`⚠️ Fallback: Usando solo valor de mercado para lote: ${valorCalculadoWorker.toLocaleString()}`);
                }
            } else {
                // Para propiedades, PRIMERO intentar usar el Valor Recomendado de Perplexity
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
                    ficha_tecnica_defaults: esLote ? {
                        uso_lote: 'No especificado'
                    } : {
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

            // CÁLCULO DE NIVEL DE CONFIANZA V2
            console.assert(typeof esLote === 'boolean', 'esLote debe estar definido');

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
            if (esLote && totalZonasSimilares >= 4 && totalVerificados >= 2 && total >= 7) {
                if (nivelConfianzaCalc === 'Bajo') {
                    nivelConfianzaCalc = 'Medio';
                    console.log('↑ Ajuste lotes: Bajo → Medio (buena cobertura regional)');
                }
            }

            if (!esLote && totalVerificados >= 5 && totalZonasSimilares === 0 && total >= 6) {
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
                ficha_tecnica_defaults: esLote ? {
                    uso_lote: 'No especificado'
                } : {
                    habitaciones: 'No especificado',
                    banos: 'No especificado',
                    garajes: 'No especificado',
                    estrato: 'No especificado',
                    antiguedad: 'No especificado'
                },
                yield_mensual_mercado: esLote ? null : yieldFinal,
                yield_fuente: esLote ? null : yieldFuente,
                canon_estimado: esLote ? null : canonPromedio,
                area_construida: area,
                uso_lote: usoLote,
                perplexity_full_text: finalPerplexityText
            };

            t6 = Date.now();
            const perfEnd = Date.now();
            const perfTotal = ((perfEnd - perfStart) / 1000).toFixed(2);
            const perfPerplexity = ((t2 - t1) / 1000).toFixed(1);
            const perfDeepSeek = ((t4 - t3) / 1000).toFixed(1);
            const perfProcessing = ((t6 - t5) / 1000).toFixed(1);

            console.log(`⏱️ [PERF] ============================================`);
            console.log(`⏱️ [PERF] TOTAL: ${perfTotal}s`);
            console.log(`⏱️ [PERF] Desglose:`);
            console.log(`⏱️ [PERF]   - Perplexity: ${perfPerplexity}s`);
            console.log(`⏱️ [PERF]   - DeepSeek: ${perfDeepSeek}s`);
            console.log(`⏱️ [PERF]   - Processing: ${perfProcessing}s`);
            console.log(`⏱️ [PERF] ============================================`);

            return new Response(JSON.stringify(resultado), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });

        } catch (processingError) {
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