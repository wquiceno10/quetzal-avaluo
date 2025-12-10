var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
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
__name(getSimilarity, "getSimilarity");
function construirPromptPerplexity(formData, area, esLote, usoLote, ubicacion) {
  const infoInmueble = `
- Tipo: ${formData.tipo_inmueble || "inmueble"}
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
  const areaInstruction = area ? `
- \xC1REA CONSTRUIDA: ${area} m\xB2
- Rango de \xE1reas VENTA (Estricto): ${Math.round(area * 0.5)} a ${Math.round(area * 1.5)} m\xB2 (\xB150%)
- SOLO incluye comparables de venta cuyas \xE1reas est\xE9n dentro de este rango. Para arriendos, intenta mantener el \xE1rea similar, pero prioriza encontrar datos.` : "";
  const seccionBase = `
Eres un analista inmobiliario especializado en aval\xFAos t\xE9cnicos del mercado colombiano.
Tu objetivo es elaborar un **an\xE1lisis completo, claro y profesional**, usando lenguaje 
simple que un usuario sin conocimientos t\xE9cnicos pueda entender.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
DATOS DEL INMUEBLE
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${infoInmueble}
${areaInstruction}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
INSTRUCCIONES GENERALES
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

**1. PRINCIPIO: NO INVENTES DATOS ESPEC\xCDFICOS**
   - Si encuentras listados reales en portales (Fincara\xEDz, Metrocuadrado, Ciencuadras, etc.), \xFAsalos.
   - Si NO hay suficientes datos reales, PUEDES usar:
     * Promedios estad\xEDsticos del municipio/regi\xF3n (d\xE9jalo claro)
     * Datos de zonas similares cercanas (especifica cu\xE1l y por qu\xE9)
     * Valoraciones proporcionales (explica el m\xE9todo en lenguaje simple)
   - NUNCA inventes precios espec\xEDficos de propiedades que no existan.

**2. META DE COMPARABLES:**
   - Ideal: 15-20 comparables totales
   - M\xEDnimo: 8-10 comparables

**3. ETIQUETAS DE VALIDACI\xD3N (OBLIGATORIAS):**
   
   Para cada comparable, asigna UNA de estas etiquetas:
   
   - **portal_verificado**: Listado real de portal inmobiliario.
   
   - **zona_similar**: Listado verificado de municipio/barrio cercano.
     \u2192 OBLIGATORIO: Agrega NOTA explicando municipio, distancia aproximada, y raz\xF3n de similitud.
   
   - **estimacion_zona**: Promedio estad\xEDstico (solo si necesario para muestra m\xEDnima).
   
   - **promedio_municipal**: Dato agregado municipal (\xFAltimo recurso).

**4. FORMATO DE LISTADO (ESTRICTO):**

**[T\xEDtulo descriptivo]**<br>
[Tipo] | [Venta/Arriendo]<br>
$[Precio con puntos] | [\xC1rea] m\xB2 | [Hab] hab | [Ba\xF1os] ba\xF1os<br>
[Barrio] | [Ciudad]<br>
**[Fuente: Nombre portal]**<br>
fuente_validacion: [etiqueta]<br>
[NOTA: Obligatoria si zona_similar - explicar contexto]

Ejemplo:

**Lote urbano comercial en Circasia**<br>
Lote | Venta<br>
$850.000.000 | 4200 m\xB2 | - hab | - ba\xF1os<br>
Centro | Circasia<br>
**Fincara\xEDz**<br>
fuente_validacion: zona_similar<br>
**NOTA:** Circasia est\xE1 a 8 km de ${formData.municipio || "la zona objetivo"}. Se incluye por estar en el mismo corredor tur\xEDstico, con caracter\xEDsticas de uso comercial comparables.

**5. CIFRAS:**
   - SIEMPRE en pesos colombianos completos
   - CON puntos para miles: $4.200.000 (NO 4.2M ni $4200000)

**6. FORMATO FINAL:**
   - Usa <br> para saltos de l\xEDnea en listados
   - NO incluyas URLs ni hiperv\xEDnculos
   - Responde en espa\xF1ol
   - NO devuelvas JSON
    `.trim();
  const seccionLotes = `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
INSTRUCCIONES ESPECIALES PARA LOTES
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

**1. B\xDASQUEDA GEOGR\xC1FICA AMPLIADA (OBLIGATORIO):**
   
   a) **ZONA PRIMARIA:** ${formData.municipio || "el municipio objetivo"}
      - Busca PRIMERO lotes en venta en este municipio.
   
   b) **ZONA SECUNDARIA** (si zona primaria tiene <5 lotes):
      - Ampl\xEDa a municipios del MISMO DEPARTAMENTO (${formData.departamento || "departamento cercano"}).
      - Prioriza municipios cercanos (radio ~30km).
      - Ejemplos seg\xFAn regi\xF3n:
        * Filandia \u2192 Circasia, Salento, Armenia, Calarc\xE1, Quimbaya
        * Pereira \u2192 Dosquebradas, La Virginia, Santa Rosa de Cabal, Marsella
        * Armenia \u2192 Circasia, Calarc\xE1, La Tebaida, Montenegro
   
   c) **ZONA TERCIARIA** (si a\xFAn faltan datos):
      - Lotes de la regi\xF3n con caracter\xEDsticas similares.
      - Mismo uso (${usoLote}), estrato socioecon\xF3mico similar.

