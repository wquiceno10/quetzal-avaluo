var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
console.log("Deploy test - " + (/* @__PURE__ */ new Date()).toISOString());
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
    if (!PERPLEXITY_API_KEY) {
      return new Response(
        JSON.stringify({ error: "PERPLEXITY_API_KEY no configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!DEEPSEEK_API_KEY) {
      return new Response(
        JSON.stringify({ error: "DEEPSEEK_API_KEY no configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const tipoInmueble = formData.tipo_inmueble || "inmueble";
    const ubicacionPrincipal = formData.nombre_conjunto && formData.contexto_zona === "conjunto_cerrado" ? `${formData.nombre_conjunto}, ${formData.barrio}, ${formData.municipio}` : `${formData.barrio}, ${formData.municipio}`;
    const ubicacionCiudad = `${formData.municipio}, ${formData.departamento}`;
    const infoInmueble = `
- Tipo: ${tipoInmueble}
- Ubicaci\xF3n principal: ${ubicacionPrincipal}
- Ciudad: ${ubicacionCiudad}
- \xC1rea construida: ${formData.area_construida} m\xB2
- Habitaciones: ${formData.habitaciones || "No especificado"}
- Ba\xF1os: ${formData.banos || "No especificado"}
- Parqueadero: ${formData.tipo_parqueadero || "No especificado"}
- Estado: ${formData.estado_inmueble || "No especificado"}
- Antig\xFCedad: ${formData.antiguedad || "No especificada"}
${formData.tipo_remodelacion ? `- Tipo de remodelaci\xF3n: ${formData.tipo_remodelacion}` : ""}
${formData.informacion_complementaria ? `- Informaci\xF3n adicional: ${formData.informacion_complementaria}` : ""}
  `.trim();
    const areaConstruida = formData.area_construida ? parseInt(formData.area_construida) : null;
    const margenArea = 0.3;
    const minArea = areaConstruida ? Math.round(areaConstruida * (1 - margenArea)) : null;
    const maxArea = areaConstruida ? Math.round(areaConstruida * (1 + margenArea)) : null;
    const areaInstruction = areaConstruida ? `

CRITERIOS DE SELECCI\xD3N PARA COMPARABLES DE VENTA:
   - \xC1rea construida del inmueble objetivo: ${areaConstruida} m\xB2
   - Rango de \xE1reas aceptable para comparables de venta: ${minArea} a ${maxArea} m\xB2 (\xB130%)
   - SOLO incluye comparables de venta cuyas \xE1reas est\xE9n dentro de este rango.
   - Para arriendos, el \xE1rea puede ser m\xE1s flexible pero intenta mantenerla similar.` : "";
    const perplexityPrompt = `
Eres un analista inmobiliario especializado en aval\xFAos comerciales t\xE9cnicos y estimaci\xF3n de valor apoyada en datos estad\xEDsticos del mercado colombiano.
Tu tarea es elaborar un **an\xE1lisis completo, claro y profesional**, incluso cuando la informaci\xF3n disponible sea limitada.

DATOS DEL INMUEBLE
-------------------
Basado en estos datos proporcionados por el usuario:

${infoInmueble}

INSTRUCCIONES GENERALES
------------------------
1. Si no encuentras suficientes datos reales en portales inmobiliarios, DEBES complementar con:
   - Estad\xEDsticas municipales y regionales (promedios por m\xB2 seg\xFAn ciudad y estrato).
   - Barrios de caracter\xEDsticas socioecon\xF3micas similares (mismo estrato, antig\xFCedad promedio, tipolog\xEDa).
   - Valores t\xEDpicos de mercado seg\xFAn tama\xF1o del inmueble y ubicaci\xF3n.
2. NUNCA devuelvas valores "0", "null", "N/A" o similares.
3. Si un dato no aparece directamente, GENERA una estimaci\xF3n razonable basada en promedios municipales, del estrato o del tipo de inmueble.
4. Siempre entrega comparables suficientes aunque no existan exactos en la zona:
   - Entrega idealmente entre 15 y 25 comparables en total (si el mercado lo permite).
   - Incluye propiedades en arriendo. Incluye al menos 3.
   - Incluye propiedades de barrios similares (en barrios cercanos o condiciones socioecon\xF3micas equivalentes, rangos de area y precios comparables). Incluye al menos 3.
   ${areaInstruction}
5. NO incluyas hiperv\xEDnculos ni enlaces. Solo textos descriptivos.
6. Incluye precios, \xE1reas y valores de mercado siempre en pesos colombianos.
7. Responde SIEMPRE en espa\xF1ol.
8. AL FINAL DEL AN\xC1LISIS, agrega una secci\xF3n expl\xEDcita llamada "FUENTES CONSULTADAS" donde listes los dominios de los portales visitados (ej: fincaraiz.com.co, metrocuadrado.com, ciencuadras.com).

TAREAS
------

## 1. B\xDASQUEDA Y SELECCI\xD3N DE COMPARABLES

Primero, comenta brevemente qu\xE9 tan abundante o escasa es la informaci\xF3n del mercado para este inmueble.

Luego presenta un listado de **entre 15 a 25 comparables**. Para cada uno indica:

- T\xEDtulo o descripci\xF3n del inmueble.
- Barrio y municipio.
- Tipo de operaci\xF3n: Venta o Arriendo.
- Si el barrio es:
  - "Mismo barrio/conjunto"
  - "Barrio similar (mismo estrato y tipolog\xEDa)"
  - "Zona cercana de referencia regional"
- \xC1rea aproximada en m\xB2.
- Precio total aproximado.
- Precio por m\xB2 aproximado.

Aunque la informaci\xF3n de portales no sea perfecta, debes estimar valores razonables usando contexto de mercado (ciudad, estrato, tipo de inmueble).

## 2. AN\xC1LISIS DEL VALOR

### 2.1. M\xE9todo de Venta Directa (Precio por m\xB2)

- Explica c\xF3mo calculas el valor promedio por m\xB2 del mercado para este inmueble:
  - Si usas promedio simple, recortado o ponderado.
  - Si combina datos del barrio, barrios similares y promedios municipales.
- Indica el valor por m\xB2 FINAL que decides usar para el c\xE1lculo del inmueble objetivo.
- Calcula el valor estimado del inmueble objetivo por este m\xE9todo (precio por m\xB2 x \xE1rea).

### 2.2. M\xE9todo de Rentabilidad (Yield mensual promedio del mercado)

- Estima el canon de arrendamiento mensual promedio para este inmueble usando los comparables.
- Estima el Yield (Rentabilidad) mensual promedio del sector (ej: 0.4%, 0.5%, 0.6%).
- Apl\xEDcalo a la f\xF3rmula:

  Valor estimado = Canon mensual estimado / Yield mensual estimado

- Indica claramente el Canon mensual y el Yield mensual utilizados.
- Calcula el valor estimado del inmueble objetivo por este m\xE9todo.

## 3. RESULTADOS FINALES

Entrega de forma clara:

- Valor comercial estimado (promedio ponderado entre ambos m\xE9todos, explica cu\xE1l pesa m\xE1s y por qu\xE9).
- Rango sugerido de negociaci\xF3n (m\xEDnimo y m\xE1ximo razonables).
- Precio por m\xB2 final usado para el c\xE1lculo.
- Comentario sobre si el resultado se ubica en la parte baja, media o alta del mercado del sector.

## 4. AJUSTES APLICADOS

Explica qu\xE9 ajustes aplicas y por qu\xE9:

- Ajustes por antig\xFCedad vs. comparables.
- Ajustes por estado de conservaci\xF3n (bueno, regular, excelente).
- Ajustes por parqueadero (tener, no tener, tipo).
- Ajustes por remodelaciones (mejoras significativas o necesidad de inversi\xF3n).
- Ajustes por entorno (plusval\xEDa del sector, accesos, comercio, servicios).

## 5. LIMITACIONES

Menciona las principales limitaciones del an\xE1lisis:

- Escasez de datos reales en el barrio.
- Dependencia de promedios municipales o regionales.
- Diferencias de estrato o tipolog\xEDa entre comparables.

## 6. RESUMEN EJECUTIVO PARA EL PROPIETARIO

Cierra con 1 a 2 p\xE1rrafos claros que expliquen:

- El valor final recomendado.
- El rango sugerido de publicaci\xF3n.
- El nivel de confianza del an\xE1lisis.
- Recomendaciones de estrategia (publicar un poco arriba del valor recomendado, m\xE1rgenes de negociaci\xF3n, etc.).

FORMATO
--------
- No uses tablas Markdown.
- Usa subt\xEDtulos y listas claras.
- NO devuelvas JSON.
- NO incluyas enlaces.
- Aseg\xFArate de incluir la secci\xF3n "FUENTES CONSULTADAS" al final con los dominios de los portales.
`.trim();
    let perplexityContent = "";
    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content: "Eres un valuador inmobiliario colombiano experto en an\xE1lisis de mercado residencial y comercial."
            },
            {
              role: "user",
              content: perplexityPrompt
            }
          ],
          temperature: 0.25,
          max_tokens: 8e3
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Perplexity API error:", response.status, errorText);
        return new Response(
          JSON.stringify({
            error: `Error en Perplexity (${response.status})`,
            details: errorText
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const perplexityResponse = await response.json();
      perplexityContent = perplexityResponse.choices && perplexityResponse.choices[0] && perplexityResponse.choices[0].message && perplexityResponse.choices[0].message.content || "";
      console.log(
        "Perplexity Raw Content (first 2000 chars):",
        perplexityContent.slice(0, 2e3)
      );
    } catch (err) {
      console.error("Perplexity request failed:", err);
      return new Response(
        JSON.stringify({ error: "Error al llamar a Perplexity", details: err.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!perplexityContent) {
      return new Response(
        JSON.stringify({ error: "Perplexity devolvi\xF3 una respuesta vac\xEDa" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const jsonSchema = {
      type: "object",
      properties: {
        resumen_busqueda: {
          type: "string",
          description: "Resumen ejecutivo completo y rico en detalles, explicando las variables usadas, el valor m\xB2 y las principales conclusiones. DEBE SER EXTENSO Y EXPLICATIVO."
        },
        total_comparables: { type: "number" },
        total_comparables_venta: { type: "number" },
        total_comparables_arriendo: { type: "number" },
        portales_consultados: {
          type: "array",
          items: { type: "string" }
        },
        valor_final: {
          type: ["number", "null"],
          description: 'Valor final recomendado expl\xEDcitamente en el an\xE1lisis (ej: "Valor recomendado: $270.000.000")'
        },
        valor_estimado_venta_directa: { type: ["number", "null"] },
        precio_m2_venta_directa: { type: ["number", "null"] },
        metodologia_venta_directa: { type: ["string", "null"] },
        valor_estimado_rentabilidad: { type: ["number", "null"] },
        canon_arriendo_promedio: { type: ["number", "null"] },
        metodologia_rentabilidad: { type: ["string", "null"] },
        yield_mensual_mercado: {
          type: ["number", "null"],
          description: "Yield mensual promedio del mercado seg\xFAn el an\xE1lisis (ej: 0.0055 para 0.55%)"
        },
        rango_valor_min: { type: ["number", "null"] },
        rango_valor_max: { type: ["number", "null"] },
        precio_m2_usado: { type: ["number", "null"] },
        metodo_calculo_m2: { type: ["string", "null"] },
        precio_m2_regional: { type: ["number", "null"] },
        ajustes_antiguedad: { type: ["string", "null"] },
        ajustes_parqueadero: { type: ["string", "null"] },
        limitaciones: { type: ["string", "null"] },
        comparables: {
          type: "array",
          items: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              tipo_origen: { type: "string", enum: ["venta", "arriendo"] },
              fuente_zona: {
                type: ["string", "null"],
                description: '"Mismo barrio/conjunto", "Barrio similar", "Zona cercana de referencia regional", etc.'
              },
              barrio: { type: ["string", "null"] },
              municipio: { type: ["string", "null"] },
              area_m2: { type: ["number", "null"] },
              habitaciones: { type: ["number", "null"] },
              banos: { type: ["number", "null"] },
              precio_publicado: { type: ["number", "null"] },
              precio_cop: { type: ["number", "null"] },
              precio_m2: { type: ["number", "null"] },
              yield_mensual: {
                type: ["number", "null"],
                description: "Yield mensual si es comparable de arriendo (ej: 0.0052 para 0.52%)"
              }
            }
          }
        }
      },
      required: ["comparables"]
    };
    const extractionPrompt = `
A partir del siguiente AN\xC1LISIS COMERCIAL INMOBILIARIO, extrae la informaci\xF3n en el esquema JSON especificado.

INFORMACI\xD3N DEL INMUEBLE:
${infoInmueble}

AN\xC1LISIS DE MERCADO (texto generado por Perplexity):
${perplexityContent}

INSTRUCCIONES PARA LA EXTRACCI\xD3N:

1. EXTRACCI\xD3N COMPLETA DE COMPARABLES
   - Extrae TODOS los comparables que aparecen en el an\xE1lisis.
   - NO filtres, NO omitas, NO apliques criterios de \xE1rea o precio.
   - Incluye todos los comparables que encuentres, tanto de venta como de arriendo.
   - Si el an\xE1lisis menciona "al menos 15-25 comparables", espera extraer esa cantidad.

2. VALOR FINAL RECOMENDADO
   - Busca en el an\xE1lisis frases como:
     * "Valor recomendado: $XXX.XXX.XXX"
     * "Valor comercial estimado: $XXX.XXX.XXX" 
     * "Valor final recomendado: $XXX.XXX.XXX"
     * "Valor sugerido: $XXX.XXX.XXX"
   - Extrae ese n\xFAmero exacto como "valor_final".

3. PARA CADA COMPARABLE
   - Llena el arreglo "comparables" con TODOS los elementos que encuentres.
   - Para cada comparable identifica:
     * titulo: nombre o descripci\xF3n breve.
     * tipo_origen: "venta" o "arriendo".
     * fuente_zona: "Mismo barrio/conjunto", "Barrio similar", etc.
     * barrio y municipio.
     * area_m2: \xE1rea aproximada.
     * habitaciones y banos: si est\xE1n mencionados.
     * precio_publicado: precio total aproximado.
     * precio_cop: igual a precio_publicado (si es venta) o valor estimado de venta si es arriendo (canon / yield apropiado).
     * precio_m2: precio_cop / area_m2 si el texto no lo da expl\xEDcito.
     * yield_mensual: si es comparable de arriendo y se menciona el rendimiento.

4. TOTALES
   - total_comparables: n\xFAmero total de comparables listados (debe coincidir con el tama\xF1o del arreglo).
   - total_comparables_venta: cu\xE1ntos comparables son de venta.
   - total_comparables_arriendo: cu\xE1ntos comparables son de arriendo.

5. INDICADORES GLOBALES
   - valor_estimado_venta_directa: valor de venta calculado por el m\xE9todo de precio por m\xB2.
   - valor_estimado_rentabilidad: valor calculado como (canon_arriendo_promedio / yield_mensual_mercado).
   - canon_arriendo_promedio: canon mensual estimado.
   - yield_mensual_mercado: yield mensual estimado (ej: 0.005).
   - rango_valor_min y rango_valor_max: rango de negociaci\xF3n recomendado.
   - precio_m2_usado: valor m\xB2 final usado en el c\xE1lculo.

6. PORTALES CONOCIDOS
   - portales_consultados: Extrae los dominios listados en la secci\xF3n "FUENTES CONSULTADAS" del an\xE1lisis. Si no existe esa secci\xF3n, busca menciones de portales en el texto.

7. AJUSTES Y LIMITACIONES
   - ajustes_antiguedad, ajustes_parqueadero, limitaciones.

8. RESUMEN
   - resumen_busqueda: 1 - 2 p\xE1rrafos orientados al propietario.

REGLA IMPORTANTE:
   - Extrae TODOS los comparables sin filtrar. El an\xE1lisis ya aplic\xF3 filtros de \xE1rea y relevancia.
   - Usa null para datos faltantes, nunca 0.
`.trim();
    try {
      const deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "Eres un asistente experto en an\xE1lisis y extracci\xF3n de datos estructurados de textos de aval\xFAos inmobiliarios. TU SALIDA DEBE SER \xDANICAMENTE UN JSON V\xC1LIDO QUE SIGA EL ESQUEMA SOLICITADO. NO incluyas bloques de c\xF3digo markdown (```json), solo el JSON puro."
            },
            {
              role: "user",
              content: extractionPrompt
            }
          ],
          // response_format removed as it causes 400 error
          temperature: 0.1
        })
      });
      if (!deepseekResponse.ok) {
        const errorText = await deepseekResponse.text();
        console.error("DeepSeek API error:", deepseekResponse.status, errorText);
        return new Response(
          JSON.stringify({
            error: `Error en DeepSeek (${deepseekResponse.status})`,
            details: errorText,
            perplexity_full_text: perplexityContent
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const deepseekData = await deepseekResponse.json();
      let content = deepseekData.choices[0].message.content;
      content = content.replace(/```json\n?|```/g, "").trim();
      const extractedData = JSON.parse(content);
      if (!extractedData.valor_final) {
        const match = perplexityContent.match(/valor\s+(?:comercial|recomendado|sugerido|final).*?\$?\s*([\d.,]+)/i);
        if (match) extractedData.valor_final = parseFloat(match[1].replace(/[.,](?=\d{3})/g, "").replace(",", "."));
      }
      if (!extractedData.valor_estimado_venta_directa) {
        const match = perplexityContent.match(/venta\s+directa.*?\$?\s*([\d.,]+)/i);
        if (match) extractedData.valor_estimado_venta_directa = parseFloat(match[1].replace(/[.,](?=\d{3})/g, "").replace(",", "."));
      }
      if (!extractedData.valor_estimado_rentabilidad) {
        const match = perplexityContent.match(/rentabilidad.*?\$?\s*([\d.,]+)/i);
        if (match) extractedData.valor_estimado_rentabilidad = parseFloat(match[1].replace(/[.,](?=\d{3})/g, "").replace(",", "."));
      }
      console.log(
        "DeepSeek Extracted Data (first part):",
        JSON.stringify(extractedData, null, 2).slice(0, 2e3)
      );
      const comparablesRaw = Array.isArray(extractedData.comparables) ? extractedData.comparables : [];
      const sanitizeNumber = /* @__PURE__ */ __name((n) => {
        if (typeof n !== "number") return null;
        if (!isFinite(n)) return null;
        if (n === 0) return null;
        return n;
      }, "sanitizeNumber");
      const crearComparable = /* @__PURE__ */ __name((c, yieldMercado2) => {
        if (!c || typeof c !== "object") {
          console.warn("Comparable raw es null o no es objeto:", c);
          return null;
        }
        const area = sanitizeNumber(c.area_m2);
        let precioPublicado = sanitizeNumber(c.precio_publicado);
        let precioCop = sanitizeNumber(c.precio_cop);
        let precioM2 = sanitizeNumber(c.precio_m2);
        const yieldComparable = sanitizeNumber(c.yield_mensual);
        const tipoRaw = (c.tipo_origen || "").toString().toLowerCase();
        const esArriendo = tipoRaw.includes("arriendo");
        if (esArriendo && precioPublicado && !precioCop) {
          const yieldToUse = yieldComparable || yieldMercado2 || 5e-3;
          if (yieldToUse > 0) {
            precioCop = Math.round(precioPublicado / yieldToUse);
            console.log(`\u{1F4B0} Conversi\xF3n arriendo: ${precioPublicado} / ${yieldToUse} = ${precioCop}`);
          }
        } else if (esArriendo && precioCop && precioPublicado && Math.abs(precioCop - precioPublicado) < 1e6) {
          const yieldToUse = yieldComparable || yieldMercado2 || 5e-3;
          if (yieldToUse > 0) {
            precioCop = Math.round(precioPublicado / yieldToUse);
            console.log(`\u{1F504} Correcci\xF3n: ${precioPublicado} \u2192 ${precioCop} (yield: ${yieldToUse})`);
          }
        }
        if (!precioCop && precioPublicado && !esArriendo) {
          precioCop = precioPublicado;
        }
        if (!precioM2 && precioCop && area) {
          precioM2 = Math.round(precioCop / area);
        }
        return {
          titulo: c.titulo || "Propiedad comparable",
          tipo_origen: esArriendo ? "arriendo" : "venta",
          fuente_zona: c.fuente_zona || null,
          barrio: c.barrio || null,
          municipio: c.municipio || null,
          area_m2: area,
          habitaciones: sanitizeNumber(c.habitaciones),
          banos: sanitizeNumber(c.banos),
          precio_publicado: precioPublicado,
          precio_cop: precioCop,
          precio_m2: precioM2,
          yield_mensual: yieldComparable
        };
      }, "crearComparable");
      const calcularPromedioM2Ventas = /* @__PURE__ */ __name((comps) => {
        const ventas = comps.filter(
          (c) => c.tipo_origen === "venta" && c.precio_m2 && c.precio_m2 > 0
        );
        if (ventas.length === 0) return null;
        const suma = ventas.reduce((total, c) => total + c.precio_m2, 0);
        return Math.round(suma / ventas.length);
      }, "calcularPromedioM2Ventas");
      const normalizarPortal = /* @__PURE__ */ __name((p) => {
        if (!p || typeof p !== "string") return null;
        const limpio = p.trim().toLowerCase();
        if (!limpio) return null;
        const dominio = limpio.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0].split("?")[0];
        return dominio || null;
      }, "normalizarPortal");
      const yieldMercado = sanitizeNumber(extractedData.yield_mensual_mercado) || 5e-3;
      const comparables = comparablesRaw.map((c) => crearComparable(c, yieldMercado)).filter((c) => c !== null);
      console.log(`\u2705 Comparables extra\xEDdos: ${comparables.length}`);
      console.log(`\u{1F4CA} Distribuci\xF3n: ${comparables.filter((c) => c.tipo_origen === "venta").length} venta, ${comparables.filter((c) => c.tipo_origen === "arriendo").length} arriendo`);
      const promedioM2Ventas = calcularPromedioM2Ventas(comparables);
      if (promedioM2Ventas) {
        console.log(`\u{1F4C8} Promedio precio/m\xB2 ventas: ${promedioM2Ventas.toLocaleString()}`);
        const preciosM2Ventas = comparables.filter((c) => c.tipo_origen === "venta" && c.precio_m2).map((c) => c.precio_m2).sort((a, b) => a - b);
        if (preciosM2Ventas.length >= 2) {
          const minPrecioM2 = preciosM2Ventas[0];
          const maxPrecioM2 = preciosM2Ventas[preciosM2Ventas.length - 1];
          console.log(`\u{1F3AF} Rango precio/m\xB2: ${minPrecioM2.toLocaleString()} - ${maxPrecioM2.toLocaleString()}`);
        }
      }
      const totalComparables = comparables.length;
      const totalVenta = comparables.filter((c) => c.tipo_origen === "venta").length;
      const totalArriendo = comparables.filter((c) => c.tipo_origen === "arriendo").length;
      const portalesSet = /* @__PURE__ */ new Set();
      if (Array.isArray(extractedData.portales_consultados)) {
        for (const p of extractedData.portales_consultados) {
          const dom = normalizarPortal(p);
          if (dom) portalesSet.add(dom);
        }
      }
      const portales_consultados = Array.from(portalesSet);
      const precioM2UsadoDirecto = sanitizeNumber(extractedData.precio_m2_usado);
      const precioM2VentaDirecta = sanitizeNumber(extractedData.precio_m2_venta_directa);
      const precioM2Final = precioM2UsadoDirecto || precioM2VentaDirecta || promedioM2Ventas;
      const yieldDelAnalisis = sanitizeNumber(extractedData.yield_mensual_mercado);
      const yieldFinal = yieldDelAnalisis || yieldMercado;
      let valVentaDirecta = sanitizeNumber(extractedData.valor_estimado_venta_directa);
      if (!valVentaDirecta && precioM2Final && areaConstruida) {
        valVentaDirecta = Math.round(precioM2Final * areaConstruida);
        console.log(`\u{1F9EE} Recalculando Valor Venta Directa: ${precioM2Final} * ${areaConstruida} = ${valVentaDirecta}`);
      }
      let valRentabilidad = sanitizeNumber(extractedData.valor_estimado_rentabilidad);
      const canonPromedio = sanitizeNumber(extractedData.canon_arriendo_promedio);
      if (!valRentabilidad && canonPromedio && yieldFinal) {
        valRentabilidad = Math.round(canonPromedio / yieldFinal);
        console.log(`\u{1F9EE} Recalculando Valor Rentabilidad: ${canonPromedio} / ${yieldFinal} = ${valRentabilidad}`);
      }
      let valFinal = sanitizeNumber(extractedData.valor_final);
      if (!valFinal) {
        if (valVentaDirecta && valRentabilidad) {
          valFinal = Math.round((valVentaDirecta + valRentabilidad) / 2);
        } else {
          valFinal = valVentaDirecta || valRentabilidad;
        }
        console.log(`\u{1F9EE} Recalculando Valor Final: ${valFinal}`);
      }
      const resultado = {
        resumen_busqueda: extractedData.resumen_busqueda || "An\xE1lisis completado a partir de comparables de venta y arriendo en el mercado local.",
        valor_final: valFinal,
        // TOTALES que reflejan TODOS los comparables
        total_comparables: totalComparables,
        total_comparables_venta: totalVenta,
        total_comparables_arriendo: totalArriendo,
        portales_consultados,
        valor_estimado_venta_directa: valVentaDirecta,
        precio_m2_venta_directa: precioM2VentaDirecta,
        metodologia_venta_directa: extractedData.metodologia_venta_directa || null,
        valor_estimado_rentabilidad: valRentabilidad,
        canon_arriendo_promedio: canonPromedio,
        metodologia_rentabilidad: extractedData.metodologia_rentabilidad || null,
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
        perplexity_full_text: perplexityContent
      };
      console.log("\u2705 Resultado final generado:", {
        comparables: resultado.comparables.length,
        precio_m2_usado: resultado.precio_m2_usado,
        totales_coherentes: resultado.total_comparables === resultado.comparables.length
      });
      return new Response(
        JSON.stringify(resultado),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (llmError) {
      console.error("DeepSeek error:", llmError);
      return new Response(
        JSON.stringify({
          error: "Error al extraer datos estructurados",
          details: llmError.message,
          perplexity_full_text: perplexityContent
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
