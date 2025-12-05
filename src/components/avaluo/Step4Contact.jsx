import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Phone, CheckCircle, RefreshCw, MessageCircle } from 'lucide-react';
// import { api } from '@/api/client'; // Removed legacy import
import { useMutation } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

export default function Step4Contact({ formData, onUpdate, onReset, onBack }) {
  const [contactData, setContactData] = useState({
    nombre_contacto: '',
    email: '',
    whatsapp: '',
    canal_preferido: 'email'
  });
  const [submitted, setSubmitted] = useState(false);

  const sendEmailMutation = useMutation({
    mutationFn: async (data) => {
      const comparablesData = data.comparables_data || {};

      // Cálculos de valores (Lógica idéntica al BotonPDF para consistencia visual)
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

      // Área para cálculos
      const area = parseFloat(data.area_construida || comparablesData.area_construida || 0);
      const precioM2 = valorEstimadoFinal && area ? valorEstimadoFinal / area : 0;

      // Formateadores
      const formatCurrency = (val) => val ? '$ ' + Math.round(val).toLocaleString('es-CO') : '—';
      const formatNumber = (val) => val ? Math.round(val).toLocaleString('es-CO') : '—';

      // Fecha actual
      const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

      // Helper para generar filas de comparables
      const generarFilasComparables = (comparables) => {
        if (!comparables || comparables.length === 0) return '<tr><td colspan="5" style="text-align:center; padding: 10px;">No hay comparables detallados disponibles.</td></tr>';

        return comparables.slice(0, 10).map(c => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px;">${c.titulo ? c.titulo.substring(0, 40) + (c.titulo.length > 40 ? '...' : '') : 'Inmueble'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px;">${c.tipo_origen || '—'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; text-align: center;">${Math.round(c.area_m2)} m²</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; text-align: right;">${formatCurrency(c.precio_cop)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; text-align: right;">${formatCurrency(c.precio_m2)}</td>
          </tr>
        `).join('');
      };

      // Helper para convertir markdown básico a HTML
      const markdownToHtml = (text) => {
        if (!text) return '';
        let html = text
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/^#+\s*(.*?)$/gm, '<h3 style="color: #2C3D37; margin-top: 15px; margin-bottom: 8px; font-size: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 5px;">$1</h3>')
          .replace(/^\s*[-*]\s+(.*?)$/gm, '<li style="margin-bottom: 5px;">$1</li>');

        if (html.includes('<li>')) {
          html = html.replace(/((<li.*?>.*?<\/li>\s*)+)/s, '<ul style="padding-left: 20px; margin-bottom: 15px;">$1</ul>');
        }
        html = html.replace(/\n\n/g, '<br><br>');
        return html;
      };

      const comparablesList = data.comparables_data?.comparables || [];
      const analisisTexto = data.comparables_data?.perplexity_full_text || '';

      const emailBody = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Reporte de Avalúo - Quetzal Hábitats</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Raleway:wght@400;500&display=swap');
            
            :root { --primary: #2C3D37; --secondary: #C9C19D; --bg: #F9FAF9; --text: #4F5B55; --border: #E0E5E2; }
            body { font-family: 'Raleway', sans-serif; color: #4F5B55; background: #F0F0F0; margin: 0; padding: 20px; line-height: 1.5; }
            .container { width: 100%; max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 5px 20px rgba(0,0,0,0.05); overflow: hidden; position: relative; border-radius: 12px; }
            .header { display: flex; justify-content: space-between; align-items: center; padding: 30px 40px; border-bottom: 2px solid #2C3D37; margin-bottom: 30px; }
            .header img { max-width: 150px; height: auto; }
            .report-meta { text-align: right; font-size: 12px; color: #888; }
            .content { padding: 0 40px 40px 40px; }
            
            /* Hero similar al PDF */
            .hero { background: linear-gradient(135deg, #2C3D37 0%, #1a2620 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; box-shadow: 0 8px 16px rgba(44, 61, 55, 0.15); }
            .hero-title { font-family: 'Outfit', sans-serif; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-bottom: 5px; }
            .hero-price { font-family: 'Outfit', sans-serif; font-size: 36px; font-weight: 700; color: white; margin: 10px 0; }
            .hero-subtitle { font-size: 12px; opacity: 0.8; margin-bottom: 20px; }
            .hero-stats { border-top: 1px solid rgba(255,255,255,0.2); padding-top: 15px; display: flex; justify-content: space-around; }
            .stat-label { font-size: 10px; opacity: 0.7; display: block; }
            .stat-value { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: #C9C19D; }

            /* Tarjetas */
            .grid-2 { display: block; margin-bottom: 30px; }
            .card { background: #F9FAF9; padding: 20px; border-radius: 8px; border: 1px solid #E0E5E2; margin-bottom: 15px; }
            .card-title { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; color: #2C3D37; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #ccc; }
            .info-row { margin-bottom: 8px; font-size: 12px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
            .info-row:last-child { border-bottom: none; }
            .info-row strong { color: #2C3D37; float: right; }

            /* Métodos */
            .methods-container { margin-bottom: 30px; display: block; }
            .method-card { background: white; border: 1px solid #E0E5E2; border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 10px; }
            .method-val { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: #2C3D37; margin: 5px 0; }
            .method-label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 1px; }

            /* Tablas */
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
            th { background: #2C3D37; color: white; padding: 8px; text-align: left; font-family: 'Outfit', sans-serif; }
            td { padding: 6px 8px; border-bottom: 1px solid #E0E5E2; }
            tr:nth-child(even) { background: #f9f9f9; }

            /* CTA Caja destacada */
            .cta-box { margin-top: 40px; background: #FFF9E6; border: 1px solid #C9C19D; padding: 25px; border-radius: 12px; text-align: center; box-shadow: 0 4px 10px rgba(201, 193, 157, 0.15); }
            
            .footer { margin-top: 40px; border-top: 2px solid #2C3D37; padding-top: 20px; text-align: center; font-size: 11px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png" alt="Quetzal Hábitats">
              <div class="report-meta">
                <strong>Avalúo Comercial</strong><br>
                Fecha: ${fecha}
              </div>
            </div>

            <div class="content">
              <p style="margin-bottom: 20px; font-size: 14px;">
                Hola <strong>${data.nombre_contacto}</strong>,<br>
                Aquí tienes el resultado de tu avalúo inmobiliario:
              </p>

              <!-- HERO -->
              <div class="hero">
                <div class="hero-title">Valor Comercial Estimado</div>
                <div class="hero-price">${formatCurrency(valorEstimadoFinal)}</div>
                <div class="hero-subtitle">Peso Colombiano (COP)</div>
                <div class="hero-stats">
                  <div><span class="stat-label">Rango Sugerido</span><span class="stat-value">${formatCurrency(rangoMin)} - ${formatCurrency(rangoMax)}</span></div>
                  <div><span class="stat-label">Precio m²</span><span class="stat-value">${formatCurrency(precioM2)}/m²</span></div>
                </div>
              </div>

              <!-- INFO -->
              <div class="grid-2">
                <div class="card">
                  <div class="card-title">Ficha Técnica</div>
                  <div class="info-row"><span>Tipo Inmueble:</span> <strong>${data.tipo_inmueble || 'Inmueble'}</strong></div>
                  <div class="info-row"><span>Ubicación:</span> <strong>${data.barrio || '—'}, ${data.municipio || '—'}</strong></div>
                  <div class="info-row"><span>Área:</span> <strong>${data.area_construida || 0} m²</strong></div>
                  <div class="info-row"><span>Habitaciones:</span> <strong>${data.habitaciones || '—'}</strong></div>
                  <div class="info-row"><span>Baños:</span> <strong>${data.banos || '—'}</strong></div>
                  <div class="info-row"><span>Antigüedad:</span> <strong>${data.antiguedad || '—'}</strong></div>
                </div>

                <div class="card">
                  <div class="card-title">Resumen del Mercado</div>
                  <p style="font-size: 12px; text-align: justify; margin-bottom: 10px; color: #666;">
                    ${comparablesData.resumen_busqueda || 'Análisis basado en oferta actual.'}
                  </p>
                  <div class="info-row"><span>Comparables:</span> <strong>${comparablesData.total_comparables || 0} inmuebles</strong></div>
                  <div class="info-row"><span>Yield Estimado:</span> <strong>${((comparablesData.yield_mensual_mercado || 0) * 100).toFixed(2)}% mensual</strong></div>
                </div>
              </div>

              <!-- MÉTODOS -->
              <div class="methods-container">
                <div class="method-card">
                  <div class="method-label">Enfoque de Mercado</div>
                  <div class="method-val">${formatCurrency(valorVentaDirecta)}</div>
                  <div style="font-size: 10px; color: #888;">Comparables Venta</div>
                </div>
                <div class="method-card">
                  <div class="method-label">Enfoque de Rentabilidad</div>
                  <div class="method-val">${formatCurrency(valorRentabilidad)}</div>
                  <div style="font-size: 10px; color: #888;">Capitalización de Rentas</div>
                </div>
              </div>

              <!-- COMPARABLES -->
              <h3 style="font-family: 'Outfit', sans-serif; color: #2C3D37; font-size: 15px; border-bottom: 2px solid #C9C19D; display: inline-block; padding-bottom: 5px; margin-bottom: 10px;">Evidencia de Mercado (Top 10)</h3>
              <div style="overflow-x: auto;">
                <table>
                  <thead>
                    <tr>
                      <th>Inmueble</th>
                      <th>Tipo</th>
                      <th style="text-align: center;">Área</th>
                      <th style="text-align: right;">Precio</th>
                      <th style="text-align: right;">m²</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${generarFilasComparables(comparablesList)}
                  </tbody>
                </table>
              </div>

              <div style="margin-top: 30px; font-size: 13px; color: #666; background: #fff; padding: 15px; border-radius: 8px; line-height: 1.6;">
                <h3 style="font-family: 'Outfit', sans-serif; color: #2C3D37; font-size: 15px; margin-bottom: 10px;">Análisis Detallado IA</h3>
                ${markdownToHtml(analisisTexto)}
              </div>

              <!-- CTA DESCARGA PDF -->
              <div class="cta-box">
                <h3 style="color: #2C3D37; margin-bottom: 8px; font-family: 'Outfit', sans-serif; font-size: 18px;">Análisis detallado</h3>
                <p style="margin-bottom: 20px; font-size: 14px; color: #4F5B55;">
                  Para ver el reporte completo, oficial y guardar una copia, descarga el PDF.
                </p>
                <a href="https://quetzal-avaluo.pages.dev/mis-avaluos" 
                   style="display: inline-block; background: #2C3D37; color: white; text-decoration: none; padding: 14px 30px; border-radius: 50px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 10px rgba(44,61,55,0.2);">
                   Descargar Reporte PDF
                </a>
              </div>

              <div class="footer">
                <p><strong>Quetzal Hábitats - Inteligencia Inmobiliaria</strong></p>
                <p>Generado el ${fecha} • ID: ${data.codigo_avaluo}</p>
                <p style="font-size: 10px; margin-top: 10px;">No respondas a este correo. Para contacto escribe a contacto@quetzalhabitats.com</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const response = await fetch(import.meta.env.VITE_WORKER_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: data.email,
          subject: `Reporte de Avalúo - ${data.codigo_avaluo}${data.barrio ? ` - ${data.barrio}` : ''}`,
          htmlBody: emailBody
        })
      });

      const responseData = await response.json();

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error || 'Error enviando el reporte por correo.');
      }

      return { success: true };
    },
    onSuccess: () => {
      setSubmitted(true);
    }
  });

  const handleChange = (field, value) => {
    setContactData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Generate unique codigo_avaluo
    const codigo = `AV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const completeData = {
      ...formData,
      ...contactData,
      codigo_avaluo: codigo
    };

    // Create avaluo record in Supabase
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Add user_id to completeData if user is authenticated
        const dataToInsert = {
          ...completeData,
          user_id: user?.id || null
        };

        const { error } = await supabase.from('avaluos').insert([dataToInsert]);
        if (error) {
          console.error('Error creating avaluo in Supabase:', error);
        } else {
          console.log('Avaluo guardado exitosamente en Supabase con user_id:', user?.id);
        }
      }
    } catch (error) {
      console.error('Error saving avaluo:', error);
    }

    // Send email
    sendEmailMutation.mutate(completeData);

    // Update parent
    onUpdate(contactData);
  };

  const isValid = contactData.nombre_contacto && contactData.email;

  if (submitted) {
    return (
      <Card className="border-[#2C3D37] border-2">
        <CardContent className="py-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-green-100 rounded-full p-6">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-[#2C3D37] mb-3">
                ¡Reporte Enviado con Éxito!
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Hemos enviado el reporte completo del avalúo a <strong>{contactData.email}</strong>.
                Revisa tu bandeja de entrada (y la carpeta de spam por si acaso).
              </p>
            </div>

            <Alert className="max-w-2xl mx-auto border-[#C9C19D] bg-[#F5F4F0]">
              <AlertDescription className="text-[#2C3D37]">
                <strong>¿Interesado en vender o comprar?</strong><br />
                En Quetzal Hábitats te ayudamos a encontrar el comprador ideal o la propiedad perfecta para ti.
                Contáctanos para una asesoría personalizada sin compromiso.
              </AlertDescription>
            </Alert>

            <div className="bg-[#DEE8E9] rounded-lg p-6 max-w-2xl mx-auto flex flex-col items-center">
              <h3 className="font-semibold text-[#2C3D37] mb-4 text-center">¿Necesitas más información?</h3>
              <div className="flex flex-row justify-center gap-4 w-full">
                <div className="flex flex-col items-center w-auto mx-2">
                  <a href="https://wa.me/573186383809" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 hover:underline">
                    <Phone className="w-5 h-5 text-[#2C3D37]" />
                    <p className="font-semibold text-[#2C3D37]" style={{ fontFamily: 'Outfit, sans-serif' }}>+57 318 638 3809</p>
                  </a>
                </div>
                <div className="flex flex-col items-center w-auto mx-2">
                  <a href="mailto:contacto@quetzalhabitats.com" className="flex items-center justify-center gap-2 hover:underline">
                    <Mail className="w-5 h-5 text-[#2C3D37]" />
                    <p className="font-semibold text-[#2C3D37]" style={{ fontFamily: 'Outfit, sans-serif' }}>contacto@quetzalhabitats.com</p>
                  </a>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                onClick={onBack}
                variant="outline"
                className="border-[#B0BDB4] text-[#2C3D37] rounded-full px-8 py-6 text-lg font-medium"
              >
                Volver a Resultados
              </Button>
              <Button
                onClick={onReset}
                className="bg-[#2C3D37] hover:bg-[#1a2620] text-white rounded-full px-8 py-6 text-lg font-medium"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Crear Nuevo Avalúo
              </Button>
              <Button
                onClick={() => window.open('https://wa.me/573186383809', '_blank')}
                className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8 py-6 text-lg font-medium"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Contactar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#B0BDB4]">
      <CardHeader>
        <CardTitle className="text-2xl text-[#2C3D37]">
          Recibe tu Reporte Completo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-gray-600">
          Ingresa tus datos para recibir el reporte detallado del avalúo directamente en tu correo electrónico.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-[#2C3D37] font-medium">
              Nombre Completo *
            </Label>
            <Input
              id="nombre"
              value={contactData.nombre_contacto}
              onChange={(e) => handleChange('nombre_contacto', e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="border-[#B0BDB4] focus:border-[#2C3D37]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#2C3D37] font-medium">
              Correo Electrónico *
            </Label>
            <Input
              id="email"
              type="email"
              value={contactData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="tu@email.com"
              className="border-[#B0BDB4] focus:border-[#2C3D37]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-[#2C3D37] font-medium">
              WhatsApp (Opcional)
            </Label>
            <Input
              id="whatsapp"
              type="tel"
              value={contactData.whatsapp}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              placeholder="+57 300 123 4567"
              className="border-[#B0BDB4] focus:border-[#2C3D37]"
            />
          </div>
        </div>

        <Alert className="border-[#B0BDB4] bg-[#DEE8E9]">
          <Mail className="w-4 h-4 text-[#2C3D37]" />
          <AlertDescription className="text-[#2C3D37]">
            Tu información será utilizada únicamente para enviarte el reporte y contactarte si deseas más información
            sobre nuestros servicios. No compartimos tus datos con terceros.
          </AlertDescription>
        </Alert>

        <div className="flex gap-4">
          <Button
            onClick={onBack}
            variant="outline"
            className="border-[#B0BDB4] text-[#2C3D37] rounded-full py-6 text-lg font-medium"
          >
            Volver
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            className="border-[#B0BDB4] text-[#2C3D37] rounded-full py-6 text-lg font-medium"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Nuevo Avalúo
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || sendEmailMutation.isPending}
            className="flex-1 bg-[#2C3D37] hover:bg-[#1a2620] text-white rounded-full py-6 text-lg font-medium"
          >
            {sendEmailMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando Reporte...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5 mr-2" />
                Enviar Reporte por Email
              </>
            )}
          </Button>
        </div>

        {sendEmailMutation.isError && (
          <Alert className="border-red-300 bg-red-50">
            <AlertDescription className="text-red-800">
              Ocurrió un error al enviar el reporte. Por favor, verifica tu correo e intenta de nuevo.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}