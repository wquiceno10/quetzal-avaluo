import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Send, CheckCircle, Phone, Mail, RefreshCw, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { guardarAvaluoEnSupabase } from '@/lib/avaluos';
import { generateAvaluoEmailHtml } from '@/lib/emailGenerator';

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
        estrato: formData.estrato,
        estado_inmueble: formData.estado_inmueble,
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

      const emailHtml = generateAvaluoEmailHtml({
        data: { ...data, ...formData, contacto_nombre: formData.contacto_nombre },
        codigoAvaluo,
        valorEstimadoFinal,
        rangoMin,
        rangoMax
      });

      const response = await fetch(`${import.meta.env.VITE_WORKER_EMAIL_URL}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email, // String, not array
          subject: `Reporte de Avalúo: ${formData.tipo_inmueble} en ${formData.barrio || formData.municipio || 'ubicación'}`,
          htmlBody: emailHtml // Worker expects "htmlBody", not "html"
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Worker email error:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`Error al enviar correo: ${response.status} - ${errorText}`);
        }
        throw new Error(errorData.error || 'Error al enviar el correo');
      }

      return { success: true, id: avaluoId };
    },
    onSuccess: (data) => {
      setEnviado(true);
    },
    onError: (error) => {
      console.error("Hubo un error al procesar tu solicitud:", error);
      setEnviado(false);
    }
  });

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const isValid = nombre && email; // Validación básica
    if (!isValid) return;

    // Combinar datos del formulario de contacto con los datos del avalúo
    const finalData = {
      ...formData,
      contacto_nombre: nombre,
      contacto_email: email,
      contacto_telefono: telefono,
    };

    sendEmailMutation.mutate(finalData);
  };

  const isValid = nombre?.length > 0 && email?.length > 0 && email?.includes('@');

  if (enviado) {
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
                Hemos enviado el reporte completo del avalúo a <strong>{email}</strong>.
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

            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
              <Button
                onClick={() => navigate(`/resultados/${sendEmailMutation.data?.id}`)}
                variant="outline"
                className="w-full sm:w-auto border-[#B0BDB4] text-[#2C3D37] rounded-full px-8 py-6 text-lg font-medium"
              >
                Volver a Resultados
              </Button>
              <Button
                onClick={onReset}
                className="w-full sm:w-auto bg-[#2C3D37] hover:bg-[#1a2620] text-white rounded-full px-8 py-6 text-lg font-medium"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Crear Nuevo Avalúo
              </Button>
              <Button
                onClick={() => window.open('https://wa.me/573186383809', '_blank')}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white rounded-full px-8 py-6 text-lg font-medium"
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
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
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

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={onBack}
            variant="outline"
            className="w-full sm:w-auto border-[#B0BDB4] text-[#2C3D37] rounded-full py-6 text-lg font-medium"
          >
            Volver
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || sendEmailMutation.isPending}
            className="w-full sm:flex-1 bg-[#2C3D37] hover:bg-[#1a2620] text-white rounded-full py-6 text-lg font-medium"
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
              {sendEmailMutation.error?.message || "Ocurrió un error al enviar el reporte. Por favor, verifica tu correo e intenta de nuevo."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}