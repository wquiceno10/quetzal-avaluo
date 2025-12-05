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
    const { to, subject, htmlBody } = body;
    if (!to || !subject || !htmlBody) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos: to, subject, htmlBody" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: "Formato de correo electr\xF3nico inv\xE1lido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Quetzal H\xE1bitats <contacto@quetzalhabitats.com>",
          to: [to],
          subject,
          html: htmlBody
        })
      });
      if (!response.ok) {
        const error = await response.text();
        console.error("Resend error:", error);
        return new Response(
          JSON.stringify({ error: "Error al enviar el correo", details: error }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const data = await response.json();
      return new Response(
        JSON.stringify({ success: true, message: "Correo enviado exitosamente", id: data.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error enviando email:", error);
      return new Response(
        JSON.stringify({ error: "Error al enviar el correo", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
