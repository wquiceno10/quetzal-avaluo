var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
console.log("Deploy V11 (7 Correcciones) - " + (/* @__PURE__ */ new Date()).toISOString());
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
    const tipoInmueble = (formData.tipo_inmueble || "inmueble").toLowerCase();
    const esLote = tipoInmueble === "lote";
    const usoLote = formData.uso_lote || "residencial";
    const ubicacion = `${formData.barrio || ""}, ${formData.municipio || ""}`.trim();
    let areaBase = parseInt(formData.area_construida);
    if (!Number.isFinite(areaBase) || areaBase <= 0) areaBase = 60;
    const area = areaBase;
    const areaConstruida = area;
    const infoInmueble = `
- Tipo: ${tipoInmueble}
${esLote ? `- Uso del Lote: ${usoLote}` : ""}
- Ubicaci\xF3n: ${ubicacion}
${formData.nombre_conjunto ? `- Conjunto/Edificio: ${formData.nombre_conjunto}` : ""}
${!esLote ? `- Habitaciones: ${formData.habitaciones || "?"}` : ""}
${!esLote ? `- Ba\xF1os: ${formData.banos || "?"}` : ""}
${!esLote ? `- Parqueadero: ${formData.tipo_parqueadero || "No indicado"}` : ""}
${!esLote ? `- Antig\xFCedad: ${formData.antiguedad || "No indicada"}` : ""}
${!esLote ? `- Estado: ${formData.estado_inmueble || "No especificado"}` : ""}
${!esLote && formData.tipo_remodelacion ? `- Remodelaci\xF3n: ${formData.tipo_remodelacion} (${formData.valor_remodelacion || "Valor no indicado"})` : ""}
${!esLote && formData.descripcion_mejoras ? `- Mejoras: ${formData.descripcion_mejoras}` : ""}
${formData.informacion_complementaria ? `- NOTAS ADICIONALES: ${formData.informacion_complementaria}` : ""}
`.trim();
    const areaInstruction = areaConstruida ? `
- \xC1REA CONSTRUIDA: ${areaConstruida} m\xB2
- Rango de \xE1reas VENTA (Estricto): ${Math.round(area * 0.5)} a ${Math.round(area * 1.5)} m\xB2 (\xB150%)
- SOLO incluye comparables de venta cuyas \xE1reas est\xE9n dentro de este rango. Para arriendos, intenta mantener el \xE1rea similar, pero prioriza encontrar datos.` : "";
    const instruccionesLote = esLote ? `
INSTRUCCIONES ESPECIALES PARA LOTES:
1. OMITIR POR COMPLETO EL ENFOQUE DE RENTABILIDAD. No busques arriendos.
2. Busca SOLO comparables de VENTA de lotes con uso ${usoLote}.
3. Si no encuentras suficientes lotes comparables en venta en la zona:
   - Puedes considerar inmuebles ${usoLote === "comercial" ? "comerciales" : "residenciales"} construidos en el mismo sector.
   - Estima el valor aproximado del terreno como un porcentaje razonable del valor total del inmueble (M\xE9todo Residual).
   - Por ejemplo, un lote puede valer entre 25% y 40% del valor de una propiedad construida si el terreno es el activo principal.
   - Explica claramente si usas esta l\xF3gica de "proxy" en el an\xE1lisis.
4. Evita comparar con fincas productivas o proyectos de gran escala si el lote es peque\xF1o/urbano.
` : "";
    const perplexityPrompt = `
Eres un analista inmobiliario especializado en aval\xFAos comerciales t\xE9cnicos y estimaci\xF3n de valor apoyada en datos estad\xEDsticos del mercado colombiano.
Tu tarea es elaborar un **an\xE1lisis completo, claro y profesional**, incluso cuando la informaci\xF3n disponible sea limitada.

DATOS DEL INMUEBLE
-------------------
Basado en estos datos proporcionados por el usuario:
${infoInmueble}
${areaInstruction}

${instruccionesLote}

INSTRUCCIONES GENERALES (GESTI\xD3N DE FALLBACK)
---------------------------------------------
1. Si no encuentras suficientes datos reales en portales inmobiliarios, DEBES complementar con:
   - Estad\xEDsticas municipales y regionales.
   - Valores t\xEDpicos de mercado seg\xFAn tama\xF1o del inmueble y ubicaci\xF3n.
2. NUNCA devuelvas valores "0", "null", "N/A" o similares.
3. Si un dato no aparece directamente, GENERA una estimaci\xF3n razonable basada en promedios municipales.
4. Siempre entrega comparables suficientes:
   - Entrega idealmente entre 15 y 20 comparables en total.
   - ${esLote ? "SOLO incluye propiedades en VENTA." : "Incluye propiedades en arriendo (m\xEDnimo 3)."}
   - Incluye propiedades de barrios similares.
5. NO incluyas hiperv\xEDnculos ni enlaces. Solo textos descriptivos.
6. Incluye precios, \xE1reas y valores de mercado siempre en pesos colombianos.
7. Responde SIEMPRE en espa\xF1ol.
8. IMPORTANTE: Todas las cifras deben escribirse COMPLETAS en pesos colombianos, sin abreviaciones.
   Ejemplo: usar $4.200.000, NO 4.2M ni 4.200K.

TAREAS
------

## 1. B\xDASQUEDA Y SELECCI\xD3N DE COMPARABLES

Primero, detalla brevemente la disponibilidad de informaci\xF3n encontrada.

Luego presenta un listado de **entre 15 a 20 comparables** usando EXACTAMENTE este formato (usa la etiqueta <br> para saltos de l\xEDnea):

**[T\xEDtulo descriptivo del inmueble]**<br>
[Tipo de inmueble] | [Venta/Arriendo]<br>
$[Precio] | [\xC1rea] m\xB2 | [Hab] hab | [Ba\xF1os] ba\xF1os<br>
[Barrio] | [Ciudad]<br>
**[Fuente]**

Ejemplo:
**Apartamento en Condina, Pereira**<br>
Apartamento | Venta<br>
- Calcula el valor promedio por m\xB2 del mercado bas\xE1ndote en los comparables de venta filtrados.
- Indica el valor por m\xB2 FINAL que decides usar (ajustado por antig\xFCedad, estado, etc.).
- Calcula el valor estimado: Precio por m\xB2 final \xD7 ${areaConstruida || "\xE1rea"} m\xB2.

${!esLote ? `### 2.2. M\xE9todo de Rentabilidad (Yield Mensual)
- **C\xC1LCULO DEL CANON:** No uses un promedio simple de precios totales.
  1. Calcula el precio por m\xB2 de arriendo de cada comparable (Precio / \xC1rea).
  2. Obt\xE9n el promedio de canon/m\xB2.
  3. Multiplica ese promedio por los ${areaConstruida || "metros"} m\xB2 del inmueble objetivo para obtener el Canon Mensual Estimado.