**2. VALORACI\xD3N PROPORCIONAL - LENGUAJE SIMPLE (si aplica):**
   
   \u274C NUNCA digas solo: "se aplic\xF3 m\xE9todo residual"
   
   \u2705 SIEMPRE explica as\xED:
   
   "Como los lotes en venta en ${formData.municipio || "[municipio]"} son escasos, complementamos 
   el an\xE1lisis con propiedades construidas en la misma zona. Esto nos permite estimar 
   el valor del terreno, ya que t\xEDpicamente un lote representa entre 25% y 40% del 
   valor total de una propiedad construida, dependiendo del uso y la ubicaci\xF3n."
   
   Luego detalla:
   - \xBFQu\xE9 propiedades construidas usaste como referencia?
   - \xBFQu\xE9 porcentaje aplicaste y por qu\xE9? (25%-40% seg\xFAn caso)
   - \xBFC\xF3mo ajustaste por caracter\xEDsticas espec\xEDficas?

**3. OMITIR ARRIENDOS COMPLETAMENTE:**
   - PROHIBIDO buscar o mencionar arriendos para lotes.
   - PROHIBIDO calcular rentabilidad o yield.
   - Solo an\xE1lisis de VENTA directa.

**4. FRASE FINAL OBLIGATORIA (en Resumen Ejecutivo):**
   
   "Valor determinado mediante an\xE1lisis comparativo del mercado regional de lotes, 
   complementado cuando fue necesario con valoraci\xF3n proporcional de propiedades 
   construidas (m\xE9todo que estima el valor del terreno como porcentaje del valor 
   total de construcciones similares en la zona)."

**5. TAREAS:**

## 1. B\xDASQUEDA Y SELECCI\xD3N DE COMPARABLES

Presenta un listado de **entre 15 a 20 comparables** SOLO en VENTA usando el formato especificado arriba.

## 2. AN\xC1LISIS DEL VALOR

### 2.1. M\xE9todo de Venta Directa (Precio por m\xB2)
- Calcula el valor promedio por m\xB2 bas\xE1ndote en los comparables de venta.
- Indica el valor por m\xB2 FINAL (ajustado por ubicaci\xF3n, caracter\xEDsticas, etc.).
- Calcula: Precio por m\xB2 final \xD7 ${area || "\xE1rea"} m\xB2.

## 3. RESULTADOS FINALES
- **Valor Recomendado de Venta: $XXX.XXX.XXX**
- **Rango sugerido: $XXX.XXX.XXX - $XXX.XXX.XXX**
- Precio por m\xB2 final usado
- Posici\xF3n en el mercado (liquidez)

## 4. AJUSTES APLICADOS
Explica ajustes por caracter\xEDsticas espec\xEDficas del lote.

## 5. LIMITACIONES
Menciona escasez de datos, dependencias de promedios o zonas similares.

## 6. RESUMEN EJECUTIVO
2-3 p\xE1rrafos con valor recomendado, rango y estrategia de venta.
INCLUYE la frase final obligatoria (ver punto 4 arriba).
    `.trim();
  const seccionPropiedades = `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
INSTRUCCIONES PARA PROPIEDADES (Apartamentos/Casas)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

