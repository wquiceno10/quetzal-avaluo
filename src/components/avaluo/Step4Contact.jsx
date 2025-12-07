import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Send, CheckCircle, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { guardarAvaluoEnSupabase } from '@/lib/avaluos';

export default function Step4Contact({ formData, onBack, onReset }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [enviado, setEnviado] = useState(false);

  // Scroll automático al top al montar componente
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const sendEmailMutation = useMutation({
    mutationFn: async (data) => {
      const comparablesData = formData.comparables_data || {};

      // Cálculos de valores (Lógica espejo del frontend)
      const valorVentaDirecta = comparablesData.valor_estimado_venta_directa;
      const valorRentabilidad = comparablesData.valor_estimado_rentabilidad;
      const rangoMin = comparablesData.rango_valor_min;
      const rangoMax = comparablesData.rango_valor_max;

      let valorEstimadoFinal = comparablesData.valor_final;
      if (!valorEstimadoFinal) {
        if (rangoMin && rangoMax) valorEstimadoFinal = (rangoMin + rangoMax) / 2;
        else if (valorVentaDirecta && valorRentabilidad) valorEstimadoFinal = (valorVentaDirecta * 0.8 + valorRentabilidad * 0.2);
        else valorEstimadoFinal = valorVentaDirecta || valorRentabilidad;
      }

      // Formateadores
      const formatCurrency = (val) => val ? '$ ' + Math.round(val).toLocaleString('es-CO') : '—';

      // GENERAR CODIGO AVALUO SI NO EXISTE
      const codigoAvaluo = formData.codigo_avaluo || `QZ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000)}`;

      // 1. GUARDAR EN SUPABASE
      // Preparamos el payload_json con TODO el análisis (comparables_data tiene casi todo, pero aseguramos el objeto completo)
      const payloadJson = {
        ...comparablesData,
        codigo_avaluo: codigoAvaluo,
        valor_final: valorEstimadoFinal,
        // Incluimos datos básicos también por si acaso
        tipo_inmueble: formData.tipo_inmueble,
        barrio: formData.barrio,
        municipio: formData.municipio,
        area_construida: formData.area_construida,
        habitaciones: formData.habitaciones,
        banos: formData.banos,
      };

      let avaluoId = formData.id;

      if (!avaluoId) {
        const avaluoIdRes = await guardarAvaluoEnSupabase({
          email: data.contacto_email,
          tipoInmueble: formData.tipo_inmueble,
          barrio: formData.barrio,
          ciudad: formData.municipio,
          valorFinal: valorEstimadoFinal,
          codigoAvaluo: codigoAvaluo,
          payloadJson: payloadJson
        });
        avaluoId = avaluoIdRes;
      }

      const detalleUrl = `${window.location.origin}/resultados/${avaluoId}`;

      // Helper para convertir markdown básico a HTML
      const esLote = (data.tipo_inmueble || '').toLowerCase().includes('lote');

      const markdownToHtml = (text) => {
        if (!text) return '';
        let html = text
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/^#+\s*(.*?)$/gm, '<h4 style="color: #2C3D37; margin-top: 15px; margin-bottom: 5px; font-size: 14px;">$1</h4>')
          .replace(/^\s*[-*•]\s+(.*?)$/gm, '<li style="margin-bottom: 5px;">$1</li>')
          .replace(/\n\n/g, '<br><br>')
          .replace(/\n/g, '<br>');
        return html;
      };

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; line-height: 1.6; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; overflow: hidden; font-size: 14px; }
            .header { background-color: #2C3D37; padding: 40px 20px; text-align: center; color: white; }
            .header-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .header-code { font-size: 14px; opacity: 0.8; }
            
            .content { padding: 30px; }
            
            .value-box { background-color: #F9FAF9; border: 1px solid #E0E5E2; border-radius: 8px; padding: 25px; text-align: center; margin-bottom: 30px; }
            .value-label { color: #666; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
            .value-amount { color: #2C3D37; font-size: 36px; font-weight: bold; margin: 5px 0; }
            .value-range { color: #888; font-size: 12px; }
            
            .section-title { color: #2C3D37; font-size: 16px; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; margin-top: 30px; }
            
            .data-grid { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .data-grid td { padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 13px; }
            .data-label { color: #666; width: 40%; }
            .data-val { color: #333; font-weight: bold; text-align: right; }
            
            .cta-box { background-color: #E8ECE9; padding: 30px; text-align: center; margin-top: 30px; border-radius: 8px; }
            .cta-title { color: #2C3D37; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .cta-text { color: #4F5B55; font-size: 13px; margin-bottom: 20px; line-height: 1.5; }
            .cta-btn { background-color: #2C3D37; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; font-size: 14px; display: inline-block; }
            
            .alert-box { background-color: #FFFDF5; border-left: 4px solid #FBC02D; padding: 15px; margin-top: 30px; font-size: 12px; color: #555; text-align: justify; }
            
            .footer-contact { background-color: #E8ECE9; padding: 30px; text-align: center; margin-top: 20px; }
            .contact-title { font-size: 16px; font-weight: bold; color: #2C3D37; margin-bottom: 10px; }
            
            .footer-dark { background-color: #2C3D37; padding: 30px; text-align: center; color: #8FA396; font-size: 11px; }
            .footer-dark p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- DARK HEADER -->
            <div class="header">
              <div class="header-title">Reporte de Avalúo</div>
              <div class="header-code">Código: ${codigoAvaluo}</div>
            </div>
            
            <div class="content">
              <p>Hola <strong>${formData.contacto_nombre || data.contacto_nombre || 'Usuario'}</strong>,</p>
              <p>Adjunto encontrarás el detalle de la valoración para tu inmueble en <strong>${data.barrio}, ${data.municipio}</strong>.</p>
              
              <!-- VALUE BOX -->
              <div class="value-box">
                <div class="value-label">Valor Comercial Estimado</div>
                <div class="value-amount">${formatCurrency(valorEstimadoFinal)}</div>
                <div class="value-range">Rango sugerido: ${formatCurrency(rangoMin)} - ${formatCurrency(rangoMax)}</div>
              </div>

              <!-- FICHA TÉCNICA -->
              <div class="section-title">Ficha Técnica</div>
              <table class="data-grid">
                <tr><td class="data-label">Tipo Inmueble:</td><td class="data-val">${data.tipo_inmueble}</td></tr>
                <tr><td class="data-label">Ubicación:</td><td class="data-val">${data.barrio}, ${data.municipio}</td></tr>
                <tr><td class="data-label">Área:</td><td class="data-val">${data.area_construida} m²</td></tr>
                ${!esLote ? `
                <tr><td class="data-label">Habitaciones:</td><td class="data-val">${data.habitaciones || '-'}</td></tr>
                <tr><td class="data-label">Baños:</td><td class="data-val">${data.banos || '-'}</td></tr>
                ` : `
                <tr><td class="data-label">Uso:</td><td class="data-val">${data.uso_lote || '-'}</td></tr>
                `}
              </table>

              <!-- RESUMEN MERCADO -->
              <div class="section-title">Resumen del Mercado</div>
               <p style="font-size: 13px; text-align: justify; color: #555; line-height: 1.5;">
                  ${comparablesData.resumen_busqueda || 'Análisis basado en la oferta actual del mercado.'}
               </p>
               <table class="data-grid" style="margin-top: 15px;">
                  <tr><td class="data-label">Comparables:</td><td class="data-val">${comparablesData.total_comparables || 0} inmuebles</td></tr>
                  ${!esLote ? `<tr><td class="data-label">Yield Estimado:</td><td class="data-val">${((comparablesData.yield_mensual_mercado || 0) * 100).toFixed(2)}% mensual</td></tr>` : ''}
               </table>

              <!-- AVISO LEGAL -->
              <div class="alert-box">
                <strong>⚠️ Aviso Legal:</strong><br>
                Este avalúo comercial es una estimación basada en el análisis de propiedades comparables en el mercado inmobiliario actual y no constituye un avalúo oficial o catastral. Los valores presentados son aproximados. Para transacciones legales o financieras, se recomienda obtener un avalúo oficial realizado por un perito avaluador certificado.
              </div>
              
              <!-- CTA COMPRA/VENTA -->
              <div class="cta-box">
                <div class="cta-title">¿Interesado en vender o comprar?</div>
                <div class="cta-text">En Quetzal Hábitats te ayudamos a encontrar el comprador ideal o la propiedad perfecta para ti. Contáctanos para una asesoría personalizada.</div>
                <a href="https://wa.me/573186383809" class="cta-btn">Contactar Asesor</a>
              </div>
            </div>

            <!-- FOOTER INFO -->
            <div class="footer-contact">
               <div class="contact-title">¿Necesitas más información?</div>
               <p style="font-size: 14px; margin: 5px 0;">📞 +57 318 638 3809</p>
               <p style="font-size: 14px; margin: 5px 0;">✉️ contacto@quetzalhabitats.com</p>
            </div>

            <!-- DARK FOOTER COPYRIGHT -->
            <div class="footer-dark">
               <img src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png" alt="Quetzal" style="filter: brightness(0) invert(1); opacity: 0.5; height: 30px; margin-bottom: 10px;">
               <p>© 2025 Quetzal Hábitats - Todos los derechos reservados</p>
               <p>Código: ${codigoAvaluo}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const response = await fetch(`${import.meta.env.VITE_WORKER_EMAIL_URL}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email, // String, not array
          subject: `Reporte de Avalúo: ${data.tipo_inmueble} en ${data.barrio}`,
          htmlBody: emailHtml // Worker expects "htmlBody", not "html"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al enviar el correo');
      }

      return { success: true, id: avaluoId };
    },
    onSuccess: (data) => {
      setEnviado(true);
      // Redirigir después de un momento para que el usuario vea el mensaje de éxito
      setTimeout(() => {
        navigate(`/resultados/${data.id}`);
      }, 3500); // Damos un poco más de tiempo para que lean el mensaje de éxito
      // También podríamos dejar el botón "Ver Reporte" en la UI de éxito para ir manualmente
    },
    onError: (error) => {
      console.error("Error en proceso de avalúo:", error);
      alert(`Hubo un error al procesar tu solicitud: ${error.message}. Por favor intenta de nuevo.`);
      setEnviado(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !nombre || !telefono) return;

    // Combinar datos del formulario de contacto con los datos del avalúo
    const finalData = {
      ...formData,
      contacto_nombre: nombre,
      contacto_email: email,
      contacto_telefono: telefono,
    };

    sendEmailMutation.mutate(finalData);
  };

  if (enviado) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
        {/* Success Card */}
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="w-20 h-20 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-[#2E7D32]" />
            </div>
            <h2 className="text-3xl font-bold text-[#2C3D37] mb-4 font-outfit">¡Reporte Enviado!</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Hemos enviado el reporte detallado a <strong>{email}</strong>.
              Revisa tu bandeja de entrada (y spam por si acaso).
            </p>
            <Button
              onClick={onReset}
              className="bg-[#2C3D37] hover:bg-[#1a2620] text-white rounded-full px-8 py-6 text-lg"
            >
              Realizar otro avalúo
            </Button>
          </CardContent>
        </Card>

        {/* Aviso Legal */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-[#2C3D37] mb-2">Aviso Legal:</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Este avalúo comercial es una estimación basada en el análisis de propiedades comparables en el mercado inmobiliario actual y no constituye un avalúo oficial o catastral. Los valores presentados son aproximados y pueden variar según las condiciones específicas del inmueble y del mercado. Para transacciones legales o financieras, se recomienda obtener un avalúo oficial realizado por un perito avaluador certificado.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Venta/Compra */}
        <Card className="bg-[#F9FAF9] border-[#E0E5E2]">
          <CardContent className="pt-6 pb-6 text-center">
            <h3 className="text-xl font-bold text-[#2C3D37] mb-3">¿Interesado en vender o comprar?</h3>
            <p className="text-sm text-gray-700 max-w-lg mx-auto">
              En Quetzal Hábitats te ayudamos a encontrar el comprador ideal o la propiedad perfecta para ti. Contáctanos para una asesoría personalizada sin compromiso.
            </p>
          </CardContent>
        </Card>

        {/* Información de Contacto */}
        <Card className="bg-[#F9FAF9] border-[#E0E5E2]">
          <CardContent className="pt-6 pb-6 text-center">
            <h3 className="text-xl font-bold text-[#2C3D37] mb-4">¿Necesitas más información?</h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <a href="tel:+573186383809" className="flex items-center gap-2 text-[#2C3D37] hover:text-[#C9C19D] transition-colors">
                <Phone className="w-4 h-4" />
                <span className="font-medium">+57 318 638 3809</span>
              </a>
              <span className="hidden sm:inline text-gray-400">--</span>
              <a href="mailto:contacto@quetzalhabitats.com" className="flex items-center gap-2 text-[#2C3D37] hover:text-[#C9C19D] transition-colors">
                <Mail className="w-4 h-4" />
                <span className="font-medium">contacto@quetzalhabitats.com</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">

      <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-[#2C3D37] text-white p-8 text-center">
          <CardTitle className="text-2xl font-bold font-outfit mb-2">Recibe tu Reporte Completo</CardTitle>
          <CardDescription className="text-gray-300 text-base">
            Ingresa tus datos para enviarte el PDF con el análisis detallado y la evidencia de mercado.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-[#2C3D37] font-medium">Nombre Completo</Label>
              <Input
                id="nombre"
                placeholder="Ej. Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="border-gray-300 focus:border-[#C9C19D] focus:ring-[#C9C19D] h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#2C3D37] font-medium">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ej. juan@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-gray-300 focus:border-[#C9C19D] focus:ring-[#C9C19D] h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono" className="text-[#2C3D37] font-medium">Teléfono / WhatsApp</Label>
              <Input
                id="telefono"
                type="tel"
                placeholder="Ej. 300 123 4567"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required
                className="border-gray-300 focus:border-[#C9C19D] focus:ring-[#C9C19D] h-12"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#C9C19D] hover:bg-[#b8b08c] text-[#2C3D37] font-bold text-lg h-14 rounded-xl transition-all shadow-md hover:shadow-lg mt-4"
              disabled={sendEmailMutation.isPending}
            >
              {sendEmailMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Enviar Reporte a mi Correo
                </>
              )}
            </Button>

            <p className="text-xs text-center text-gray-400 mt-4">
              Tus datos están seguros. Solo los usaremos para enviarte el reporte.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}