- Investiga y Estima el Yield mensual promedio del sector (ej: 0.4% - 0.6%).
- Presenta el Yield mensual promedio del sector **Yield promedio mercado: 0.45%**
- Aplica la f\xF3rmula: Valor estimado = Canon Mensual Estimado / Yield mensual promedio.` : ""}

## 3. RESULTADOS FINALES
Entrega de forma clara:
- **Valor Recomendado de Venta: $XXX.XXX.XXX** (valor \xFAnico, ajustado por todos los factores)
- **Rango sugerido: $XXX.XXX.XXX - $XXX.XXX.XXX** (rango de publicaci\xF3n recomendado)
- Precio por m\xB2 final usado para el c\xE1lculo.
- Comentario sobre la posici\xF3n del inmueble en el mercado (liquidez).

## 4. AJUSTES APLICADOS
Explica ajustes aplicados por antig\xFCedad, estado, parqueadero, caracter\xEDsticas especiales, etc.

## 5. LIMITACIONES
Menciona escasez de datos, dependencias de promedios regionales, o cualquier limitaci\xF3n del an\xE1lisis.

## 6. RESUMEN EJECUTIVO
Cierra con 2-3 p\xE1rrafos claros que incluyan:
1. Valor t\xE9cnico recomendado
2. Rango de publicaci\xF3n sugerido
3. Estrategia de venta y posicionamiento de mercado

FORMATO FINAL
--------
- La secci\xF3n 1 DEBE usar el formato de lista especificado (NO tabla markdown).
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
          temperature: 0.1
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
Del siguiente texto (que contiene listados y an\xE1lisis), extrae un JSON estructurado.

TEXTO:
${perplexityContent}

INSTRUCCIONES DE EXTRACCI\xD3N:
1. "comparables": Extrae CADA INMUEBLE del listado (formato multi-l\xEDnea, NO tabla).
   Cada comparable sigue este patr\xF3n:
   
   **T\xEDtulo**
   Tipo | Venta/Arriendo
   Precio | \xC1rea | Habitaciones | Ba\xF1os
   Barrio | Ciudad
   **Fuente**
   
   Extrae:
   - "titulo": Texto entre ** ** de la primera l\xEDnea (sin etiquetas HTML)
   - "tipo_inmueble": Texto antes del | en la segunda l\xEDnea (sin etiquetas HTML)
   - "tipo_operacion": Texto despu\xE9s del | en la segunda l\xEDnea ("Venta" o "Arriendo")
   - "precio_lista": N\xFAmero ENTERO (sin puntos, sin comas, sin $) extra\xEDdo de la tercera l\xEDnea.
   - "area": N\xFAmero (puede tener decimales) antes de "m\xB2" en la tercera l\xEDnea.
   - "habitaciones": N\xFAmero antes de "hab" en la tercera l\xEDnea
   - "banos": N\xFAmero antes de "ba\xF1os" en la tercera l\xEDnea
   - "barrio": Texto antes del | en la cuarta l\xEDnea (sin etiquetas HTML)
   - "ciudad": Texto despu\xE9s del | en la cuarta l\xEDnea (sin etiquetas HTML)
   - "fuente": Texto entre ** ** de la \xFAltima l\xEDnea

   IMPORTANTE: Elimina cualquier etiqueta HTML (como <br>) de los valores extra\xEDdos.

2. "resumen_mercado": Extrae un resumen conciso (m\xE1ximo 2 p\xE1rrafos) de la secci\xF3n "RESUMEN EJECUTIVO". Prioriza la valoraci\xF3n y la rentabilidad.

3. "yield_zona": ${esLote ? "IGNORAR (Devolver null)" : 'Busca la frase exacta "Yield promedio mercado: X.XX%" en el texto. Extrae SOLO el n\xFAmero como decimal (ej: si dice "0.45%", devuelve 0.0045).'}

4. "valor_recomendado_venta": Busca "Valor Recomendado de Venta: $XXX.XXX.XXX".
   Extrae el n\xFAmero ENTERO (elimina puntos y $).

5. "rango_sugerido_min": Busca "Rango sugerido: $XXX.XXX.XXX - $YYY.YYY.YYY". Extrae el primer n\xFAmero (ENTERO).

6. "rango_sugerido_max": Extrae el segundo n\xFAmero del rango sugerido (ENTERO).

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
            { role: "system", content: "Eres un extractor JSON experto. Extrae numeros LIMPIOS (ej: 4200000, no 4.200.000)." },
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
        const match = content.match(/```(?:json)?\\s*([\\s\\S]*?)```/i);
        if (match && match[1]) content = match[1].trim();
      }
      extractedData = JSON.parse(content);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Error Parseo DeepSeek", details: e.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const sanitizePrice = /* @__PURE__ */ __name((n) => {
      if (typeof n === "number") return Number.isFinite(n) ? n : null;
      if (typeof n === "string") {
        const clean = n.replace(/\\D/g, "");
        const val = parseInt(clean, 10);
        return Number.isFinite(val) && val > 0 ? val : null;
      }
      return null;
    }, "sanitizePrice");
    const sanitizeFloat = /* @__PURE__ */ __name((n) => {
      if (typeof n === "number") return Number.isFinite(n) ? n : null;
      if (typeof n === "string") {
        const clean = n.replace(",", ".").replace(/[^\\d.]/g, "");
        const val = parseFloat(clean);
        return Number.isFinite(val) ? val : null;
      }
      return null;
    }, "sanitizeFloat");
    const yieldDefault = 5e-3;
    const yieldExtracted = sanitizeFloat(extractedData.yield_zona);
    const yieldFinal = yieldExtracted || yieldDefault;
    console.log(`Yield usado: ${(yieldFinal * 100).toFixed(2)}% mensual (${yieldExtracted ? "extra\xEDdo de mercado" : "fallback"})`);
    const yieldFuente = yieldExtracted ? "mercado" : "fallback";
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
    const comparablesRaw = (extractedData.comparables || []).map((c) => {
      const areaComp = sanitizeFloat(c.area);
      const precioLista = sanitizePrice(c.precio_lista);
      const esArriendo = c.tipo_operacion?.toLowerCase().includes("arriendo");
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
      const barrioClean = c.barrio && c.barrio !== "\u2014" && c.barrio !== "-" ? c.barrio : formData.barrio || `${formData.municipio} (Zona General)`;
      return {
        titulo: c.titulo || "Inmueble",
        tipo_origen: esArriendo ? "arriendo" : "venta",
        tipo_inmueble: c.tipo_inmueble || tipoInmueble,
        barrio: barrioClean,
        municipio: c.ciudad || formData.municipio,
        area_m2: areaComp,
        habitaciones: sanitizeFloat(c.habitaciones),
        banos: sanitizeFloat(c.banos),
        precio_publicado: precioLista,
        precio_cop: precioVentaEstimado,
        precio_m2: precioM2,
        yield_mensual: esArriendo ? yieldFinal : null,
        fuente: c.fuente
      };
    }).filter((c) => c && c.precio_cop > 0 && c.area_m2 > 0);
    if (comparablesRaw.length < 3) {
      return new Response(
        JSON.stringify({
          error: "Datos insuficientes",
          details: `Solo se encontraron ${comparablesRaw.length} comparables v\xE1lidos.`,
          perplexity_full_text: perplexityContent
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const normalizeText = /* @__PURE__ */ __name((str) => str?.normalize("NFD").replace(/\\p{Diacritic}/gu, "").toLowerCase().trim() || "", "normalizeText");
    const uniqueComparables = [];
    const seenKeys = /* @__PURE__ */ new Set();
    for (const comp of comparablesRaw) {
      const key = `${normalizeText(comp.titulo)}-${comp.precio_cop}-${comp.area_m2}-${normalizeText(comp.tipo_inmueble)}-${normalizeText(comp.barrio)}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueComparables.push(comp);
      }
    }
    console.log(`Deduplicaci\xF3n: ${comparablesRaw.length} \u2192 ${uniqueComparables.length} comparables`);
    const minArea = area * 0.5;
    const maxArea = area * 1.8;
    const comparablesFiltradosPorArea = uniqueComparables.filter(
      (c) => c.area_m2 >= minArea && c.area_m2 <= maxArea
    );
    console.log(`Filtro \xE1rea (${minArea.toFixed(0)}-${maxArea.toFixed(0)} m\xB2): ${uniqueComparables.length} \u2192 ${comparablesFiltradosPorArea.length}`);
    let comparablesLimpios = comparablesFiltradosPorArea;
    if (comparablesFiltradosPorArea.length >= 4) {
      const preciosM2 = comparablesFiltradosPorArea.map((c) => c.precio_m2).sort((a, b) => a - b);
      const p50 = preciosM2[Math.floor(preciosM2.length * 0.5)];
      const p75 = preciosM2[Math.floor(preciosM2.length * 0.75)];
      const minPrecioM2 = p50 * 0.5;
      const maxPrecioM2 = p75 * 2;
      const filtradosPorPrecio = comparablesFiltradosPorArea.filter(
        (c) => c.precio_m2 >= minPrecioM2 && c.precio_m2 <= maxPrecioM2
      );
      if (filtradosPorPrecio.length >= 3) {
        comparablesLimpios = filtradosPorPrecio;
        console.log(`Filtro precio/m\xB2 (${minPrecioM2.toFixed(0)}-${maxPrecioM2.toFixed(0)}): ${comparablesFiltradosPorArea.length} \u2192 ${filtradosPorPrecio.length}`);
      } else {
        console.log(`Filtro precio/m\xB2 omitido (quedar\xEDan solo ${filtradosPorPrecio.length} comparables)`);
      }
    }
    if (comparablesLimpios.length < 3) {
      comparablesLimpios = comparablesFiltradosPorArea.length >= 3 ? comparablesFiltradosPorArea : uniqueComparables;
      console.log(`Fallback: usando ${comparablesLimpios.length} comparables sin filtros estrictos`);
    }
    const compsVenta = comparablesLimpios.filter((c) => c.tipo_origen === "venta");
    const compsArriendo = comparablesLimpios.filter((c) => c.tipo_origen === "arriendo");
    let valorVentaDirecta = null;
    let precioM2Promedio = 0;
    if (compsVenta.length > 0) {
      const sumM2 = compsVenta.reduce((acc, c) => acc + c.precio_m2, 0);
      precioM2Promedio = Math.round(sumM2 / compsVenta.length);
      valorVentaDirecta = Math.round(precioM2Promedio * area);
    }
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
    const valorRecomendado = sanitizePrice(extractedData.valor_recomendado_venta);
    let valorPonderado = null;
    if (esLote) {
      valorPonderado = valorVentaDirecta;
    } else {
      valorPonderado = valorVentaDirecta && valorRentabilidad && compsArriendo.length > 0 ? Math.round(valorVentaDirecta * 0.6 + valorRentabilidad * 0.4) : null;
    }
    const valorFinal = valorRecomendado || valorVentaDirecta || valorRentabilidad || 0;
    const valorFuente = valorRecomendado ? "perplexity" : "calculado";
    if (esLote && valorRecomendado) {
      valorVentaDirecta = valorRecomendado;
      precioM2Promedio = Math.round(valorRecomendado / area);
    }
    console.log(`Valor final: $${valorFinal.toLocaleString()} (fuente: ${valorFuente})`);
    const precioM2Usado = precioM2Promedio || (valorFinal > 0 ? Math.round(valorFinal / area) : 0);
    const rangoMin = sanitizePrice(extractedData.rango_sugerido_min) || Math.round(valorFinal * 0.95);
    const rangoMax = sanitizePrice(extractedData.rango_sugerido_max) || Math.round(valorFinal * 1.05);
    const comparablesParaTabla = comparablesLimpios.map((c) => {
      let fuente = c.fuente || "Portal Inmobiliario";
      if (typeof fuente === "string") {
        fuente = fuente.replace(/Clencuadras/i, "Ciencuadras").replace(/Fincaraiz/i, "FincaRa\xEDz").replace(/MetroCuadrado/i, "Metrocuadrado").replace(/Mercadolibre/i, "MercadoLibre");
      }
      return { ...c, fuente };
    });
    const resultado = {
      resumen_busqueda: extractedData.resumen_mercado || "An\xE1lisis de mercado realizado.",
      valor_final: valorFinal,
      valor_fuente: valorFuente,
      valor_ponderado_referencia: valorPonderado,
      rango_valor_min: rangoMin,
      rango_valor_max: rangoMax,
      rango_fuente: extractedData.rango_sugerido_min ? "perplexity" : "calculado",
      valor_estimado_venta_directa: valorVentaDirecta,
      valor_estimado_rentabilidad: valorRentabilidad,
      precio_m2_final: precioM2Usado,
      metodo_mercado_label: "Enfoque de Mercado (promedio real)",
      metodo_ajuste_label: valorRecomendado ? "Ajuste de Perplexity (criterio t\xE9cnico)" : "Promedio de Mercado",
      comparables: comparablesParaTabla,
      // CORRECCIÓN 3: Contadores consistentes
      comparables_totales_encontrados: comparablesRaw.length,
      comparables_despues_deduplicacion: uniqueComparables.length,
      comparables_usados_en_calculo: comparablesLimpios.length,
      total_comparables: comparablesParaTabla.length,
      // Alias para compatibilidad
      // CORRECCIÓN 5: Defaults completos de ficha técnica
      ficha_tecnica_defaults: {
        barrio: formData.barrio || `${formData.municipio} (No especificado)`,
        direccion: formData.direccion || "No especificada",
        uso_lote: formData.uso_lote || (esLote ? "No especificado" : null),
        habitaciones: formData.habitaciones || "No especificado",
        banos: formData.banos || "No especificado",
        garajes: "No especificado",
        estrato: "No especificado",
        antiguedad: formData.antiguedad || "No especificada"
      },
      // CORRECCIÓN 4: yield con fuente
      yield_mensual_mercado: yieldFinal,
      yield_fuente: yieldFuente,
      area_construida: area,
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
