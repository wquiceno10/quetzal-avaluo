var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
console.log("Deploy V9 (Dynamic Area + Fallback) - " + (/* @__PURE__ */ new Date()).toISOString());
var index_default = {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "JSON inv\xE1lido", details: e.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { formData } = body || {};
    if (!formData) {
      return new Response(
        JSON.stringify({ error: "formData es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const PERPLEXITY_API_KEY = env.PERPLEXITY_API_KEY;
    const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;
    if (!PERPLEXITY_API_KEY || !DEEPSEEK_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API keys no configuradas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const tipoInmueble = formData.tipo_inmueble || "inmueble";
    const ubicacion = `${formData.barrio || ""}, ${formData.municipio || ""}`.trim();
    let areaBase = parseInt(formData.area_construida);
    if (!Number.isFinite(areaBase) || areaBase <= 0) areaBase = 60;
    const area = areaBase;
    const minArea = Math.round(area * 0.7);
    const maxArea = Math.round(area * 1.3);
    const areaConstruida = area;
    const infoInmueble = `
- Tipo: ${tipoInmueble}
- Ubicaci\xF3n: ${ubicacion}
- Habitaciones: ${formData.habitaciones || "?"}
`.trim();
    const areaInstruction = areaConstruida ? `
- \xC1REA CONSTRUIDA: ${areaConstruida} m\xB2
- Rango de \xE1reas VENTA (Estricto): ${Math.round(area * 0.5)} a ${Math.round(area * 1.5)} m\xB2 (\xB150%)
- SOLO incluye comparables de venta cuyas \xE1reas est\xE9n dentro de este rango. Para arriendos, intenta mantener el \xE1rea similar, pero prioriza encontrar datos.` : "";
    const perplexityPrompt = `
Eres un analista inmobiliario especializado en aval\xFAos comerciales t\xE9cnicos y estimaci\xF3n de valor apoyada en datos estad\xEDsticos del mercado colombiano.
Tu tarea es elaborar un **an\xE1lisis completo, claro y profesional**, incluso cuando la informaci\xF3n disponible sea limitada.

DATOS DEL INMUEBLE
-------------------
Basado en estos datos proporcionados por el usuario:
${infoInmueble}
${areaInstruction}

INSTRUCCIONES GENERALES (GESTI\xD3N DE FALLBACK)
---------------------------------------------
1. Si no encuentras suficientes datos reales en portales inmobiliarios, DEBES complementar con:
   - Estad\xEDsticas municipales y regionales.
   - Valores t\xEDpicos de mercado seg\xFAn tama\xF1o del inmueble y ubicaci\xF3n.
2. NUNCA devuelvas valores "0", "null", "N/A" o similares.
3. Si un dato no aparece directamente, GENERA una estimaci\xF3n razonable basada en promedios municipales.
4. Siempre entrega comparables suficientes:
   - Entrega idealmente entre 12 y 15 comparables en total.
   - Incluye propiedades en arriendo (m\xEDnimo 3).
   - Incluye propiedades de barrios similares.
5. NO incluyas hiperv\xEDnculos ni enlaces. Solo textos descriptivos.
6. Incluye precios, \xE1reas y valores de mercado siempre en pesos colombianos.
7. Responde SIEMPRE en espa\xF1ol.

TAREAS
------

## 1. B\xDASQUEDA Y SELECCI\xD3N DE COMPARABLES (FORMATO CR\xCDTICO)
Para que el sistema procese la informaci\xF3n correctamente, debes presentar el listado de comparables en una **TABLA MARKDOWN** con estas columnas exactas:
| T\xEDtulo | Tipo (Venta/Arriendo) | Precio | \xC1rea (m2) | Habitaciones | Ubicaci\xF3n | Fuente |

*Nota: T\xEDtulo y Precio deben ser lo m\xE1s fieles posible al anuncio original.*

## 2. AN\xC1LISIS DEL VALOR (C\xC1LCULO JS EXTERNO)
Escribe un an\xE1lisis narrativo sobre ambos enfoques, sin hacer c\xE1lculos finales.

### 2.1. M\xE9todo de Venta Directa (Precio por m\xB2)
- Comenta el valor promedio por m\xB2 del mercado bas\xE1ndote en los comparables de venta.
- Sugiere el valor por m\xB2 FINAL que deber\xEDa usarse (ajustado por antig\xFCedad, estado, etc.).

### 2.2. M\xE9todo de Rentabilidad (Yield Mensual)
- Estima el Canon Mensual Promedio de Arriendo para ${areaConstruida || "metros"} m\xB2 en la zona.
- Estima el Yield mensual promedio del sector (ej: 0.4% - 0.6%).

## 3. RESULTADOS FINALES Y AJUSTES
Entrega de forma clara:
- Resumen de la posici\xF3n del inmueble en el mercado (liquidez).
- Comentario sobre ajustes aplicados por antig\xFCedad o caracter\xEDsticas.
- Menciona las limitaciones si se usaron promedios regionales.

## 4. RESUMEN EJECUTIVO
Cierra con 1-2 p\xE1rrafos claros con el valor recomendado y estrategia de venta.

FORMATO FINAL
--------
- La secci\xF3n 1 DEBE ser una Tabla Markdown.
- Las dem\xE1s secciones deben ser texto narrativo claro.
- NO devuelvas JSON.
        `.trim();
    let perplexityContent = "";
    let citations = [];
    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            { role: "system", content: "Eres un analista inmobiliario preciso y profesional." },
            { role: "user", content: perplexityPrompt }
          ],
          temperature: 0.1,
          max_tokens: 8e3
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        return new Response(
          JSON.stringify({ error: `Error Perplexity (${response.status})`, details: errText }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const data = await response.json();
      perplexityContent = data.choices?.[0]?.message?.content || "";
      citations = data.citations || [];
      console.log(`Perplexity completado. Fuentes: ${citations.length}`);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Error conexi\xF3n Perplexity", details: e.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const extractionPrompt = `
Del siguiente texto (que contiene tablas y an\xE1lisis), extrae un JSON estructurado.

TEXTO:
${perplexityContent}

INSTRUCCIONES DE EXTRACCI\xD3N:
1. "comparables": Extrae CADA FILA de la tabla de inmuebles.
   - "titulo": El nombre o descripci\xF3n del inmueble.
   - "precio_lista": El n\xFAmero EXACTO del precio.
   - "tipo_operacion": "venta" o "arriendo".
     * IMPORTANTE: Si la columna dice "Venta", es "venta". Si dice "Arriendo", es "arriendo". NO asumas nada por el precio.
   - "area": \xC1rea en m\xB2.
   - "habitaciones": N\xFAmero de habitaciones.
   - "ubicacion": Barrio o zona.

2. "resumen_mercado": Extrae un resumen conciso (m\xE1ximo 2 p\xE1rrafos) de la secci\xF3n "RESUMEN EJECUTIVO". Prioriza la valoraci\xF3n y la rentabilidad.

3. "yield_zona": Busca el porcentaje de rentabilidad/yield mencionado en el an\xE1lisis (ej: 0.5%). Devu\xE9lvelo como decimal (0.005).

Devuelve SOLO JSON v\xE1lido.
        `.trim();
    let extractedData = {};
    try {
      const dsResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "Eres un extractor JSON experto. Tu prioridad es la fidelidad a los datos de origen." },
            { role: "user", content: extractionPrompt }
          ],
          temperature: 0
        })
      });
      if (!dsResponse.ok) {
        const errDs = await dsResponse.text();
        return new Response(
          JSON.stringify({ error: `Error DeepSeek (${dsResponse.status})`, details: errDs }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const dsData = await dsResponse.json();
      let content = dsData.choices?.[0]?.message?.content || "{}";
      content = content.trim();
      if (content.startsWith("```")) {
        const match = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (match && match[1]) content = match[1].trim();
      }
      extractedData = JSON.parse(content);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Error Parseo DeepSeek", details: e.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const sanitizeNumber = /* @__PURE__ */ __name((n) => typeof n === "number" && Number.isFinite(n) ? n : null, "sanitizeNumber");
    const yieldDefault = 55e-4;
    const yieldExtracted = sanitizeNumber(extractedData.yield_zona);
    const yieldFinal = yieldExtracted || yieldDefault;
    const portalesUnicos = new Set(
      citations.map((url) => {
        try {
          return new URL(url).hostname.replace("www.", "").replace(".com.co", "").replace(".com", "");
        } catch {
          return null;
        }
      }).filter(Boolean)
    );
    const portalesList = Array.from(portalesUnicos);
    if (portalesList.length === 0) portalesList.push("fincaraiz", "metrocuadrado");
    const comparables = (extractedData.comparables || []).map((c) => {
      const areaComp = sanitizeNumber(c.area);
      const precioLista = sanitizeNumber(c.precio_lista);
      const esArriendo = c.tipo_operacion?.toLowerCase().includes("arriendo");
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
      return {
        titulo: c.titulo || "Inmueble",
        tipo_origen: esArriendo ? "arriendo" : "venta",
        barrio: c.ubicacion || formData.barrio,
        municipio: formData.municipio,
        area_m2: areaComp,
        habitaciones: sanitizeNumber(c.habitaciones),
        banos: sanitizeNumber(c.banos),
        precio_publicado: precioLista,
        precio_cop: precioVentaEstimado,
        precio_m2: precioM2,
        yield_mensual: esArriendo ? yieldFinal : null
      };
    }).filter((c) => c.precio_cop > 0 && c.area_m2 > 0);
    if (comparables.length < 5) {
      return new Response(
        JSON.stringify({
          error: "Datos insuficientes",
          details: `Solo se encontraron ${comparables.length} comparables v\xE1lidos.`,
          perplexity_full_text: perplexityContent
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const compsVenta = comparables.filter((c) => c.tipo_origen === "venta");
    const compsArriendo = comparables.filter((c) => c.tipo_origen === "arriendo");
    let valorVentaDirecta = null;
    let precioM2Promedio = 0;
    if (compsVenta.length > 0) {
      const sumM2 = compsVenta.reduce((acc, c) => acc + c.precio_m2, 0);
      precioM2Promedio = Math.round(sumM2 / compsVenta.length);
      valorVentaDirecta = Math.round(precioM2Promedio * area);
    }
    let valorRentabilidad = null;
    let canonPromedio = 0;
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
    let valorFinal = 0;
    if (valorVentaDirecta && valorRentabilidad && compsArriendo.length > 0) {
      valorFinal = Math.round(valorVentaDirecta * 0.6 + valorRentabilidad * 0.4);
    } else {
      valorFinal = valorVentaDirecta || valorRentabilidad || 0;
    }
    const precioM2Usado = precioM2Promedio || (valorFinal > 0 ? Math.round(valorFinal / area) : 0);
    const resultado = {
      resumen_busqueda: extractedData.resumen_mercado || "An\xE1lisis de mercado realizado.",
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
      comparables,
      perplexity_full_text: perplexityContent
    };
    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