**1. B\xDASQUEDA GEOGR\xC1FICA ENFOCADA:**
   
   a) **ZONA PRIMARIA:** ${formData.barrio || ""}, ${formData.municipio || "el municipio"}
      - Prioriza comparables del MISMO BARRIO.
      - Busca al menos 8-12 propiedades en venta.
   
   b) **ZONA SECUNDARIA** (complemento):
      - Barrios adyacentes del mismo estrato socioecon\xF3mico.
   
   c) **ARRIENDOS (OBLIGATORIO):**
      - Busca AL MENOS 6 propiedades en arriendo en la misma zona.
      - Necesitamos canon mensual para c\xE1lculo de rentabilidad.

**2. M\xC9TODO DE RENTABILIDAD - C\xC1LCULO CORRECTO:**
   
   **PASO 1: Canon Mensual Estimado**
   - NO uses promedio simple de precios totales de arriendo.
   - Calcula: Precio arriendo / \xC1rea = Canon por m\xB2
   - Promedia los "canon por m\xB2" de todos los arriendos.
   - Multiplica: Canon promedio/m\xB2 \xD7 ${area || "\xE1rea"} m\xB2 = Canon Mensual Estimado
   
   **PASO 2: Yield del Mercado**
   - Investiga el yield mensual REAL del mercado de ${formData.municipio || "la zona"}.
   - Busca datos de rentabilidad t\xEDpica para ${formData.tipo_inmueble || "apartamentos"}.
   - Si encuentras datos espec\xEDficos, \xFAsalos.
   - Si no, usa rangos conservadores (0.4% - 0.6% mensual).
   
   **IMPORTANTE:** Presenta el yield con formato EXACTO:
   "**Yield promedio mercado: 0.XX%**" (ejemplo: 0.52%, 0.48%)
   
   **PASO 3: Valoraci\xF3n**
   - Valor estimado = Canon Mensual Estimado / Yield mensual promedio

**3. TAREAS:**

## 1. B\xDASQUEDA Y SELECCI\xD3N DE COMPARABLES

Presenta **entre 15 a 20 comparables** (venta + arriendo) usando el formato especificado.
- M\xEDnimo 8-12 en VENTA
- M\xEDnimo 6 en ARRIENDO

## 2. AN\xC1LISIS DEL VALOR

### 2.1. M\xE9todo de Venta Directa (Precio por m\xB2)
- Calcula el valor promedio por m\xB2 bas\xE1ndote en comparables de venta.
- Indica el valor por m\xB2 FINAL (ajustado).
- Calcula: Precio por m\xB2 final \xD7 ${area || "\xE1rea"} m\xB2.

### 2.2. M\xE9todo de Rentabilidad (Yield Mensual)
- Sigue los 3 pasos descritos arriba.
- Muestra el yield encontrado con formato exacto.

## 3. RESULTADOS FINALES
- **Valor Recomendado de Venta: $XXX.XXX.XXX**
- **Rango sugerido: $XXX.XXX.XXX - $XXX.XXX.XXX**
- Precio por m\xB2 final
- Posici\xF3n en mercado

## 4. AJUSTES APLICADOS
Explica ajustes por antig\xFCedad, estado, parqueadero, etc.

## 5. LIMITACIONES
Menciona escasez de datos o dependencias.

## 6. RESUMEN EJECUTIVO
2-3 p\xE1rrafos con valor recomendado (ponderando venta + rentabilidad), rango y estrategia.
    `.trim();
  return `${seccionBase}

