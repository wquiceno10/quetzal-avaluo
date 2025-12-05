var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
console.log("Deploy V5.1 (Optimized) - " + (/* @__PURE__ */ new Date()).toISOString());
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
    if (!Number.isFinite(areaBase) || areaBase <= 0) {
      areaBase = 60;
    }
    const area = areaBase;
    const minArea = Math.round(area * 0.7);
    const maxArea = Math.round(area * 1.3);
    const perplexityPrompt = `
Act\xFAa como tasador inmobiliario experto en Colombia.
Busca inmuebles en VENTA y ARRIENDO en: ${ubicacion} (${tipoInmueble}).
Objetivo: \xC1rea ${area}m\xB2, ${formData.habitaciones || "?"} habs.

REQUISITOS DE B\xDASQUEDA:
1. Filtro de \xC1rea: ${minArea}m\xB2 a ${maxArea}m\xB2.
2. Cantidad: M\xEDnimo 15 comparables. Intenta que el 20-30% sean ARRIENDOS.
3. Fuentes: Portales reales (Fincaraiz, Metrocuadrado, Ciencuadras, etc.).
4. Si escasean datos en el barrio exacto, busca en barrios vecinos del mismo estrato.

FORMATO DE RESPUESTA:
Genera una lista detallada. Para cada inmueble especifica:
- T\xEDtulo y Ubicaci\xF3n.
- Operaci\xF3n: VENTA o ARRIENDO.
- Precio de Lista (El valor total si es venta, o el canon mensual si es arriendo).
- \xC1rea, Habitaciones, Ba\xF1os.

AL FINAL, ESCRIBE UN "RESUMEN EJECUTIVO" DE 2-3 P\xC1RRAFOS QUE INCLUYA:
- Precio promedio por m\xB2 encontrado en el mercado
- Yield (rentabilidad) estimado del sector
- Nivel de oferta disponible (abundante/escasa/moderada)
- Recomendaci\xF3n de precio de publicaci\xF3n para el propietario
- Principales factores que afectan el valor (ubicaci\xF3n, estado, amenidades)
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
          // Modelo rápido y efectivo
          messages: [
            { role: "system", content: "Eres un motor de b\xFAsqueda inmobiliaria preciso." },
            { role: "user", content: perplexityPrompt }
          ],
          temperature: 0.1,
          max_tokens: 8e3
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error("Perplexity API error:", response.status, errText);
        return new Response(
          JSON.stringify({ error: `Error Perplexity (${response.status})`, details: errText }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const data = await response.json();
      perplexityContent = data.choices?.[0]?.message?.content || "";
      citations = data.citations || [];
      console.log(`Perplexity completado. Fuentes: ${citations.length}, Chars: ${perplexityContent.length}`);
    } catch (e) {
      console.error("Perplexity request failed:", e);
      return new Response(
        JSON.stringify({ error: "Error conexi\xF3n Perplexity", details: e.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!perplexityContent) {
      return new Response(
        JSON.stringify({ error: "Perplexity devolvi\xF3 respuesta vac\xEDa" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const extractionPrompt = `
Del siguiente texto (que puede contener tablas Markdown o listas), extrae un JSON con los comparables y el an\xE1lisis.

TEXTO:
${perplexityContent}

INSTRUCCIONES PARA TABLAS MARKDOWN:
Si el texto contiene una tabla (ej: | T\xEDtulo | Precio | ...), procesa cada fila como un comparable.
- Columna "Precio" o "Precio (COP)" -> "precio_lista" (elimina signos $ y comas).
- Columna "Operaci\xF3n" -> "tipo_operacion" ("venta" o "arriendo").
- Columna "\xC1rea" -> "area".

REGLAS DE EXTRACCI\xD3N:
1. "precio_lista": El n\xFAmero EXACTO. 
   - Si es ARRIENDO (ej: "$1,250,000 / mes"), extrae solo el n\xFAmero (1250000).
   - Si es VENTA, el valor total.
2. "tipo_operacion": "venta" o "arriendo".
3. "yield_zona": Extrae el % de rentabilidad si se menciona.
4. "resumen_mercado": Extrae el RESUMEN EJECUTIVO completo.

IMPORTANTE: Extrae TODOS los comparables de la tabla/lista.

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
            {
              role: "system",
              content: "Eres un extractor JSON estricto. Responde SOLO con el objeto JSON, sin bloques de c\xF3digo markdown."
            },
            { role: "user", content: extractionPrompt }
          ],
          temperature: 0
        })
      });
      if (!dsResponse.ok) {
        const errDs = await dsResponse.text();
        console.error("DeepSeek API error:", dsResponse.status, errDs);
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
        if (match && match[1]) {
          content = match[1].trim();
        }
      }
      extractedData = JSON.parse(content);
      console.log("DeepSeek extraction successful");
    } catch (e) {
      console.error("DeepSeek parsing error:", e);
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
    if (portalesList.length === 0) {
      portalesList.push("fincaraiz", "metrocuadrado");
    }
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
        // FRONTEND DATA
        precio_publicado: precioLista,
        // Lo que se ve (Canon o Venta)
        precio_cop: precioVentaEstimado,
        // Valor Capital (para cálculos)
        precio_m2: precioM2,
        // $/m² Homogeneizado
        yield_mensual: esArriendo ? yieldFinal : null
      };
    }).filter((c) => c.precio_cop > 0 && c.area_m2 > 0);
    if (comparables.length < 5) {
      return new Response(
        JSON.stringify({
          error: "Datos insuficientes",
          details: `Se encontraron solo ${comparables.length} comparables v\xE1lidos (m\xEDnimo 5 requeridos)`,
          perplexity_full_text: perplexityContent
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log(`Comparables procesados: ${comparables.length}`);
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
    console.log(`Valores calculados - Final: ${valorFinal}, Venta: ${valorVentaDirecta}, Rentabilidad: ${valorRentabilidad}`);
    const resultado = {
      resumen_busqueda: extractedData.resumen_mercado || "An\xE1lisis de mercado basado en oferta disponible.",
      valor_final: valorFinal,
      rango_valor_min: Math.round(valorFinal * 0.95),
      rango_valor_max: Math.round(valorFinal * 1.05),
      // Metodología Venta
      valor_estimado_venta_directa: valorVentaDirecta,
      precio_m2_usado: precioM2Usado,
      // Metodología Rentabilidad
      valor_estimado_rentabilidad: valorRentabilidad,
      canon_arriendo_promedio: canonPromedio,
      yield_mensual_mercado: yieldFinal,
      // Estadísticas
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
