import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Send, CheckCircle, ArrowLeft, Building2, TrendingUp, Info } from 'lucide-react'; // Added icons
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { guardarAvaluoEnSupabase } from '@/lib/avaluos';

export default function Step4Contact({ formData, onBack, onReset }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [enviado, setEnviado] = useState(false);

  // --- LÓGICA DE CÁLCULO (IGUAL QUE SIEMPRE) ---
  const comparablesData = formData.comparables_data || {};
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

  const esLote = (formData.tipo_inmueble || '').toLowerCase().includes('lote');

  const formatCurrency = (val) => val ? '$ ' + Math.round(val).toLocaleString('es-CO') : '—';
  const formatNumber = (val) => val ? Math.round(val).toLocaleString('es-CO') : '—';

  const sendEmailMutation = useMutation({
    mutationFn: async (data) => {
      // --- PLANTILLA PREMIUM HERO EMAIL (CODIGO EXISTENTE) ---
      const codigoAvaluo = formData.codigo_avaluo || `QZ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000)}`;

      const payloadJson = {
        ...comparablesData,
        codigo_avaluo: codigoAvaluo,
        valor_final: valorEstimadoFinal,
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

      // Email Template Construction (Hero Design)
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
          .hero { background-color: #2C3D37; color: white; padding: 40px 30px; text-align: left; }
          .hero-label { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
          .hero-badge { background-color: #C9C19D; color: #2C3D37; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; display: inline-block; margin-left: auto; }
          .hero-price { font-size: 42px; font-weight: bold; margin: 15px 0 5px 0; letter-spacing: -1px; }
          .hero-sub { font-size: 14px; opacity: 0.8; margin-bottom: 25px; }
          .stats-box { background-color: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 15px; display: flex; justify-content: space-between; font-size: 12px; }
          .stat-item strong { display: block; font-size: 14px; margin-bottom: 2px; }
          .content { padding: 30px; }
          .intro-text { font-size: 14px; line-height: 1.6; color: #555; margin-bottom: 30px; }
          .section-title { font-size: 16px; font-weight: bold; color: #2C3D37; border-bottom: 2px solid #E8ECE9; padding-bottom: 10px; margin-bottom: 20px; margin-top: 10px; }
          .details-table { width: 100%; border-collapse: collapse; }
          .details-table td { padding: 12px 0; border-bottom: 1px solid #eee; font-size: 14px; }
          .label { font-weight: bold; color: #888; text-transform: uppercase; font-size: 11px; width: 40%; }
          .value { text-align: right; font-weight: bold; color: #333; }
          .footer { background-color: #1a2620; color: #8FA396; text-align: center; padding: 30px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="hero">
            <div class="hero-label"><span>🏠 Valor Comercial</span><span class="hero-badge">⚡ Estimación IA</span></div>
            <div class="hero-sub">Estimación de Inteligencia Inmobiliaria</div>
            <div class="hero-price">${valorFormateado}</div>
            <div class="hero-sub">COP (Pesos Colombianos)</div>
            <div class="stats-box">
               <div class="stat-item"><span>Rango Sugerido</span><strong>${rangoMinStr} - ${rangoMaxStr}</strong></div>
               <div class="stat-item" style="text-align:right;"><span>Muestra de Mercado</span><strong>${totalComparables} inmuebles</strong></div>
            </div>
          </div>
          <div class="content">
             <p class="intro-text">Hola <strong>${data.contacto_nombre || 'Usuario'}</strong>,<br><br>
               Aquí tienes el detalle de la valoración para tu inmueble en <strong>${data.barrio}, ${data.municipio}</strong>.
             </p>
             <div class="section-title">Información Detallada</div>
             <table class="details-table">
               <tr><td class="label">TIPO INMUEBLE</td><td class="value">${data.tipo_inmueble}</td></tr>
               <tr><td class="label">UBICACIÓN</td><td class="value">${data.barrio}, ${data.municipio}</td></tr>
               <tr><td class="label">ÁREA</td><td class="value">${data.area_construida} m²</td></tr>
               ${!esLote ? `<tr><td class="label">HABITACIONES</td><td class="value">${data.habitaciones || '-'}</td></tr><tr><td class="label">BAÑOS</td><td class="value">${data.banos || '-'}</td></tr>` : ''}
               <tr><td class="label">ESTADO</td><td class="value">${estadoInmueble}</td></tr>
             </table>
             <div style="background-color: #2C3D37; border-radius: 8px; padding: 30px; text-align: center; margin-top: 40px; color: white;">
                <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">📄 Reporte Completo</div>
                <a href="${detalleUrl}" style="background-color: #C9C19D; color: #2C3D37; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">Ver y Descargar PDF</a>
             </div>
          </div>
          <div class="footer">
             <img src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png" alt="Quetzal" style="filter: brightness(0) invert(1); opacity: 0.5; height: 30px; margin-bottom: 10px;">
             <p>© 2025 Quetzal Hábitats</p>
          </div>
        </div>
      </body>
      </html>`;

      const response = await fetch(`${import.meta.env.VITE_WORKER_EMAIL_URL}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, subject: `Reporte de Avalúo: ${data.tipo_inmueble} en ${data.barrio}`, htmlBody: emailHtml }),
      });

      if (!response.ok) throw new Error('Error enviando email');
      return { success: true, id: avaluoId };
    },
    onSuccess: (data) => {
      setEnviado(true);
      setTimeout(() => navigate(`/resultados/${data.id}`), 3500);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
      setEnviado(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !nombre || !telefono) return;
    sendEmailMutation.mutate({ ...formData, contacto_nombre: nombre, contacto_email: email, contacto_telefono: telefono });
  };

  if (enviado) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg border-0 bg-white/90 backdrop-blur-sm animate-in fade-in zoom-in duration-500">
        <CardContent className="pt-10 pb-10 text-center">
          <div className="w-20 h-20 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#2E7D32]" />
          </div>
          <h2 className="text-3xl font-bold text-[#2C3D37] mb-4 font-outfit">¡Reporte Enviado!</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">Revisa tu correo: <strong>{email}</strong></p>
        </CardContent>
      </Card>
    );
  }

  // --- RESTORED LAYOUT: Enfoque Cards + Form ---
  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-6 text-gray-600 hover:text-[#2C3D37] hover:bg-transparent pl-0">
        <ArrowLeft className="w-4 h-4 mr-2" /> Volver
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: RESUMEN DE VALORES (ESTILO DIC 5) */}
        <div className="space-y-6">
          <Card className="border-0 shadow-md bg-white overflow-hidden">
            <CardHeader className="bg-[#2C3D37] text-white py-4 text-center">
              <CardTitle className="text-lg font-outfit">Resultados Preliminares</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-[#F8F9FA] p-4 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" /> Enfoque de Mercado
                </div>
                <div className="text-2xl font-bold text-[#2C3D37]">
                  {formatCurrency(valorVentaDirecta)}
                </div>
                <div className="text-xs text-gray-400 mt-1">Comparables directos</div>
              </div>

              {!esLote && (
                <div className="bg-[#F8F9FA] p-4 rounded-lg border border-gray-100">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1 flex items-center">
                    <Building2 className="w-3 h-3 mr-1" /> Enfoque de Rentabilidad
                  </div>
                  <div className="text-2xl font-bold text-[#2C3D37]">
                    {formatCurrency(valorRentabilidad)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Estimación por renta</div>
                </div>
              )}

              <div className="flex items-start p-3 bg-blue-50 text-blue-800 rounded text-xs">
                <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                Estos valores son estimaciones preliminares. El reporte final PDF incluye el análisis detallado y el valor comercial sugerido.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO */}
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-xl font-bold font-outfit text-[#2C3D37]">Recibe el Reporte Oficial</CardTitle>
            <CardDescription className="text-gray-500 text-sm">
              Ingresa tus datos para generar el PDF con firma digital y enviarlo a tu correo.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-[#2C3D37] font-medium text-sm">Nombre Completo</Label>
                <Input id="nombre" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="h-10 border-gray-300" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#2C3D37] font-medium text-sm">Correo Electrónico</Label>
                <Input id="email" type="email" placeholder="tucorreo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10 border-gray-300" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono" className="text-[#2C3D37] font-medium text-sm">Celular / WhatsApp</Label>
                <Input id="telefono" type="tel" placeholder="300 123 4567" value={telefono} onChange={(e) => setTelefono(e.target.value)} required className="h-10 border-gray-300" />
              </div>

              <div className="pt-2 text-xs text-center text-gray-400 mb-4">
                Tus datos están seguros. Solo los usaremos para enviarte el reporte.
              </div>

              <Button type="submit" disabled={sendEmailMutation.isPending} className="w-full bg-[#2C3D37] hover:bg-[#1a2620] text-white h-11 font-medium">
                {sendEmailMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</> : <><Send className="w-4 h-4 mr-2" /> Enviar Reporte PDF</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}