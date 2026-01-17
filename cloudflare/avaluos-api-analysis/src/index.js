/**
 * avaluos-api-analysis V14 (You.com + OpenAI Migration)
 * - Búsqueda: You.com Agent
 * - Verificación: You Contents API (ydc-index.io)
 * - Análisis: OpenAI gpt-4o
 * - Extracción JSON: OpenAI gpt-4o-mini
 * - Base: V13 (Dynamic Area Filters, Confidence V2, IQR Filter)
 */
import { z } from 'zod';
import Firecrawl from '@mendable/firecrawl-js';

// --- HELPER: Statistical Calculations ---
function calculateMean(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateStdDev(values, mean) {
    if (!values || values.length < 2) return 0;
    const squareDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquareDiff = calculateMean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
}

// --- HELPER: Email HTML Generator (Simplified for Worker) ---
function generateSimpleEmailHtml(data) {
    const formatCurrency = (val) => val ? '$ ' + Math.round(val).toLocaleString('es-CO') : '—';
    const toTitleCase = (str) => {
        if (!str) return '';
        const smallWords = ['y', 'de', 'en', 'a', 'o', 'la', 'el', 'del', 'un', 'una', 'para', 'por', 'con', 'sin'];
        return str.toLowerCase().split(' ').map((word, index) => {
            if (index === 0 || !smallWords.includes(word)) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            return word;
        }).join(' ');
    };

    const valorFinal = data.valor_final || data.valor_estimado_venta_directa || 0;
    const rangoMin = data.rango_valor_min || 0;
    const rangoMax = data.rango_valor_max || 0;
    const totalComparables = data.total_comparables || 0;
    const codigoAvaluo = data.codigo_avaluo || 'N/A';
    const avaluoId = data.id || '';

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; line-height: 1.6; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; overflow: hidden; font-size: 14px; }
    .hero { background-color: #2C3D37; color: white; padding: 30px 25px; border-radius: 0 0 15px 15px; }
    .hero-value { font-size: 36px; font-weight: bold; line-height: 1; margin: 15px 0 5px 0; }
    .hero-details { background: rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin-top: 25px; }
    .content { padding: 30px 25px; }
    .cta-button { background-color: #C9C19D; text-align: center; padding: 18px 20px; }
    .btn { background: #2C3D37; color: white; padding: 14px 35px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; }
    .footer-dark { background-color: #2C3D37; padding: 30px 20px; text-align: center; color: #8FA396; font-size: 11px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="cta-button">
      <a href="https://avaluos.quetzalhabitats.com/resultados/${avaluoId}" class="btn">📊 Ver Tu Avalúo Completo</a>
    </div>
    
    <div class="hero">
      <div style="font-size:24px; font-weight:bold;">🏠 Valor Comercial</div>
      <div style="font-size:12px; opacity:0.8; margin-top:4px;">Estimación de Inteligencia Inmobiliaria</div>
      
      <div class="hero-value">${formatCurrency(valorFinal)}</div>
      <div style="font-size:12px; opacity:0.8;">COP (Pesos Colombianos)</div>
      
      <div class="hero-details">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="color:#D3DDD6; font-size:12px; padding-bottom:8px;">Rango Sugerido</td>
            <td align="right" style="color:white; font-weight:bold; font-size:12px; padding-bottom:8px;">${formatCurrency(rangoMin)} - ${formatCurrency(rangoMax)}</td>
          </tr>
          <tr>
            <td style="color:#D3DDD6; font-size:12px;">Muestra de Mercado</td>
            <td align="right" style="color:white; font-weight:bold; font-size:12px;">${totalComparables} inmuebles</td>
          </tr>
        </table>
      </div>
    </div>
    
    <div class="content">
      <p>Hola,</p>
      <p>Tu reporte de avalúo para <strong>${toTitleCase(data.tipo_inmueble || 'Inmueble')}</strong> en <strong>${toTitleCase(data.barrio || data.municipio || 'Colombia')}</strong> está listo.</p>
      
      <div style="background: #FFF8E1; border: 1px solid #FCD34D; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 12px; color: #92400e;">
          <strong>Nota importante:</strong> Este reporte es una estimación de mercado de carácter orientativo, por tanto, no tiene validez para trámites legales, h ipotecarios o transaccionales.
        </p>
      </div>
      
      <div style="background-color: #F0F2F1; padding: 25px; text-align: center; border-radius: 10px; margin-top: 30px;">
        <div style="font-size: 16px; font-weight: bold; color: #2C3D37; margin-bottom: 10px;">¿Necesitas vender este inmueble?</div>
        <div style="font-size: 13px; color: #4F5B55; margin-bottom: 20px;">En Quetzal Hábitats conectamos tu propiedad con los clientes adecuados.</div>
        <a href="https://wa.me/573186383809" style="background-color: #2C3D37; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; font-size: 14px;">Contactar Asesor</a>
      </div>
    </div>

    <div class="footer-dark">
      <img src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png" alt="Quetzal" style="height: 40px; margin-bottom: 15px;">
      <p style="color: #8FA396; margin: 5px 0;">© 2025 Quetzal Hábitats - Todos los derechos reservados</p>
      <p style="color: #5A6D66; margin: 5px 0;">Código: ${codigoAvaluo}</p>
    </div>
  </div>
</body>
</html>`;
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

// --- HELPER: Mapear estado_inmueble a etiqueta legible ---
function mapearEstado(estado) {
    const mapa = {
        'nuevo': 'Nuevo',
        'remodelado': 'Remodelado',
        'buen_estado': 'Buen Estado',
        'requiere_reformas_ligeras': 'Requiere Reformas Ligeras',
        'requiere_reformas_moderadas': 'Requiere Reformas Moderadas',
        'requiere_reformas_amplias': 'Requiere Reformas Amplias',
        'requiere_reformas_superiores': 'Requiere Reformas Superiores',
        'obra_gris': 'Obra Gris'
    };
    return mapa[estado] || (estado ? estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'No especificado');
}

// --- GLOBAL STATE: Jobs en memoria para polling ---
const jobs = new Map();

// --- HELPER: Construcción Dinámica de Prompt para Análisis ---
function construirPromptAnalisis(formData, area, agentContext = '') {
    // --- INFORMACIÓN DEL INMUEBLE ---
    const infoInmueble = `
- Tipo: ${formData.tipo_inmueble || 'inmueble'}
- Barrio: ${formData.barrio || 'No indicado'}
- Municipio: ${formData.municipio || 'No indicado'}
${formData.departamento ? `- Departamento: ${formData.departamento}` : ''}
- Tipo de Urbanización: ${formData.contexto_zona === 'conjunto_cerrado' ? 'Conjunto Cerrado' : 'No es Conjunto Cerrado'}
${formData.nombre_conjunto ? `- Conjunto/Edificio: ${formData.nombre_conjunto}` : ''}
- Habitaciones: ${formData.habitaciones || 'N/A'}
- Baños: ${formData.banos || 'N/A'}
${formData.tipo_inmueble === 'apartamento' && formData.piso ? `- Piso: ${formData.piso}` : ''}
${formData.tipo_inmueble === 'apartamento' && formData.ascensor ? `- Ascensor: ${formData.ascensor === 'si' ? 'Sí' : 'No'}` : ''}
${formData.tipo_inmueble === 'casa' && formData.numeropisos ? `- Niveles de la casa: ${formData.numeropisos}` : ''}
- Parqueadero: ${formData.tipo_parqueadero || 'No indicado'}
- Antigüedad: ${formData.antiguedad || 'No indicada'}
${formData.estrato ? `- Estrato: ${formData.estrato}` : ''}
- Estado: ${mapearEstado(formData.estado_inmueble)}
${formData.tipo_remodelacion ? `- Remodelación: ${formData.tipo_remodelacion.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}` : ''}
${formData.descripcion_mejoras ? `- Mejoras: ${formData.descripcion_mejoras}` : ''}
${formData.informacion_complementaria ? `- NOTAS ADICIONALES: ${formData.informacion_complementaria}` : ''}
- ÁREA CONSTRUIDA: ${area || '?'} m²
    `.trim();

    // Rangos de área para filtros (Sincronizado con Nueva Estrategia del Agente)
    const rangoAreaMin = Math.round(area * 0.70);  // Estándar Agente: 70%
    const rangoAreaMax = Math.round(area * 1.30);  // Estándar Agente: 130%
    const rangoExtendidoMin = Math.round(area * 0.50); // Fallback Agente: 50%
    const rangoExtendidoMax = Math.round(area * 1.50); // Fallback Agente: 150%

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

═══════════════════════════════════════════════════════════
INFORMACIÓN DE MERCADO (DE AGENTE EXPERTO)
═══════════════════════════════════════════════════════════
El buscador experto ha recolectado y analizado la web para encontrar los siguientes comparables y datos de mercado. 
ANALIZA esta información tal cual se presenta (incluyendo tablas y resúmenes) para realizar tu avalúo:

${agentContext}

═══════════════════════════════════════════════════════════
INSTRUCCIONES CRÍTICAS (NO VIOLABLES)
═══════════════════════════════════════════════════════════

**ETIQUETAS DE UBICACIÓN (ANÁLISIS DE PROXIMIDAD)**
Es TU RESPONSABILIDAD verificar, asignar o corregir la etiqueta de ubicación a cada comparable basándote en el Barrio y Ciudad proporcionados, comparándolos con la ubicación del inmueble objetivo:

✓ **coincidencia**: mismo barrio o sector inmediatamente adyacente (≤2 km)
→ **zona_similar**: barrios cercanos con características socioeconómicas similares o mismo municipio (2–5 km)
≈ **zona_extendida**: mismo municipio o departamento, pero con dinámica de mercado diferente (5–12 km)

**CONTEXTO Y AJUSTES (NOTAS DEL INMUEBLE)**
Utiliza MANDATORIAMENTE la información del campo **NOTAS / Información Complementaria**.
Si se mencionan remodelaciones, acabados, vistas, problemas o condiciones especiales, DEBEN reflejarse en el análisis y en los ajustes.

**FILTROS DE CALIDAD (OBLIGATORIO)**
- Rango preferencial de área: ${rangoAreaMin} m² – ${rangoAreaMax} m²
- Rango extendido aceptable: ${rangoExtendidoMin} m² – ${rangoExtendidoMax} m²
- Las propiedades fuera del rango extendido NO deben listarse.

**OBLIGATORIO:**
- USA negritas para destacar datos importantes: cifras, palabras, etc.
- 

═══════════════════════════════════════════════════════════
**FORMATO DE SALIDA OBLIGATORIO**
═══════════════════════════════════════════════════════════

## **PRESENTACION DE COMPARABLES**
   Presenta aqui el listado de comparables.
   - Lista todos los comparables que cumplan con los filtros de calidad.
   - NUNCA incluyas comparables sin precio o área.
   - NUNCA incluyas comparables duplicados. Si tienen mismo precio, area, barrio, entonces son el mismo comparable. Así tengan diferente URL.

   **LISTADO DE COMPARABLES (FORMATO OBLIGATORIO)**
   - Crea tu propia numeración secuencial (1, 2, 3…).
   - Idealmente debes tener al menos 5 comparables en arriendo y 5 en venta para el cálculo.

   **FORMATO OBLIGATORIO POR COMPARABLE:**

   NO USES VIÑETAS O GUIONES, USALO TAL CUAL SE PRESENTA:

   **Título exacto del anuncio del portal**
   Tipo | Venta o Arriendo | $Precio
   Área: XX m² | X hab | X baños | X niveles
   Barrio | Ciudad
   **[Portal](URL cruda)** ETIQUETA (coincidencia / zona_similar / zona_extendida)
   **Nota:** Distancia aproximada y justificación breve

## 1 DESCRIPCION DE LA PROPIEDAD
Describe brevemente la propiedad objetivo, menciona cuantos comparables hay en la lista.

## 2. ANÁLISIS DEL VALOR

   - **Selecciona los mejores comparables de la lista anterior para el cálculo.** Justifica tu decisión. Básate en metodologías comprobadas.
   - Deduplicar por (área ±1% + precio ±1% + barrio). Contar solo 1 entrada en cálculo.
   Escribe un párrafo indicando:
   - Cuántos comparables usas para el cálculo (separados por venta y arriendo)
   - Por qué descartaste los demás

   ### 2.1. Método de Venta Directa (Precio por m²)
    Calcula la **MEDIANA** del precio por m² de los comparables de venta seleccionados.
    Indica el valor por m² FINAL (ajustado).
    Calcula: Precio por m² final × ${area || 'área'} m².

### 2.2. Método de Rentabilidad (Yield Mensual)

   **CÁLCULO NORMALIZADO POR M²:**

   - Calcula el canon mensual por m² de CADA inmueble en arriendo  
   (canon mensual ÷ área construida).

   - Evalúa la estabilidad de la muestra:
     - Si los valores de canon/m² son homogéneos (sin valores atípicos relevantes),
       se utiliza el **PROMEDIO** de canon/m².
     - Si se detectan valores atípicos (canon/m² fuera de ±40% respecto a la mediana),
       se utiliza la **MEDIANA** como medida representativa.

   - Canon mensual estimado = (promedio o mediana de canon/m²) × ${area} m².

   - Investiga el yield mensual observado para ${formData.municipio}, estrato ${formData.estrato},
   con base en el comportamiento real del mercado de arriendos residenciales.
   Escribe la frase exacta: "**Yield promedio mercado: X.XX%**" 

   - Valor por rentabilidad = canon mensual estimado ÷ yield mensual.

   **Nota técnica:**  
   Nunca se promedian cánones totales sin normalizar previamente por área.

## 3. AJUSTES APLICADOS

   Explica cada ajuste aplicado, cómo se usó y por qué.
   Presenta cada ajuste en líneas separadas para facilitar la lectura.
   Nunca apliques ajustes sin justificación explícita basada en evidencia de mercado.
   Al final de la seccion debes verificar que hayas completado la explicación orientativa de los ajustes en uno o dos párrafos:


   ### FORMATO OBLIGATORIO DE PRESENTACIÓN (EJEMPLO):

   **Ajuste por ubicación:** +X% (zona de alta demanda según comparables directos).
   **Ajuste por estado:** -X% (requiere inversión).
   **Ajuste por antigüedad:** -X% (ajuste base según referencia de mercado / Camacol, escalado según remodelación).
   **Factor total de ajustes:** X.XX% (equivalente a X%).
   **Precio/m² ajustado (venta):** $X.XXX.XXX × X.XX% = $X.XXX.XXX.
   **Valor total ajustado:** $X.XXX.XXX/m² × X.XX m² = $X.XXX.XXX.
   **Yield ajustado:** $X.XXX.XXX × X.XX% = $X.XXX.XXX.

---

   ### TABLA DE AJUSTE POR ESTADO (usar según tipo de inmueble)

   | Estado / Tipo de Intervención | Casa | Apartamento |
   |-------------------------------|------|-------------|
   | Nuevo / Remodelado / Buen estado | 0% | 0% |
   | Reforma ligera | -5% | -6% |
   | Reforma moderada | -10% | -12% |
   | Remodelación amplia | -18% | -20% |
   | Remodelación superior | -25% | -28% |
   | Obra gris | -30% | -35% |

   Aplica el porcentaje correspondiente **exclusivamente** según el estado indicado en los DATOS DEL INMUEBLE.

---

   ### REGLA DE AJUSTE POR ANTIGÜEDAD SEGÚN REMODELACIÓN (OBLIGATORIA)

   El ajuste por antigüedad mide la depreciación cronológica.
   El ajuste por estado mide la condición funcional. Si está remodelado no se aplica ajuste por antigüedad.
   Ambos **NO deben penalizar el mismo factor dos veces**.

   Explica siempre cómo se combinan ambos ajustes y evita castigos dobles.

---

   ### REGLAS GENERALES DE AJUSTE

   - Si aplicas ajustes por ubicación, antigüedad o contexto, explícalos siempre por separado.
   - NO apliques ajustes positivos si los comparables ya reflejan esa prima en precio.
   - Muestra siempre:
     - porcentaje aplicado,
     - factor resultante,
     - impacto en pesos.

---

   ### AJUSTE POR CONTEXTO (SI APLICA)

   - Si el inmueble está en barrio abierto y los comparables están en conjuntos cerrados:
     - Investiga la diferencia de precio típica entre conjuntos y barrios abiertos en ${formData.municipio}.
     - Aplica ajuste NEGATIVO (los conjuntos suelen cotizar más).

   - Si el inmueble está en conjunto cerrado y los comparables están en barrios abiertos:
     - Investiga la diferencia de precio típica entre conjuntos y barrios abiertos en ${formData.municipio}.
  - Aplica ajuste POSITIVO solo si el mercado lo respalda claramente.

---

   ### OTROS AJUSTES COMPARATIVOS (SOLO CON EVIDENCIA)

   **En casas:**
   - Menos niveles que los comparables → posible ajuste POSITIVO (mayor amplitud por nivel).
   - Más niveles que los comparables → posible ajuste NEGATIVO (fragmentación del espacio).

   **En apartamentos:**
   - Piso superior al de los comparables → posible ajuste POSITIVO si el mercado valora altura, vista o menor ruido.
   - Piso inferior al de los comparables → posible ajuste NEGATIVO si el mercado penaliza iluminación, ruido o seguridad.

   Valida siempre con evidencia de mercado.

---

   ### REGLAS ESPECIALES PARA EL YIELD AJUSTADO

   Siempre que menciones “Yield ajustado”, debes:

   - Indicar claramente el valor de rentabilidad base utilizado.
   - Explicar qué factor total de ajustes se está aplicando.
   - Mostrar la operación numérica completa en una sola línea.

   Ejemplo de estilo (NO copiar literal):
   “Yield ajustado: $XXX.XXX.XXX × 0,XX (factor total de ajustes) = $XXX.XXX.XXX”.

   Evita expresiones como “Yield ajustado (-X%)” sin fórmula ni explicación.

---

   Explica de forma orientativa en uno o dos párrafos:
   - Por qué y cómo se aplicaron los ajustes.
   - cómo los ajustes aplicados (o no aplicados) influyeron en el valor final.
   - Justifica tus decisiones según la calidad de los comparables, el estado del inmueble frente al mercado y la coherencia entre los métodos utilizados.
   - Evita conclusiones absolutas y presenta el resultado como una referencia de mercado.

## 4. RESULTADOS FINALES

   - **Valor Recomendado de Venta:** [valor calculado]
   - **Rango sugerido:** [mínimo] - [máximo]
   - **Precio por m² final:** [valor calculado]
   - **Posición en mercado:** [análisis breve]

   - Explica de forma clara y orientativa, para un usuario no experto, la diferencia entre el valor obtenido por el enfoque de mercado y el enfoque de rentabilidad,
     indicando cuál de los dos presenta mayor estabilidad según la cantidad, homogeneidad y dispersión de los comparables utilizados,
     y por qué el valor final se considera el más representativo en este caso.

   - Indica brevemente el nivel de confiabilidad del resultado y cómo debe interpretarse el rango sugerido.

   **REGLAS DE EXPLICACIÓN DE MÉTODOS:**

   - Si combinas el resultado del **método de venta directa** con el **método de rentabilidad**:
     - Explica con palabras cómo se hace la ponderación (por ejemplo: “se dio mayor peso al valor por venta directa y menor peso al valor por rentabilidad debido a la calidad de los comparables de venta”).
     - Muestra también el **cálculo numérico final** indicando los porcentajes usados y los valores de cada método.
     - Ejemplo de estilo (solo ilustrativo): “Valor ponderado = 0,60 × Valor venta + 0,40 × Valor rentabilidad = $XXX.XXX.XXX” (los porcentajes son solo ilustrativos).

   - **No uses una fórmula fija de la forma** Valor ponderado = 0,7 × Valor venta + 0, 3 × Valor rentabilidad.
   - Ajusta los porcentajes según el contexto del caso (calidad y cantidad de comparables de venta vs arriendo) y explícitalos en el texto cuando los uses.

## 5. RESUMEN EJECUTIVO

   **FORMATO OBLIGATORIO DEL RESUMEN:**
   - Escribe 2-3 párrafos orientativos con el valor recomendado, rango y estrategia de venta.
   - Todos los valores monetarios DEBEN formatearse así: **$XXX.XXX.XXX** (negrita, con puntos como separadores de miles).
   - Usa **negritas** para destacar: valor recomendado, rango mínimo, rango máximo, precio por m².
   
   - AL FINAL incluye el disclaimer: "Este reporte es una estimación de mercado de carácter orientativo y no tiene validez legal para fines hipotecarios, judiciales o transaccionales."

## 6. LIMITACIONES

   Menciona escasez de datos o dependencias.

## 7. TRANSPARENCIA DE DATOS

   Crea un parrafo argumentativo que responda a las siguientes preguntas:
   - ¿TODOS LOS RESULTADOS QUE HAS ENVIADO SON REALES?
   - ¿Por qué algunos enlaces no muestran la propiedad que mencionas?
   - ¿Por que un resultado es diferente al anterior?
   - Algunos enlaces parecen rotos, ¿por qué sucede esto?
   **NO PREGUNTES NADA ADICIONAL, NI MENCIONES LAS PREGUNTAS.** Es un mensaje orientativo de la calidad de datos. 

**RECORDATORIO CRÍTICO:**
- Este es un REPORTE FINAL, no una conversación.
- NO ofrezcas actualizaciones, ampliaciones ni solicites más datos.
- NO uses frases como "Si desea, puedo...", "Puedo actualizar...", "Obtener medición exacta..."
- Entrega SOLO el análisis completo basado en los datos disponibles.

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

            const OPENAI_API_KEY = env.OPENAI_API_KEY ? env.OPENAI_API_KEY.trim() : null;
            const firecrawl = new Firecrawl({ apiKey: env.FIRECRAWL_API_KEY ? env.FIRECRAWL_API_KEY.trim() : null });

            if (!env.FIRECRAWL_API_KEY || !OPENAI_API_KEY) {
                jobs.set(jobId, { status: 'failed', error: 'API keys no configuradas (FIRECRAWL_API_KEY, OPENAI_API_KEY)' });
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

            console.log('Buscando con Firecrawl:', agentInput);

            let responseText = '';
            t_search_start = Date.now();
            // --- 1. BUSCAR COMPARABLES CON FIRECRAWL ---
            // Calcular rangos de área extendidos (±30%)
            const rangoExtendidoMin = Math.round(area * 0.7);
            const rangoExtendidoMax = Math.round(area * 1.3);
            try {
                console.log('🔎 [Firecrawl] Iniciando búsqueda de comparables...');
                // Prompt flexible usando los datos del formulario
                const zonaRef = formData.nombre_conjunto || formData.barrio || formData.municipio;
                const firecrawlPrompt = `Busca entre 8 y 12 listados de ${tipoInmueble}s en ${formData.municipio}, ${formData.departamento}. Prioriza propiedades en ${formData.barrio}${formData.nombre_conjunto ? ` o en el conjunto ${formData.nombre_conjunto}` : ''}, pero busca también en barrios cercanos. Prioriza propiedades de aproximadamente ${area}m2. Incluye 50% ventas y 50% arriendos. Filtra precios atípicos y prioriza anuncios de los últimos 30 días (máximo 6 meses). Extrae: tipo de propiedad, transacción, área exacta, precio en COP, habitaciones, baños, barrio, nombre del conjunto (si aplica), portal de origen, URL y etiquetas de proximidad (coincidencia, zona_similar, zona_extendida). Si el número de habitaciones o baños no está disponible, usa null. Excluir duplicados (misma área, precio y ciudad) y listados de OLX, Nestoria, waa2, Trovit o FazWaz. IMPORTANTE: Solo busca ${tipoInmueble}s, no incluyas ningún otro tipo de propiedad.`;

                const firecrawlResponse = await firecrawl.agent({
                    prompt: firecrawlPrompt,
                    schema: z.object({
                        listings: z.array(z.object({
                            transaction_type: z.string().describe("Type of transaction (e.g., venta, arriendo)"),
                            transaction_type_citation: z.string().describe("Source URL for transaction_type").optional(),
                            area_m2: z.number().describe("Exact area in square meters"),
                            area_m2_citation: z.string().describe("Source URL for area_m2").optional(),
                            price_cop: z.number().describe("Price in Colombian pesos"),
                            price_cop_citation: z.string().describe("Source URL for price_cop").optional(),
                            habitaciones: z.number().nullable().describe("Number of bedrooms").optional(),
                            banos: z.number().nullable().describe("Number of bathrooms").optional(),
                            neighborhood: z.string().describe("Neighborhood of the property"),
                            neighborhood_citation: z.string().describe("Source URL for neighborhood").optional(),
                            complex_name: z.string().describe("Name of the residential complex").optional(),
                            complex_name_citation: z.string().describe("Source URL for complex_name").optional(),
                            source_portal: z.string().describe("Origin portal of the listing"),
                            source_portal_citation: z.string().describe("Source URL for source_portal").optional(),
                            url: z.string().describe("URL of the listing"),
                            url_citation: z.string().describe("Source URL for url").optional(),
                            proximity_tags: z.array(z.object({
                                value: z.string().describe("Proximity tag value"),
                                value_citation: z.string().describe("Source URL for this value").optional()
                            })).describe("Tags indicating proximity").optional()
                        })).describe("List of verified house listings")
                    }),
                    model: "spark-1-mini"
                });
                console.log('🔎 [Firecrawl] Respuesta recibida');
                // Debug: mostrar respuesta cruda para diagnóstico
                console.log('🔎 [Firecrawl] Respuesta cruda:', JSON.stringify(firecrawlResponse, null, 2).substring(0, 500));

                // Firecrawl puede devolver { items: [...] }, { data: [...] }, o { listings: [...] }
                // Extraemos los listings del campo correcto
                let listings = [];
                if (firecrawlResponse.items && Array.isArray(firecrawlResponse.items)) {
                    listings = firecrawlResponse.items;
                } else if (firecrawlResponse.data && Array.isArray(firecrawlResponse.data)) {
                    listings = firecrawlResponse.data;
                } else if (firecrawlResponse.listings && Array.isArray(firecrawlResponse.listings)) {
                    listings = firecrawlResponse.listings;
                } else if (typeof firecrawlResponse === 'object') {
                    // Fallback: objeto con claves numéricas
                    listings = Object.keys(firecrawlResponse)
                        .filter(key => !isNaN(key))
                        .sort((a, b) => parseInt(a) - parseInt(b))
                        .map(key => firecrawlResponse[key]);
                }

                const listingsCount = listings.length;
                console.log(`🔎 [Firecrawl] Total listings: ${listingsCount}`);

                // Enviamos el JSON directamente al Analista (GPT-4o puede leerlo sin problema)
                // Esto es más robusto ya que los nombres de campos varían
                if (listings.length > 0) {
                    responseText = JSON.stringify(listings, null, 2);
                    console.log('🔎 [Firecrawl] Comparables enviados como JSON');
                } else {
                    console.warn('⚠️ [Firecrawl] No se encontraron comparables.');
                    responseText = "No se encontraron comparables en la web.";
                }
            } catch (err) {
                console.error('Error Firecrawl:', err);
                jobs.set(jobId, { status: 'failed', error: 'Error Firecrawl', details: err.message });
                return;
            }

            // --- 2. ANALISTA AI (CONEXIÓN DIRECTA) ---
            const promptFinal = construirPromptAnalisis(formData, area, responseText);
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

2. "resumen_mercado": Redacta un párrafo orientativo que contenga los datos del avalúo y el análisis realizado. Al final invita al usuario a presionar el botón "Ver comparables utilizados" para desplegar la tabla de los comparables usados en el análisis. 
   
   El parrafo debe incluir los siguientes datos (con negritas en los valores):
   - Usa negrita para palabras clave como "Valor recomendado", "Rango", "Precio por m²", etc.
   - Valor recomendado: **$XXX.XXX.XXX**, Rango: entre **$XXX.XXX.XXX** y **$XXX.XXX.XXX**, Precio por m²: **$X.XXX.XXX/m²** 
   - Menciona que es una estimación orientativa, basada en datos actuales del mercado, no valido para tramites legales.
   
   FORMATO:
   - FORMATEA con puntos de miles (ej: 408240000 → **$408.240.000**)
   - Usa **doble asterisco** para negritas en los valores
   - El resultado debe ser un STRING de texto natural

3. "yield_zona": Busca la frase exacta "**Yield promedio mercado: X.XX%**" en el texto. Extrae SOLO el número como decimal (ej: si dice "0.5%", devuelve 0.005).

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
                let yieldExtracted = sanitizeFloat(extractedData.yield_zona);

                // SEGURIDAD: Si el yield extraído es > 0.1 (10% mensual), es probable que la IA 
                // haya devuelto el porcentaje (0.45) en lugar del decimal (0.0045).
                if (yieldExtracted && yieldExtracted > 0.1) {
                    console.log(`⚠️ [YIELD GUARD] Yield detectado como porcentaje (${yieldExtracted}), convirtiendo a decimal...`);
                    yieldExtracted = yieldExtracted / 100;
                }

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

                            try {
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
                            } catch (urlError) {
                                // URL malformada - tratar como no verificada pero continuar
                                console.log(`⚠️ URL inválida/malformada: ${c.url_fuente}`);
                                urlValida = false;
                                esVerificado = false;
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
                // Protección: asegurar que resumenFinal sea string
                if (typeof resumenFinal !== 'string') {
                    resumenFinal = typeof resumenFinal === 'object' ? JSON.stringify(resumenFinal) : String(resumenFinal);
                }
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

                console.log(`Clasificación: ${totalVerificados} verificados, ${totalZonasSimilares} zonas similares, ${totalEstimaciones} estimaciones`);

                // Sistema de puntos ponderados
                let puntosConfianza = 0;
                puntosConfianza += totalVerificados * 3; // coincidencia
                puntosConfianza += totalZonasSimilares * 2; // zona_similar + verificado
                puntosConfianza += totalEstimaciones * 1; // zona_extendida

                const promedioCalidad = total > 0 ? puntosConfianza / total : 0;
                console.log(`Promedio calidad: ${promedioCalidad.toFixed(2)} (max: 3.0)`);

                // --- CÁLCULO DE DISPERSIÓN (Coeficiente de Variación) ---
                const preciosM2Validos = comparablesParaTabla.map(c => c.precio_m2).filter(v => typeof v === 'number' && v > 0);
                let cvDispersion = 0;
                let dispersionNivel = 'bajo';
                let dispersionNarrativa = '';

                if (preciosM2Validos.length >= 2) {
                    const mean = calculateMean(preciosM2Validos);
                    const stdDev = calculateStdDev(preciosM2Validos, mean);
                    cvDispersion = mean > 0 ? stdDev / mean : 0;

                    if (cvDispersion > 0.30) {
                        dispersionNivel = 'muy_alto';
                        dispersionNarrativa = 'Existe una alta variabilidad en los precios de los comparables analizados, lo que indica un mercado poco homogéneo. El valor estimado se basa en la mediana para reducir el impacto de valores atípicos y debe utilizarse con cautela.';
                    } else if (cvDispersion > 0.20) {
                        dispersionNivel = 'alto';
                        dispersionNarrativa = 'Los precios de los comparables presentan una dispersión elevada, reflejando un mercado heterogéneo. El valor estimado debe interpretarse como una referencia técnica orientativa.';
                    } else if (cvDispersion > 0.10) {
                        dispersionNivel = 'medio';
                        dispersionNarrativa = 'Se observa una dispersión moderada en los precios de los comparables, lo cual es habitual en mercados residenciales activos. El valor estimado se considera representativo.';
                    } else {
                        dispersionNivel = 'bajo';
                        dispersionNarrativa = 'Se observa una dispersión baja, indicando un mercado altamente homogéneo y valores consistentes entre comparables.';
                    }
                    console.log(`[DISPERSIÓN] CV: ${(cvDispersion * 100).toFixed(1)}% | Nivel: ${dispersionNivel}`);
                }

                const esDispersionAlta = (dispersionNivel === 'alto' || dispersionNivel === 'muy_alto');
                const factorDispersion = esDispersionAlta ? 0.7 : 1.0;
                const puntuacionFinal = promedioCalidad * factorDispersion;
                console.log(`Puntuación final: ${puntuacionFinal.toFixed(2)}`);

                // --- DETERMINACIÓN DE NIVEL DE CONFIANZA ---
                let nivelConfianzaCalc = 'Bajo';

                if (puntuacionFinal >= 2.2 && total >= 8 && !esDispersionAlta) {
                    nivelConfianzaCalc = 'Alto';
                } else if (puntuacionFinal >= 1.8 && total >= 6 && !esDispersionAlta) {
                    nivelConfianzaCalc = 'Medio';
                } else if (puntuacionFinal >= 1.3 && total >= 5) {
                    nivelConfianzaCalc = 'Medio';
                } else {
                    nivelConfianzaCalc = 'Bajo';
                }

                // Ajustes por datos hiperlocales
                if (!esDispersionAlta && totalVerificados >= 5 && total >= 6 && puntuacionFinal >= 1.8) {
                    nivelConfianzaCalc = 'Alto';
                    console.log('↑ Ajuste: Medio → Alto (datos hiperlocales de alta calidad)');
                }

                // Penalizaciones por origen de datos
                if (totalEstimaciones > total * 0.5) {
                    if (nivelConfianzaCalc === 'Alto') {
                        nivelConfianzaCalc = 'Medio';
                        console.log('↓ Penalización: Alto → Medio (muchas estimaciones)');
                    } else if (nivelConfianzaCalc === 'Medio' && totalEstimaciones > total * 0.7) {
                        nivelConfianzaCalc = 'Bajo';
                        console.log('↓ Penalización: Medio → Bajo (mayoría estimaciones)');
                    }
                }

                // SECURITY CAP: Auto-regulación final por dispersión crítica
                if (dispersionNivel === 'muy_alto') {
                    nivelConfianzaCalc = 'Bajo';
                    console.log('↓ CAP SEGURIDAD: Solidez forzada a Bajo (Dispersión crítica)');
                } else if (dispersionNivel === 'alto' && nivelConfianzaCalc === 'Alto') {
                    nivelConfianzaCalc = 'Medio';
                    console.log('↓ CAP SEGURIDAD: Solidez limitada a Medio (Dispersión alta)');
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
                    total_zonas_alternativas: totalZonasSimilares,
                    puntuacion_calidad: parseFloat(promedioCalidad.toFixed(2)),
                    puntuacion_final: parseFloat(puntuacionFinal.toFixed(2)),
                    dispersion_nivel: dispersionNivel,
                    dispersion_narrativa: dispersionNarrativa,
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

                // ========================================================================
                // ✉️ ENVÍO AUTOMÁTICO DE CORREO
                // ========================================================================
                try {
                    console.log('📧 [Auto-Email] Iniciando envío automático...');
                    console.log('📧 [Auto-Email] formData completo:', JSON.stringify(formData, null, 2));

                    // Usar email del formData o fallback a DEV_EMAIL (para desarrollo)
                    const emailRecipient = formData.email || formData.contacto_email || env.DEV_EMAIL;

                    console.log('📧 [Auto-Email] formData.email:', formData.email);
                    console.log('📧 [Auto-Email] formData.contacto_email:', formData.contacto_email);
                    console.log('📧 [Auto-Email] DEV_EMAIL fallback:', env.DEV_EMAIL);
                    console.log('📧 [Auto-Email] Email seleccionado:', emailRecipient);

                    if (!emailRecipient) {
                        console.log('📧 [Auto-Email] ⏭️ Sin destinatario, omitiendo envío');
                    } else {
                        const WORKER_EMAIL_URL = env.WORKER_EMAIL_URL || 'https://avaluos-api-email.quetzalhabitats.workers.dev';

                        // Generar subject
                        const subject = `Reporte de Avalúo: ${formData.tipo_inmueble || 'Inmueble'} en ${formData.barrio || formData.municipio || 'Colombia'}`;

                        // Generar HTML del correo (versión simplificada inline)
                        const htmlBody = generateSimpleEmailHtml({
                            ...formData,
                            ...resultado,
                            codigo_avaluo: formData.codigo_avaluo || body.codigo_avaluo || `QZ-${Date.now()}`,
                            id: body.id || formData.id
                        });

                        // Llamar al worker de email
                        const emailResponse = await fetch(`${WORKER_EMAIL_URL}/send-email`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                to: emailRecipient,
                                subject: subject,
                                htmlBody: htmlBody
                            })
                        });

                        if (emailResponse.ok) {
                            console.log(`📧 [Auto-Email] ✅ Correo enviado exitosamente a ${emailRecipient}`);
                        } else {
                            const errorText = await emailResponse.text();
                            console.warn(`📧 [Auto-Email] ⚠️ Error enviando correo: ${errorText}`);
                        }
                    }
                } catch (emailError) {
                    // NO fallar el job si el email falla
                    console.error('📧 [Auto-Email] ❌ Error (no crítico):', emailError.message);
                }
                // ========================================================================

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
