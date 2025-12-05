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

      // Calcular valor principal igual que en Step3Results (promedio si existen ambos métodos)
      let valorEstimadoFinal = null;
      const valorVentaDirecta = comparablesData.valor_estimado_venta_directa;
      const valorRentabilidad = comparablesData.valor_estimado_rentabilidad;
      if (valorVentaDirecta && valorRentabilidad) {
        valorEstimadoFinal = Math.round((valorVentaDirecta + valorRentabilidad) / 2);
      } else {
        valorEstimadoFinal = valorVentaDirecta || valorRentabilidad || 0;
      }

      const rangoMin = comparablesData.rango_valor_min || 0;
      const rangoMax = comparablesData.rango_valor_max || 0;
      const precioM2Final = comparablesData.precio_m2_usado || 0;

      // Helper para formatear moneda
      const formatCurrency = (val) => {
        if (!val && val !== 0) return '—';
        return '$ ' + Math.round(val).toLocaleString('es-CO');
      };

      // Helper para generar filas de comparables
      const generarFilasComparables = (comparables) => {
        if (!comparables || comparables.length === 0) return '<tr><td colspan="5" style="text-align:center; padding: 10px;">No hay comparables detallados disponibles.</td></tr>';

        return comparables.slice(0, 10).map(c => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">${c.titulo || 'Inmueble'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">${c.barrio || '—'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; text-align: center;">${c.area_m2 ? c.area_m2 + ' m²' : '—'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; text-align: right;">${formatCurrency(c.precio_cop)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; text-align: right;">${formatCurrency(c.precio_m2)}/m²</td>
          </tr>
        `).join('');
      };

      // Helper para convertir markdown básico a HTML
      const markdownToHtml = (text) => {
        if (!text) return '';
        let html = text
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Negritas
          .replace(/^#+\s*(.*?)$/gm, '<h3 style="color: #2C3D37; margin-top: 15px; margin-bottom: 10px; font-size: 16px;">$1</h3>') // Títulos
          .replace(/^\s*[-*]\s+(.*?)$/gm, '<li style="margin-bottom: 5px;">$1</li>'); // Listas

        // Envolver listas
        if (html.includes('<li>')) {
          html = html.replace(/((<li.*?>.*?<\/li>\s*)+)/s, '<ul style="padding-left: 20px; margin-bottom: 15px;">$1</ul>');
        }

        // Párrafos (saltos de línea dobles)
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Avalúo - ${data.codigo_avaluo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Raleway', 'Arial', sans-serif;
      line-height: 1.6;
      color: #4F5B55;
      background-color: #F5F4F0;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
    
    /* HERO SECTION */
    .hero {
      background: linear-gradient(135deg, #2C3D37 0%, #1a2620 100%);
      color: white;
      padding: 40px;
      position: relative;
    }
    .hero-content {
      position: relative;
      z-index: 2;
    }
    .hero-badge {
      background: rgba(201, 193, 157, 0.9);
      color: #1a2620;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      display: inline-block;
      margin-bottom: 15px;
      font-family: 'Outfit', sans-serif;
    }
    .hero-title {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      margin-bottom: 5px;
      color: white;
    }
    .hero-price {
      font-family: 'Outfit', sans-serif;
      font-size: 42px;
      font-weight: bold;
      color: white;
      margin: 15px 0;
      line-height: 1;
    }
    .hero-details-box {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 15px;
      margin-top: 20px;
      color: white;
    }
    .hero-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .hero-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
      margin-bottom: 0;
    }
    
    /* CONTENT */
    .content { padding: 40px; }
    
    .section-title {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: bold;
      color: #2C3D37;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #B0BDB4;
    }
    
    /* INFO GRID */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .info-item {
      background: #F9FAF9;
      padding: 12px;
      border-radius: 8px;
      border-left: 3px solid #C9C19D;
    }
    .info-label {
      font-size: 11px;
      color: #7A8C85;
      text-transform: uppercase;
      font-weight: 600;
    }
    .info-value {
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 600;
      color: #2C3D37;
    }
    
    /* METHODS CARDS */
    .methods-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 20px;
    }
    .method-card {
      border: 1px solid #E0E5E2;
      border-radius: 8px;
      overflow: hidden;
    }
    .method-header {
      background: #F9FAF9;
      padding: 10px 15px;
      border-bottom: 1px solid #F0F2F1;
      font-family: 'Outfit', sans-serif;
      font-weight: 600;
      color: #2C3D37;
      font-size: 14px;
    }
    .method-body {
      padding: 20px;
      text-align: center;
    }
    .method-price {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: bold;
      color: #2C3D37;
      margin-bottom: 5px;
    }
    .method-desc {
      font-size: 12px;
      color: #7A8C85;
    }
    
    /* TABLE */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 13px;
    }
    th {
      background: #2C3D37;
      color: white;
      padding: 10px;
      text-align: left;
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
    }
    
    /* FOOTER */
    .footer {
      background: #2C3D37;
      color: white;
      padding: 30px;
      text-align: center;
      font-size: 13px;
    }
    
    @media only screen and (max-width: 600px) {
      .methods-grid { grid-template-columns: 1fr; }
      .info-grid { grid-template-columns: 1fr; }
      .hero-price { font-size: 32px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- HERO -->
    <div class="hero">
      <div class="hero-content">
        <div class="hero-badge">ESTIMACIÓN IA</div>
        <div class="hero-title">Valor Comercial Estimado</div>
        <div class="hero-price">${formatCurrency(valorEstimadoFinal)}</div>
        <div style="font-size: 14px; opacity: 0.9;">COP (Pesos Colombianos)</div>
        
        <div class="hero-details-box">
          <div class="hero-row">
            <span>Rango Sugerido</span>
            <span style="font-weight: bold;">${formatCurrency(rangoMin)} - ${formatCurrency(rangoMax)}</span>
          </div>
          <div class="hero-row">
            <span>Precio m² Ref.</span>
            <span style="font-weight: bold;">${formatCurrency(precioM2Final)}/m²</span>
          </div>
          <div class="hero-row">
            <span>Muestra</span>
            <span style="font-weight: bold;">${comparablesList.length} inmuebles</span>
          </div>
        </div>
      </div>
    </div>

    <div class="content">
      <p style="margin-bottom: 20px;">
        Hola <strong>${data.nombre_contacto}</strong>,<br>
        Aquí tienes el reporte detallado de tu avalúo generado el ${new Date().toLocaleDateString('es-CO')}.
      </p>

      <!-- INFO INMUEBLE -->
      <div class="section-title">📍 Información del Inmueble</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">Barrio</div><div class="info-value">${data.barrio}</div></div>
        <div class="info-item"><div class="info-label">Municipio</div><div class="info-value">${data.municipio}</div></div>
        <div class="info-item"><div class="info-label">Tipo</div><div class="info-value">${data.tipo_inmueble || 'No especificado'}</div></div>
        <div class="info-item"><div class="info-label">Área</div><div class="info-value">${data.area_construida} m²</div></div>
        <div class="info-item"><div class="info-label">Habitaciones</div><div class="info-value">${data.habitaciones || '—'}</div></div>
        <div class="info-item"><div class="info-label">Baños</div><div class="info-value">${data.banos || '—'}</div></div>
      </div>

      <!-- MÉTODOS -->
      <div class="methods-grid">
        <div class="method-card">
          <div class="method-header">Enfoque de Mercado</div>
          <div class="method-body">
            <div class="method-price">${formatCurrency(valorVentaDirecta)}</div>
            <div class="method-desc">Basado en comparables de venta</div>
          </div>
        </div>
        <div class="method-card">
          <div class="method-header">Enfoque de Rentabilidad</div>
          <div class="method-body">
            <div class="method-price">${formatCurrency(valorRentabilidad)}</div>
            <div class="method-desc">Basado en canon estimado y yield</div>
          </div>
        </div>
      </div>

      <!-- COMPARABLES -->
      <div class="section-title">📊 Propiedades Comparables</div>
      <p style="font-size: 13px; color: #666; margin-bottom: 10px;">
        Muestra de las propiedades utilizadas para el análisis (Top 10):
      </p>
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Inmueble</th>
              <th>Ubicación</th>
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

      <!-- ANÁLISIS IA -->
      <div class="section-title">🤖 Análisis Detallado</div>
      <div style="background: #F9FAF9; padding: 20px; border-radius: 8px; font-size: 14px; color: #4F5B55;">
        ${markdownToHtml(analisisTexto)}
      </div>

      <!-- CTA -->
      <div style="background: #DEE8E9; padding: 25px; border-radius: 8px; text-align: center; margin-top: 30px;">
        <h3 style="color: #2C3D37; margin-bottom: 10px; font-family: 'Outfit', sans-serif;">¿Interesado en vender o comprar?</h3>
        <p style="margin-bottom: 15px; font-size: 14px;">En Quetzal Hábitats te ayudamos a encontrar el comprador ideal.</p>
        <a href="https://wa.me/573186383809" style="display: inline-block; background: #2C3D37; color: white; text-decoration: none; padding: 10px 20px; border-radius: 25px; font-weight: bold; font-size: 14px;">Contactar Asesor</a>
      </div>

    </div>

    <div class="footer">
      <img src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png" alt="Quetzal" style="width: 100px; margin-bottom: 15px; opacity: 0.8;">
      <p>© 2025 Quetzal Hábitats - Todos los derechos reservados</p>
      <p style="font-size: 11px; opacity: 0.6; margin-top: 5px;">Código: ${data.codigo_avaluo}</p>
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
          subject: `Reporte de Avalúo - ${data.codigo_avaluo}${data.barrio ? ` - ${data.barrio}, ${data.municipio}` : ''}`,
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
        const { error } = await supabase.from('avaluos').insert([completeData]);
        if (error) {
          console.error('Error creating avaluo in Supabase:', error);
        } else {
          console.log('Avaluo guardado exitosamente en Supabase');
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