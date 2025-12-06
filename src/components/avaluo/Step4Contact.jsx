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
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .header { background-color: #2C3D37; padding: 30px; text-align: center; }
            .header img { max-width: 150px; }
            .content { padding: 30px; }
            .hero { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
            .price-tag { font-size: 32px; font-weight: bold; color: #2C3D37; margin: 10px 0; }
            .subtitle { font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
            
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .card { background: #f9f9f9; padding: 15px; border-radius: 6px; border: 1px solid #eee; }
            .card-title { font-size: 14px; font-weight: bold; color: #2C3D37; margin-bottom: 10px; border-bottom: 1px dashed #ccc; padding-bottom: 5px; }
            .info-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; }
            
            .methods-container { display: flex; gap: 10px; margin-bottom: 20px; }
            .method-card { flex: 1; background: #fff; border: 1px solid #eee; padding: 10px; text-align: center; border-radius: 6px; }
            .method-val { font-size: 16px; font-weight: bold; color: #2C3D37; margin: 5px 0; }
            .method-label { font-size: 10px; text-transform: uppercase; color: #888; margin-bottom: 5px; font-weight: bold;}
            .method-desc { font-size: 9px; color: #666; line-height: 1.3; }

            .btn { display: inline-block; background-color: #C9C19D; color: #2C3D37; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
            .footer { background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #ddd; }
            .footer p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png" alt="Quetzal Hábitats">
            </div>
            
            <div class="content">
              <div class="hero">
                <div class="subtitle">Valor Comercial Estimado</div>
                <div class="price-tag">${formatCurrency(valorEstimadoFinal)}</div>
                <p style="font-size: 11px; color: #666; max-width: 400px; margin: 0 auto 10px auto; line-height: 1.4;">
                  ${esLote
          ? 'Valor obtenido a partir del análisis de mercado y método residual, sin aplicar enfoque de rentabilidad.'
          : 'Punto de equilibrio entre el enfoque de mercado y el enfoque de rentabilidad, reflejando tanto las condiciones del inmueble como el comportamiento actual de la demanda.'}
                </p>
                <div style="font-size: 12px; color: #444; margin-top: 5px;">
                  Rango sugerido: <strong>${formatCurrency(rangoMin)} - ${formatCurrency(rangoMax)}</strong>
                </div>
              </div>

              <div class="grid-2">
                <div class="card">
                  <div class="card-title">Ficha Técnica</div>
                  <div class="info-row"><span>Inmueble:</span> <strong>${data.tipo_inmueble}</strong></div>
                  <div class="info-row"><span>Ubicación:</span> <strong>${data.barrio}, ${data.municipio}</strong></div>
                  <div class="info-row"><span>Área:</span> <strong>${data.area_construida} m²</strong></div>
                  ${!esLote ? `
                  <div class="info-row"><span>Habitaciones:</span> <strong>${data.habitaciones || '-'}</strong></div>
                  <div class="info-row"><span>Baños:</span> <strong>${data.banos || '-'}</strong></div>
                  ` : ''}
                  ${esLote ? `
                  <div class="info-row"><span>Uso:</span> <strong>${data.uso_lote || '-'}</strong></div>
                  ` : ''}
                </div>

                <div class="card">
                  <div class="card-title">Resumen del Mercado</div>
                  <p style="font-size: 11px; text-align: justify; margin-bottom: 10px; color: #666; line-height: 1.3;">
                    ${comparablesData.resumen_busqueda || 'Análisis basado en oferta actual.'}
                  </p>
                  <div class="info-row"><span>Comparables:</span> <strong>${comparablesData.total_comparables || 0} inmuebles</strong></div>
                  ${!esLote ? `
                  <div class="info-row"><span>Yield Estimado:</span> <strong>${((comparablesData.yield_mensual_mercado || 0) * 100).toFixed(2)}% mensual</strong></div>
                  ` : ''}
                </div>
              </div>

              <!-- MÉTODOS -->
              <h4 style="color: #2C3D37; margin-top: 5px; margin-bottom: 10px; font-size: 14px; text-align: center;">Metodología de Valoración</h4>
              <div class="methods-container">
                ${esLote ? `
                <div class="method-card" style="max-width: 100%; flex: 1;">
                  <div class="method-label">Metodología Ajustada (Lotes)</div>
                  <div class="method-val">${formatCurrency(valorVentaDirecta)}</div>
                  <div class="method-desc">Calculado a partir del precio promedio por m² de lotes comparables y ajuste residual.</div>
                </div>
                ` : `
                <div class="method-card">
                  <div class="method-label">Enfoque de Mercado</div>
                  <div class="method-val">${formatCurrency(valorVentaDirecta)}</div>
                  <div class="method-desc">Calculado a partir del precio promedio por m² de las propiedades comparables (precio promedio por m² × área del inmueble).</div>
                </div>
                `}
                
                ${valorRentabilidad && !esLote ? `
                <div class="method-card">
                  <div class="method-label">Enfoque de Rentabilidad</div>
                  <div class="method-val">${formatCurrency(valorRentabilidad)}</div>
                  <div class="method-desc">Calculado a partir del canon mensual estimado y la fórmula del rendimiento (yield) del sector.</div>
                </div>
                ` : ''}
              </div>

              <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                <h3 style="font-size: 16px; color: #2C3D37; margin-bottom: 15px;">Análisis Detallado</h3>
                <div style="font-size: 13px; color: #444; text-align: justify;">
                  ${markdownToHtml(comparablesData.perplexity_full_text)}
                </div>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="${detalleUrl}" class="btn" style="background-color: #2C3D37; color: white; margin-right: 10px;">Ver Reporte Interactivo</a>
                <a href="https://quetzalhabitats.com" class="btn">Ver más servicios</a>
                <p style="margin-top: 20px;"><a href="https://quetzalhabitats.com" style="color: #2C3D37; text-decoration: none; font-size: 12px;">Volver a Quetzal Hábitats</a></p>
              </div>
            </div>

            <div class="footer">
              <p>Quetzal Hábitats - Inteligencia Inmobiliaria</p>
              <p>Este reporte es una estimación basada en datos de mercado.</p>
              <div style="margin-top: 10px; font-size: 10px; color: #999;">
                <p>¿Interesado en vender o comprar?</p>
                <p>En Quetzal Hábitats te ayudamos a encontrar el comprador ideal o la propiedad perfecta para ti.</p>
                <p>Contáctanos: +57 318 638 3809 | contacto@quetzalhabitats.com</p>
              </div>
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