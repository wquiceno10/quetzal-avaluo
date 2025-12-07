import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Send, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { guardarAvaluoEnSupabase } from '@/lib/avaluos';

export default function Step4Contact({ formData, onBack, onReset }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [enviado, setEnviado] = useState(false);

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

      // --- PLANTILLA PREMIUM HERO (Unificada con MisAvaluos) ---
      const formatCurrency = (val) => val ? '$ ' + Math.round(val).toLocaleString('es-CO') : '—';
      const valorFormateado = formatCurrency(valorEstimadoFinal);
      const rangoMinStr = formatCurrency(rangoMin);
      const rangoMaxStr = formatCurrency(rangoMax);
      const totalComparables = comparablesData.total_comparables || 0;
      const yieldVal = comparablesData.yield_mensual_mercado
        ? (comparablesData.yield_mensual_mercado * 100).toFixed(2) + '%'
        : 'N/A';

      const estadoInmuebleRaw = formData.estado_inmueble || formData.estrato || '—';
      const estadoInmueble = String(estadoInmuebleRaw).replace(/_/g, ' ');

      const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; margin: 0; padding: 0; background-color: #F4F4F4; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; overflow: hidden; }
          
          /* HERO HEADER */
          .hero {
             background-color: #2C3D37;
             color: white;
             padding: 40px 30px;
             text-align: left;
             position: relative;
          }
          .hero-label {
             display: flex;
             align-items: center;
             gap: 10px;
             font-size: 18px;
             font-weight: bold;
             margin-bottom: 10px;
          }
          .hero-badge {
             background-color: #C9C19D;
             color: #2C3D37;
             padding: 4px 12px;
             border-radius: 20px;
             font-size: 11px;
             font-weight: bold;
             text-transform: uppercase;
             display: inline-block;
             margin-left: auto;
          }
          .hero-price {
             font-size: 42px;
             font-weight: bold;
             margin: 15px 0 5px 0;
             letter-spacing: -1px;
          }
          .hero-sub {
             font-size: 14px;
             opacity: 0.8;
             margin-bottom: 25px;
          }
          
          .stats-box {
             background-color: rgba(255,255,255,0.1);
             border: 1px solid rgba(255,255,255,0.2);
             border-radius: 8px;
             padding: 15px;
             display: flex;
             justify-content: space-between;
             font-size: 12px;
          }
          .stat-item strong { display: block; font-size: 14px; margin-bottom: 2px; }
          .stat-item span { opacity: 0.8; }
          .stat-right { text-align: right; }

          /* CONTENT */
          .content { padding: 30px; }
          .intro-text { font-size: 14px; line-height: 1.6; color: #555; margin-bottom: 30px; }
          .intro-text strong { color: #2C3D37; }

          .section-title {
             font-size: 16px;
             font-weight: bold;
             color: #2C3D37;
             border-bottom: 2px solid #E8ECE9;
             padding-bottom: 10px;
             margin-bottom: 20px;
             margin-top: 10px;
          }

          /* TABLE */
          .details-table { width: 100%; border-collapse: collapse; }
          .details-table td {
             padding: 12px 0;
             border-bottom: 1px border-color: #f0f0f0; /* Fallback */
             border-bottom: 1px solid #eee;
             font-size: 14px;
          }
          .label { font-weight: bold; color: #888; text-transform: uppercase; font-size: 11px; width: 40%; }
          .value { text-align: right; font-weight: bold; color: #333; }

          /* FOOTER */
          .footer {
             background-color: #1a2620;
             color: #8FA396;
             text-align: center;
             padding: 30px;
             font-size: 12px;
          }
          .footer p { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- HERO -->
          <div class="hero">
            <div class="hero-label">
              <span>🏠 Valor Comercial</span>
              <span class="hero-badge">⚡ Estimación IA</span>
            </div>
            <div class="hero-sub">Estimación de Inteligencia Inmobiliaria</div>
            
            <div class="hero-price">${valorFormateado}</div>
            <div class="hero-sub">COP (Pesos Colombianos)</div>
            
            <div class="stats-box">
               <div class="stat-item">
                  <span>Rango Sugerido</span>
                  <strong>${rangoMinStr} - ${rangoMaxStr}</strong>
               </div>
               <div class="stat-item stat-right">
                  <span>Muestra de Mercado</span>
                  <strong>${totalComparables} inmuebles</strong>
               </div>
            </div>
          </div>

          <div class="content">
             <p class="intro-text">
               Hola,<br><br>
               Aquí tienes el detalle de la valoración para tu inmueble ubicado en <strong>${data.barrio}, ${data.municipio}</strong>. 
               Este reporte refleja el comportamiento real del mercado local.
             </p>

             <div class="section-title">Información Detallada</div>
             <table class="details-table">
               <tr><td class="label">TIPO INMUEBLE</td><td class="value">${data.tipo_inmueble}</td></tr>
               <tr><td class="label">UBICACIÓN</td><td class="value">${data.barrio}, ${data.municipio}</td></tr>
               <tr><td class="label">ÁREA CONSTRUIDA</td><td class="value">${data.area_construida} m²</td></tr>
               ${!esLote ? `
               <tr><td class="label">HABITACIONES</td><td class="value">${data.habitaciones || '-'}</td></tr>
               <tr><td class="label">BAÑOS</td><td class="value">${data.banos || '-'}</td></tr>
               ` : `
               <tr><td class="label">USO</td><td class="value">${data.uso_lote || '-'}</td></tr>
               `}
               <tr><td class="label">ESTADO</td><td class="value">${estadoInmueble}</td></tr>
               ${!esLote ? `<tr><td class="label">RENTABILIDAD ESTIMADA</td><td class="value">${yieldVal}</td></tr>` : ''}
             </table>

             <div class="section-title" style="margin-top: 40px;">Resumen de Mercado</div>
             <p style="font-size: 13px; text-align: justify; color: #555; line-height: 1.5; margin-bottom: 20px;">
                ${comparablesData.resumen_busqueda || 'Análisis basado en la oferta actual del mercado.'}
             </p>

             <div class="section-title">Comparables Destacados (Top 3)</div>
             <table class="details-table">
                ${(comparablesData.comparables_usados_en_calculo || []).slice(0, 3).map(comp => `
                  <tr>
                    <td style="text-align:left;">
                      <div style="font-weight:bold; font-size:13px; color:#2C3D37;">${comp.barrio || 'Zona'}</div>
                      <div style="font-size:11px; color:#888;">${comp.area_construida} m²</div>
                    </td>
                    <td class="value">${comp.precio_publicado ? '$ ' + Math.round(comp.precio_publicado).toLocaleString('es-CO') : 'Consultar'}</td>
                  </tr>
                `).join('')}
             </table>

             <!-- FULL REPORT CTA -->
             <div style="background-color: #2C3D37; border-radius: 8px; padding: 30px; text-align: center; margin-top: 40px; color: white;">
                <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">📄 Reporte Completo</div>
                <div style="font-size: 13px; opacity: 0.8; margin-bottom: 20px;">
                  Para ver todas las gráficas y guardar el informe oficial, descarga el PDF.
                </div>
                <a href="${detalleUrl}" 
                   style="background-color: #C9C19D; color: #2C3D37; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">
                   Ver y Descargar PDF
                </a>
             </div>

             <!-- CONTACT AGENT -->
             <div style="background-color: #F8F9FA; border-radius: 8px; padding: 30px; text-align: center; margin-top: 30px;">
                <h3 style="margin: 0 0 10px 0; color: #2C3D37;">¿Necesitas vender este inmueble?</h3>
                <p style="font-size: 13px; color: #666; margin-bottom: 20px;">
                   En Quetzal Hábitats conectamos tu propiedad con los clientes adecuados.
                </p>
                <a href="https://wa.me/573186383809" 
                   style="background-color: #2C3D37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">
                   Contactar Asesor
                </a>
             </div>

          </div>

          <div class="footer">
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
      <Card className="w-full max-w-2xl mx-auto shadow-lg border-0 bg-white/90 backdrop-blur-sm animate-in fade-in zoom-in duration-500">
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
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-6 text-gray-600 hover:text-[#2C3D37] hover:bg-transparent pl-0"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a resultados
      </Button>

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