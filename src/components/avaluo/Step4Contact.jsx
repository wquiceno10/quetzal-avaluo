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

      const emailBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Avalúo - ${data.codigo_avaluo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      line-height: 1.6;
      color: #2C3D37;
      background-color: #F5F4F0;
      padding: 20px;
    }
    .container {
      max-width: 700px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #2C3D37 0%, #1a2620 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header img { max-width: 180px; margin-bottom: 20px; }
    .header h1 { font-size: 26px; margin-bottom: 10px; }
    .header .codigo {
      background: rgba(255,255,255,0.2);
      padding: 8px 16px;
      border-radius: 20px;
      display: inline-block;
      margin-top: 10px;
      font-size: 14px;
    }
    .content { padding: 30px; }
    .greeting { font-size: 16px; color: #2C3D37; margin-bottom: 25px; }
    .section {
      background: #F5F4F0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #2C3D37;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #B0BDB4;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    .info-item {
      background: white;
      padding: 12px;
      border-radius: 6px;
      border-left: 3px solid #2C3D37;
    }
    .info-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 15px;
      font-weight: bold;
      color: #2C3D37;
      font-family: 'Outfit', sans-serif;
    }
    .result-box {
      background: linear-gradient(135deg, #2C3D37 0%, #1a2620 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
      margin: 20px 0;
    }
    .result-box h2 { font-size: 20px; margin-bottom: 15px; }
    .result-price {
      font-size: 36px;
      font-weight: bold;
      color: #C9C19D;
      margin: 15px 0;
      font-family: 'Outfit', sans-serif;
    }
    .result-range {
      font-size: 14px;
      opacity: 0.9;
      margin-top: 10px;
      font-family: 'Outfit', sans-serif;
    }
    .disclaimer {
      background: #DEE8E9;
      padding: 20px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.8;
      margin: 20px 0;
    }
    .cta-section {
      background: #DEE8E9;
      padding: 25px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .cta-title {
      font-size: 18px;
      font-weight: bold;
      color: #2C3D37;
      margin-bottom: 15px;
    }
    .contact-info {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
      margin-top: 15px;
    }
    .footer {
      background: #2C3D37;
      color: white;
      padding: 30px;
      text-align: center;
      font-size: 13px;
    }
    .footer img { max-width: 120px; margin-bottom: 15px; opacity: 0.9; }
    @media only screen and (max-width: 600px) {
      .info-grid { grid-template-columns: repeat(2, 1fr); }
      .result-price { font-size: 28px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png" alt="Quetzal Hábitats">
      <h1>Reporte de Avalúo Comercial Inmobiliario</h1>
      <div class="codigo">Código: ${data.codigo_avaluo}</div>
      <p style="margin-top: 10px; font-size: 14px; opacity: 0.9;">${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="content">
      <div class="greeting">
        Estimado/a <strong>${data.nombre_contacto}</strong>,<br><br>
        Gracias por utilizar nuestro servicio de Avalúo Comercial Inmobiliario. A continuación encontrarás el análisis detallado de tu propiedad.
      </div>

      <div class="section">
        <div class="section-title">📍 Información del Inmueble</div>
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Barrio</div><div class="info-value">${data.barrio}</div></div>
          <div class="info-item"><div class="info-label">Municipio</div><div class="info-value">${data.municipio}</div></div>
          <div class="info-item"><div class="info-label">Tipo</div><div class="info-value">${data.tipo_inmueble || 'No especificado'}</div></div>
          <div class="info-item"><div class="info-label">Área Construida</div><div class="info-value" style="font-family: 'Outfit', sans-serif;">${data.area_construida} m²</div></div>
          <div class="info-item"><div class="info-label">Habitaciones</div><div class="info-value" style="font-family: 'Outfit', sans-serif;">${data.habitaciones || '—'}</div></div>
          <div class="info-item"><div class="info-label">Baños</div><div class="info-value" style="font-family: 'Outfit', sans-serif;">${data.banos || '—'}</div></div>
          <div class="info-item"><div class="info-label">Parqueaderos</div><div class="info-value" style="font-family: 'Outfit', sans-serif;">${data.tipo_parqueadero === 'propio' ? 'Propio' : data.tipo_parqueadero === 'comunal' ? 'Comunal' : 'No tiene'}</div></div>
          ${data.contexto_zona ? `<div class="info-item"><div class="info-label">Contexto Zona</div><div class="info-value">${data.contexto_zona === 'conjunto_cerrado' ? 'Conjunto Cerrado' : data.contexto_zona === 'urbanizacion_porteria' ? 'Urbanización con Portería' : 'Barrio Abierto'}</div></div>` : ''}
        </div>
      </div>

      <div class="result-box">
        <h2>💰 Valor Comercial Estimado</h2>
        <div class="result-price" style="font-family: 'Outfit', sans-serif;">$${valorEstimadoFinal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</div>
        <div class="result-range" style="font-family: 'Outfit', sans-serif;">
          Rango: $${rangoMin.toLocaleString('es-CO', { maximumFractionDigits: 0 })} - $${rangoMax.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
        </div>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.3);">
          <div style="font-size: 13px; margin-bottom: 5px;">Precio por m²</div>
          <div style="font-size: 22px; font-weight: bold; color: #C9C19D; font-family: 'Outfit', sans-serif;">
            $${precioM2Final.toLocaleString('es-CO', { maximumFractionDigits: 0 })}/m²
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">📊 Análisis de Mercado</div>
        <p style="margin-top: 10px; line-height: 1.8;">
          Se analizaron <strong>${comparablesData?.total_comparables || 0} propiedades comparables</strong> en la zona para determinar el valor de mercado de tu inmueble.
        </p>
        ${comparablesData?.resumen_busqueda ? `
          <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 6px; line-height: 1.8;">
            ${comparablesData.resumen_busqueda}
          </div>
        ` : ''}
      </div>

      <div class="disclaimer">
        <strong>⚠️ Aviso Legal:</strong><br>
        Este avalúo comercial es una estimación basada en el análisis de propiedades comparables en el mercado inmobiliario actual y no constituye un avalúo oficial o catastral. Los valores presentados son aproximados y pueden variar según las condiciones específicas del inmueble y del mercado. Para transacciones legales o financieras, se recomienda obtener un avalúo oficial realizado por un perito avaluador certificado.
      </div>

      <div class="cta-section">
        <div class="cta-title">¿Interesado en vender o comprar?</div>
        <p style="color: #2C3D37; margin-bottom: 20px;">En Quetzal Hábitats te ayudamos a encontrar el comprador ideal o la propiedad perfecta para ti. Contáctanos para una asesoría personalizada sin compromiso.</p>
      </div>

      <div class="cta-section">
        <div class="cta-title">¿Necesitas más información?</div>
        <div style="display: flex; justify-content: center; align-items: center; gap: 30px; flex-wrap: wrap; margin-top: 15px;">
          <span style="font-size: 14px; color: #2C3D37;">📞 +57 318 638 3809</span>
          <span style="font-size: 14px; color: #2C3D37;">✉️ contacto@quetzalhabitats.com</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <img src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png" alt="Quetzal Hábitats">
      <p><strong>Quetzal Hábitats</strong></p>
      <p>Avalúo Comercial Inmobiliario</p>
      <p style="margin-top: 15px;">
        📍 Cundinamarca, Colombia
      </p>
      <p style="margin-top: 10px; font-size: 12px; opacity: 0.8;">
        © 2025 Quetzal Hábitats - Todos los derechos reservados
      </p>
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