${esLote ? seccionLotes : seccionPropiedades}`;
}
__name(construirPromptPerplexity, "construirPromptPerplexity");
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
    const perplexityPrompt = construirPromptPerplexity(
      formData,
      area,
      esLote,
      usoLote,
      ubicacion
    );
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
    let extractedData = {};
    let nivelConfianza = "Medio";
    let estadisticasComparables = {};
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
   - "fuente": Texto entre ** ** (usualmente antepen\xFAltima l\xEDnea)
   - "fuente_validacion": Valor despu\xE9s de "fuente_validacion: " (uno de: portal_verificado, estimacion_zona, zona_similar, promedio_municipal)
   - "nota_adicional": Si existe una l\xEDnea que empieza con "NOTA:", extrae el texto completo (opcional)

   IMPORTANTE: 
   - Elimina cualquier etiqueta HTML (como <br>) de los valores extra\xEDdos.
   - Si NO encuentras el campo "fuente_validacion", asume "portal_verificado" por defecto.

2. "resumen_mercado": Extrae un resumen conciso (m\xE1ximo 2 p\xE1rrafos) de la secci\xF3n "RESUMEN EJECUTIVO". Prioriza la valoraci\xF3n y la rentabilidad.

3. "nivel_confianza": Busca en el texto la frase "Nivel de confianza:" y extrae el valor (Alto/Medio/Bajo). Si no existe, devuelve null.

4. "yield_zona": ${esLote ? "IGNORAR (Devolver null)" : 'Busca la frase exacta "Yield promedio mercado: X.XX%" en el texto. Extrae SOLO el n\xFAmero como decimal (ej: si dice "0.5%", devuelve 0.005).'}

5. "valor_recomendado_venta": Busca "Valor Recomendado de Venta: $XXX.XXX.XXX".
   Extrae el n\xFAmero ENTERO (elimina puntos y $).

6. "rango_sugerido_min": Busca "Rango sugerido: $XXX.XXX.XXX - $YYY.YYY.YYY". Extrae el primer n\xFAmero (ENTERO).

7. "rango_sugerido_max": Extrae el segundo n\xFAmero del rango sugerido (ENTERO).

8. "estadisticas_comparables": Busca en secci\xF3n 5 (LIMITACIONES) y extrae:
   - "porcentaje_datos_reales": Si menciona "X% de comparables son datos reales", extrae el n\xFAmero
   - "porcentaje_estimaciones": Si menciona porcentaje de estimaciones, extrae el n\xFAmero
   - "zonas_alternativas_usadas": Array de strings con nombres de barrios/zonas alternativas mencionadas

Devuelve SOLO JSON v\xE1lido.
        `.trim();
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
        const match = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (match && match[1]) content = match[1].trim();
      }
      extractedData = JSON.parse(content);
      if (!extractedData || typeof extractedData !== "object") extractedData = {};
      nivelConfianza = extractedData.nivel_confianza || "Medio";
      estadisticasComparables = extractedData.estadisticas_comparables || {};
      console.log(`Nivel de confianza: ${nivelConfianza}`);
      if (estadisticasComparables.porcentaje_datos_reales) {
        console.log(`Datos reales: ${estadisticasComparables.porcentaje_datos_reales}%`);
      }
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Error Parseo DeepSeek", details: e.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    try {
      const sanitizePrice = /* @__PURE__ */ __name((n) => {
        if (typeof n === "number") return Number.isFinite(n) ? n : null;
        if (typeof n === "string") {
          const clean = n.replace(/\D/g, "");
          const val = parseInt(clean, 10);
          return Number.isFinite(val) && val > 0 ? val : null;
        }
        return null;
      }, "sanitizePrice");
      const sanitizeFloat = /* @__PURE__ */ __name((n) => {
        if (typeof n === "number") return Number.isFinite(n) ? n : null;
        if (typeof n === "string") {
          const clean = n.replace(",", ".").replace(/[^\d.]/g, "");
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
      const comparablesRaw = Array.isArray(extractedData.comparables) ? extractedData.comparables : [];
      const comparables = comparablesRaw.map((c) => {
        const areaComp = sanitizeFloat(c.area);
        const precioLista = sanitizePrice(c.precio_lista);
        const esArriendo = c.tipo_operacion && typeof c.tipo_operacion === "string" && c.tipo_operacion.toLowerCase().includes("arriendo");
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
        const comparable = {
          titulo: c.titulo || "Inmueble",
          tipo_origen: esArriendo ? "arriendo" : "venta",
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
          fuente_validacion: c.fuente_validacion || "portal_verificado",
          nota_adicional: c.nota_adicional || null
        };
        const notaSafe = comparable.nota_adicional ? String(comparable.nota_adicional) : "";
        console.log(`[${comparable.titulo}] Validaci\xF3n: ${comparable.fuente_validacion}${notaSafe ? " | Nota: " + notaSafe.substring(0, 50) : ""}`);
        return comparable;
      }).filter((c) => c && c.precio_cop > 0 && c.area_m2 > 0);
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
        const sortedByM2 = [...compsVenta].sort((a, b) => a.precio_m2 - b.precio_m2);
        let filteredComps = sortedByM2;
        if (sortedByM2.length >= 5) {
          const cut = Math.floor(sortedByM2.length * 0.1);
          filteredComps = sortedByM2.slice(cut, sortedByM2.length - cut);
        }
        const sumM2 = filteredComps.reduce((acc, c) => acc + c.precio_m2, 0);
        precioM2Promedio = Math.round(sumM2 / filteredComps.length);
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
      const rangoMin = sanitizePrice(extractedData.rango_sugerido_min) || Math.round(valorFinal * 1);
      const rangoMax = sanitizePrice(extractedData.rango_sugerido_max) || Math.round(valorFinal * 1.04);
      const rangoFuente = extractedData.rango_sugerido_min ? "perplexity" : "calculado";
      const uniqueComparables = [];
      for (const comp of comparables) {
        const isDuplicate = uniqueComparables.some((existing) => {
          const precioBaseExisting = existing.precio_cop || existing.precio_publicado || 0;
          const precioBaseComp = comp.precio_cop || comp.precio_publicado || 0;
          const areaBaseExisting = existing.area_m2 || 0;
          const areaBaseComp = comp.area_m2 || 0;
          const priceMatch = precioBaseExisting > 0 ? Math.abs(precioBaseExisting - precioBaseComp) / precioBaseExisting < 0.01 : false;
          const areaMatch = areaBaseExisting > 0 ? Math.abs(areaBaseExisting - areaBaseComp) / areaBaseExisting < 0.01 : false;
          const titleSim = getSimilarity(existing.titulo, comp.titulo);
          return priceMatch && areaMatch && titleSim >= 0.7;
        });
        if (!isDuplicate) uniqueComparables.push(comp);
      }
      let comparablesFiltradosPorArea = uniqueComparables;
      if (!esLote || area <= 1e3) {
        comparablesFiltradosPorArea = uniqueComparables.filter((c) => {
          const a = c.area_m2 || 0;
          return a >= area * 0.5 && a <= area * 1.5;
        });
      }
      let comparablesParaTabla = comparablesFiltradosPorArea;
      if (esLote && area > 1e3) {
        const filtradosEstrictos = uniqueComparables.filter((c) => {
          const a = c.area_m2 || 0;
          return a >= area * 0.5 && a <= area * 1.5;
        });
        if (filtradosEstrictos.length >= 5) {
          comparablesParaTabla = filtradosEstrictos;
        } else {
          const filtradosRelajados = uniqueComparables.filter((c) => {
            const a = c.area_m2 || 0;
            return a >= area * 0.3 && a <= area * 1.7;
          });
          comparablesParaTabla = filtradosRelajados.length >= 3 ? filtradosRelajados : uniqueComparables;
        }
      }
      if (comparablesParaTabla.length >= 5) {
        const preciosM2 = comparablesParaTabla.map((c) => c.precio_m2).filter((p) => p > 0).sort((a, b) => a - b);
        if (preciosM2.length >= 4) {
          const q1Index = Math.floor(preciosM2.length * 0.25);
          const q3Index = Math.floor(preciosM2.length * 0.75);
          const q1 = preciosM2[q1Index];
          const q3 = preciosM2[q3Index];
          const iqr = q3 - q1;
          const minThreshold = q1 - iqr * 1.5;
          const maxThreshold = q3 + iqr * 1.5;
          const filtradosIQR = comparablesParaTabla.filter(
            (c) => c.precio_m2 >= minThreshold && c.precio_m2 <= maxThreshold
          );
          if (filtradosIQR.length >= 5) {
            console.log(`Filtro IQR aplicado.`);
            comparablesParaTabla = filtradosIQR;
          }
        }
      }
      comparablesParaTabla = comparablesParaTabla.map((c) => {
        let fuente = c.fuente || "Portal Inmobiliario";
        if (typeof fuente === "string") {
          fuente = fuente.replace(/Clencuadras/i, "Ciencuadras").replace(/Fincaraiz/i, "FincaRa\xEDz").replace(/MetroCuadrado/i, "Metrocuadrado").replace(/Mercadolibre/i, "MercadoLibre");
        }
        return { ...c, fuente };
      });
      const totalReal = comparablesParaTabla.length;
      const totalVenta = comparablesParaTabla.filter((c) => c.tipo_origen === "venta").length;
      const totalArriendo = comparablesParaTabla.filter((c) => c.tipo_origen === "arriendo").length;
      let finalPerplexityText = perplexityContent || "";
      finalPerplexityText = finalPerplexityText.replace(/(presentan|listado de|encontraron|selección de)\s+(\d+)\s+(comparables|inmuebles|propiedades)/gi, `$1 ${totalReal} $3`);
      finalPerplexityText = finalPerplexityText.replace(/total_comparables:\s*\d+/gi, "");
      let resumenFinal = extractedData.resumen_mercado || "An\xE1lisis de mercado realizado.";
      resumenFinal = resumenFinal.replace(/(presentan|listado de|encontraron|selección de)\s+(\d+)\s+(comparables|inmuebles|propiedades)/gi, `$1 ${totalReal} $3`);
      if (!comparablesParaTabla || comparablesParaTabla.length === 0) {
        const nivelConfianzaDetalle2 = {
          fuente: "calculado",
          nivel_llm: extractedData.nivel_confianza || null,
          total_comparables: 0,
          porcentaje_reales: 0,
          total_zonas_alternativas: 0,
          dispersion_alta: false
        };
        const resultado2 = {
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
          metodo_mercado_label: "Enfoque de Mercado (promedio real)",
          metodo_ajuste_label: valorRecomendado ? "Ajuste de Perplexity (criterio t\xE9cnico)" : "Promedio de Mercado",
          comparables: [],
          total_comparables: 0,
          total_comparables_venta: 0,
          total_comparables_arriendo: 0,
          nivel_confianza: "Bajo",
          nivel_confianza_detalle: nivelConfianzaDetalle2,
          estadisticas_fuentes: {
            total_portal_verificado: 0,
            total_estimacion_zona: 0,
            total_zona_similar: 0,
            total_promedio_municipal: 0
          },
          ficha_tecnica_defaults: {
            habitaciones: "No especificado",
            banos: "No especificado",
            garajes: "No especificado",
            estrato: "No especificado",
            antiguedad: "No especificado"
          },
          yield_mensual_mercado: esLote ? null : yieldFinal,
          area_construida: area,
          perplexity_full_text: finalPerplexityText
        };
        return new Response(JSON.stringify(resultado2), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      console.assert(typeof esLote === "boolean", "esLote debe estar definido");
      const total = comparablesParaTabla.length;
      const totalVerificados = comparablesParaTabla.filter(
        (c) => c.fuente_validacion === "portal_verificado"
      ).length;
      const totalZonasSimilares = comparablesParaTabla.filter(
        (c) => c.fuente_validacion === "zona_similar"
      ).length;
      const totalEstimacionZona = comparablesParaTabla.filter(
        (c) => c.fuente_validacion === "estimacion_zona"
      ).length;
      const totalPromedioMunicipal = comparablesParaTabla.filter(
        (c) => c.fuente_validacion === "promedio_municipal"
      ).length;
      const totalEstimaciones = totalEstimacionZona + totalPromedioMunicipal;
      const totalZonasAlternas = totalZonasSimilares + totalPromedioMunicipal;
      console.log(`Clasificaci\xF3n: ${totalVerificados} verificados, ${totalZonasSimilares} zonas similares, ${totalEstimaciones} estimaciones`);
      let puntosConfianza = 0;
      puntosConfianza += totalVerificados * 3;
      puntosConfianza += totalZonasSimilares * 2;
      puntosConfianza += totalEstimaciones * 1;
      const promedioCalidad = total > 0 ? puntosConfianza / total : 0;
      console.log(`Promedio calidad: ${promedioCalidad.toFixed(2)} (max: 3.0)`);
      let dispersionAlta = false;
      let cvDispersion = 0;
      const preciosM2Validos = comparablesParaTabla.map((c) => c.precio_m2).filter((v) => typeof v === "number" && v > 0);
      if (preciosM2Validos.length >= 2) {
        const max = Math.max(...preciosM2Validos);
        const min = Math.min(...preciosM2Validos);
        cvDispersion = (max - min) / ((max + min) / 2);
        dispersionAlta = cvDispersion > 0.8;
        console.log(`Dispersi\xF3n CV: ${(cvDispersion * 100).toFixed(1)}% ${dispersionAlta ? "(ALTA)" : "(normal)"}`);
      }
      const factorDispersion = dispersionAlta ? 0.7 : 1;
      const puntuacionFinal = promedioCalidad * factorDispersion;
      console.log(`Puntuaci\xF3n final: ${puntuacionFinal.toFixed(2)}`);
      let nivelConfianzaCalc = "Bajo";
      if (puntuacionFinal >= 2.2 && total >= 8 && !dispersionAlta) {
        nivelConfianzaCalc = "Alto";
      } else if (puntuacionFinal >= 1.8 && total >= 6) {
        nivelConfianzaCalc = "Medio";
      } else if (puntuacionFinal >= 1.3 && total >= 5) {
        nivelConfianzaCalc = "Medio";
      } else {
        nivelConfianzaCalc = "Bajo";
      }
      if (esLote && totalZonasSimilares >= 4 && totalVerificados >= 2 && total >= 7) {
        if (nivelConfianzaCalc === "Bajo") {
          nivelConfianzaCalc = "Medio";
          console.log("\u2191 Ajuste lotes: Bajo \u2192 Medio (buena cobertura regional)");
        }
      }
      if (!esLote && totalVerificados >= 5 && totalZonasSimilares === 0 && total >= 6) {
        if (nivelConfianzaCalc === "Medio" && !dispersionAlta) {
          nivelConfianzaCalc = "Alto";
          console.log("\u2191 Ajuste propiedades: Medio \u2192 Alto (datos hiperlocales)");
        }
      }
      if (totalEstimaciones > total * 0.5) {
        if (nivelConfianzaCalc === "Alto") {
          nivelConfianzaCalc = "Medio";
          console.log("\u2193 Penalizaci\xF3n: Alto \u2192 Medio (muchas estimaciones)");
        } else if (nivelConfianzaCalc === "Medio" && totalEstimaciones > total * 0.7) {
          nivelConfianzaCalc = "Bajo";
          console.log("\u2193 Penalizaci\xF3n: Medio \u2192 Bajo (mayor\xEDa estimaciones)");
        }
      }
      console.log(`\u2713 Nivel de confianza final: ${nivelConfianzaCalc}`);
      const nivelConfianzaLLM = extractedData.nivel_confianza || null;
      const ratioReal = total > 0 ? totalVerificados / total : 0;
      const nivelConfianzaDetalle = {
        fuente: "calculado_v2",
        // Versión del algoritmo
        nivel_llm: nivelConfianzaLLM,
        // Guardamos lo que dijo Perplexity (informativo)
        // Métricas principales
        total_comparables: total,
        porcentaje_reales: total > 0 ? Math.round(totalVerificados / total * 100) : 0,
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
        metodo_mercado_label: "Enfoque de Mercado (promedio real)",
        metodo_ajuste_label: valorRecomendado ? "Ajuste de Perplexity (criterio t\xE9cnico)" : "Promedio de Mercado",
        comparables: comparablesParaTabla,
        total_comparables: comparablesParaTabla.length,
        total_comparables_venta: totalVenta,
        total_comparables_arriendo: totalArriendo,
        // Nivel de confianza y estadísticas de fuentes (V11 - Calculado)
        nivel_confianza: nivelConfianzaCalc,
        nivel_confianza_detalle: nivelConfianzaDetalle,
        estadisticas_fuentes: {
          total_portal_verificado: comparablesParaTabla.filter((c) => c.fuente_validacion === "portal_verificado").length,
          total_estimacion_zona: comparablesParaTabla.filter((c) => c.fuente_validacion === "estimacion_zona").length,
          total_zona_similar: comparablesParaTabla.filter((c) => c.fuente_validacion === "zona_similar").length,
          total_promedio_municipal: comparablesParaTabla.filter((c) => c.fuente_validacion === "promedio_municipal").length
        },
        // ERROR 1: Defaults
        ficha_tecnica_defaults: {
          habitaciones: "No especificado",
          banos: "No especificado",
          garajes: "No especificado",
          estrato: "No especificado",
          antiguedad: "No especificado"
        },
        yield_mensual_mercado: esLote ? null : yieldFinal,
        area_construida: area,
        perplexity_full_text: finalPerplexityText
      };
      return new Response(JSON.stringify(resultado), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (processingError) {
      console.error("Error cr\xEDtico en procesamiento:", processingError);
      return new Response(
        JSON.stringify({
          error: "Error interno en procesamiento",
          details: processingError.message || "Error desconocido",
          stack: processingError.stack || null
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
