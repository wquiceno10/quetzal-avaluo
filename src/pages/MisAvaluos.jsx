import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Mail, Calendar, MapPin, ArrowRight, Home, RefreshCw } from 'lucide-react';
import BotonPDF from '@/components/avaluo/BotonPDF';
import { useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MisAvaluos() {
    const navigate = useNavigate();
    const [avaluos, setAvaluos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sendingEmailId, setSendingEmailId] = useState(null);

    useEffect(() => {
        fetchAvaluos();
    }, []);

    const fetchAvaluos = async () => {
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error('Credenciales de Supabase no encontradas');
            }

            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // Should be handled by Layout redirect, but double check
                setLoading(false);
                return;
            }

            // La tabla no tiene columna user_id, usamos email del usuario autenticado
            const { data, error } = await supabase
                .from('avaluos')
                .select('*')
                .eq('email', user.email)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setAvaluos(data || []);
        } catch (err) {
            console.error('Error fetching avaluos:', err);
            setError('No pudimos cargar tus avalúos. Por favor intenta más tarde.');
        } finally {
            setLoading(false);
        }
    };

    const resendEmailMutation = useMutation({
        mutationFn: async (avaluo) => {
            const response = await fetch(import.meta.env.VITE_WORKER_EMAIL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: avaluo.email,
                    subject: `Reporte de Avalúo - ${avaluo.codigo_avaluo} (Reenvío)`,
                    htmlBody: generateEmailHtml(avaluo) // We need to reuse the logic or fetch the HTML
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al enviar email');
            }

            return response.json();
        },
        onSuccess: () => {
            alert('Reporte enviado exitosamente a tu correo.');
            setSendingEmailId(null);
        },
        onError: (err) => {
            alert(`Error: ${err.message}`);
            setSendingEmailId(null);
        }
    });

    const handleResendEmail = async (avaluo) => {
        setSendingEmailId(avaluo.id);
        // We need to reconstruct the email body. 
        // Since Step4Contact logic is complex and inside a component, 
        // for now we will use a simplified version or we should have stored the HTML.
        // Ideally, we should refactor Step4Contact email generation to a shared utility.
        // For this MVP, I'll use a placeholder alert or try to invoke the worker if the worker handles generation (it doesn't, frontend does).

        // CRITICAL: The email generation logic is in Step4Contact.jsx. 
        // To avoid duplication, we should extract it. 
        // For now, I will implement a simplified email resend that notifies the user 
        // or I will copy the minimal HTML structure needed.

        // Let's try to send the data to the worker and let the worker potentially handle it? 
        // No, the worker just sends raw HTML.

        // Strategy: We will use the same HTML generation logic as Step4Contact.
        // I will copy the `generateEmailHtml` function here for now to ensure it works.

        try {
            const htmlBody = generateEmailBody(avaluo);

            const response = await fetch(import.meta.env.VITE_WORKER_EMAIL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: avaluo.email,
                    subject: `Reporte de Avalúo - ${avaluo.codigo_avaluo}`,
                    htmlBody: htmlBody
                })
            });

            if (!response.ok) throw new Error('Error enviando email');
            alert('Correo reenviado exitosamente');
        } catch (e) {
            console.error(e);
            alert('Error al reenviar el correo');
        } finally {
            setSendingEmailId(null);
        }
    };

    const formatCurrency = (val) => {
        if (!val && val !== 0) return '—';
        return '$ ' + Math.round(val).toLocaleString('es-CO');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#2C3D37]" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col min-h-[80vh]">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#2C3D37] font-outfit">Mis Avalúos</h1>
                <p className="text-[#4F5B55] mt-2">Historial de tus valoraciones generadas</p>
            </div>

            <div className="flex-grow">
                {error && (
                    <Alert className="mb-6 bg-red-50 border-red-200">
                        <AlertDescription className="text-red-800">{error}</AlertDescription>
                    </Alert>
                )}

                {avaluos.length === 0 ? (
                    <Card className="border-dashed border-2 border-[#B0BDB4] bg-[#F5F4F0]/50 h-64 flex items-center justify-center">
                        <div className="text-center">
                            <div className="bg-[#DEE8E9] p-4 rounded-full mb-4 inline-block">
                                <FileText className="w-8 h-8 text-[#2C3D37]" />
                            </div>
                            <h3 className="text-xl font-semibold text-[#2C3D37] mb-2">No tienes avalúos guardados</h3>
                        </div>
                    </Card>
                ) : (
                    <div className="grid gap-6">
                        {avaluos.map((avaluo) => {
                            const formDataForPDF = {
                                ...avaluo,
                                comparables_data: avaluo.payload_json || {}
                            };
                            const compData = avaluo.payload_json || {};
                            let valorMostrar = avaluo.valor_final;
                            if (!valorMostrar) {
                                const v1 = compData.valor_estimado_venta_directa;
                                const v2 = compData.valor_estimado_rentabilidad;
                                if (v1 && v2) valorMostrar = (v1 + v2) / 2;
                                else valorMostrar = v1 || v2;
                            }

                            return (
                                <Card key={avaluo.id} className="border-[#E0E5E2] hover:shadow-md transition-all duration-300 overflow-hidden">
                                    <CardHeader className="pb-3 bg-[#F9FAF9] border-b border-[#F0F2F1]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="bg-white text-[#2C3D37] border-[#B0BDB4]">
                                                    {avaluo.codigo_avaluo || 'SIN CÓDIGO'}
                                                </Badge>
                                                <span className="text-xs text-[#7A8C85] flex items-center gap-1 uppercase tracking-wide">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(avaluo.created_at)}
                                                </span>
                                            </div>
                                            <Badge className="bg-[#DEE8E9] text-[#2C3D37] hover:bg-[#d0ddde]">
                                                {avaluo.status || 'Completado'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-1">
                                                <p className="text-xs text-[#7A8C85] font-bold uppercase tracking-wider">Inmueble</p>
                                                <div className="flex items-start gap-3">
                                                    <div className="bg-[#F0F2F1] p-2 rounded-md">
                                                        <Home className="w-5 h-5 text-[#2C3D37]" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-[#2C3D37] capitalize text-lg">{avaluo.tipo_inmueble}</p>
                                                        <p className="text-sm text-[#4F5B55]">
                                                            {avaluo.area_construida} m² • {avaluo.habitaciones || 0} Hab • {avaluo.banos || 0} Baños
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-xs text-[#7A8C85] font-bold uppercase tracking-wider">Ubicación</p>
                                                <div className="flex items-start gap-3">
                                                    <div className="bg-[#F0F2F1] p-2 rounded-md">
                                                        <MapPin className="w-5 h-5 text-[#2C3D37]" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-[#2C3D37] text-lg">{avaluo.barrio}</p>
                                                        <p className="text-sm text-[#4F5B55]">{avaluo.municipio || avaluo.ciudad}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-xs text-[#7A8C85] font-bold uppercase tracking-wider">Valor Estimado</p>
                                                <p className="text-3xl font-bold text-[#2C3D37] font-outfit">
                                                    {formatCurrency(valorMostrar)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 mt-8 pt-6 border-t border-[#F0F2F1]">
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <Button
                                                    onClick={() => navigate(`/resultados/${avaluo.id}`)}
                                                    className="bg-[#2C3D37] text-white hover:bg-[#1a2620] rounded-full py-6 flex-1"
                                                >
                                                    <ArrowRight className="w-4 h-4 mr-2" />
                                                    Ver Detalles
                                                </Button>
                                                <BotonPDF
                                                    formData={formDataForPDF}
                                                    className="bg-white text-[#2C3D37] border border-[#2C3D37] hover:bg-[#F0F2F1] rounded-full py-6 flex-1"
                                                    variant="outline"
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleResendEmail(avaluo)}
                                                disabled={sendingEmailId === avaluo.id}
                                                className="border-[#B0BDB4] text-[#4F5B55] hover:text-[#2C3D37] hover:bg-[#F5F7F6] rounded-full py-6 w-full"
                                            >
                                                {sendingEmailId === avaluo.id ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Mail className="w-4 h-4 mr-2" />
                                                )}
                                                Reenviar al Correo
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="mt-12 mb-[50px] flex justify-center">
                <Button
                    onClick={() => window.location.href = '/AvaluoInmobiliario'}
                    className="bg-[#2C3D37] hover:bg-[#1a2620] text-white rounded-full px-10 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Nuevo Avalúo
                </Button>
            </div>
        </div>
    );
}

// Helper function to generate email HTML (Matches PDF Design)
function generateEmailBody(data) {
    const comparablesData = data.payload_json || data.comparables_data || {};
    const esLote = (data.tipo_inmueble || '').toLowerCase().includes('lote');

    // Cálculos de valores (Prioridad a datos de backend V10)
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

    // Datos extraídos con fallback
    const area = parseFloat(data.area_construida || comparablesData.area_construida || 0);
    const ubicacion = `${data.barrio || comparablesData.barrio || ''}, ${data.municipio || data.ciudad || comparablesData.municipio || ''}`.replace(/^, /, '').replace(/, $/, '');

    // Formateadores
    const formatCurrency = (val) => val ? '$ ' + Math.round(val).toLocaleString('es-CO') : '—';
    const formatNumber = (val) => val ? Math.round(val).toLocaleString('es-CO') : '—';
    // Estado formatting
    const estado = (data.estado_inmueble || comparablesData.estado_inmueble || '—').replace(/_/g, ' ');
    const formatText = (text) => {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^#+\s*(.*?)$/gm, '<h4 style="margin: 15px 0 8px 0; color: #2C3D37;">$1</h4>')
            .replace(/^\s*[-*•]\s+(.*?)$/gm, '<li style="margin-bottom: 4px;">$1</li>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>');
    };

    // HTML del correo
    return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; line-height: 1.6; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; overflow: hidden; font-size: 14px; }
            
            /* HERO Styles */
            .hero { background-color: #2C3D37; color: white; padding: 30px 25px; border-radius: 0 0 15px 15px; }
            .hero-badge { background-color: #C9C19D; color: #1a2620; padding: 5px 12px; border-radius: 15px; font-size: 11px; font-weight: bold; display: inline-block; }
            .hero-value { font-size: 36px; font-weight: bold; line-height: 1; margin: 15px 0 5px 0; }
            .hero-sub { font-size: 12px; opacity: 0.8; }
            .hero-details { background: rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin-top: 25px; }
            
            .content { padding: 30px 25px; }
            .section-title { color: #2C3D37; font-size: 16px; font-weight: bold; border-bottom: 2px solid #C9C19D; padding-bottom: 8px; margin-bottom: 15px; margin-top: 25px; }
            
            .data-grid { width: 100%; border-collapse: collapse; }
            .data-grid td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
            .data-label { color: #666; width: 40%; font-weight: bold; font-size: 11px; text-transform: uppercase; }
            .data-val { color: #333; font-weight: bold; text-align: right; }
            
            .comp-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            .comp-table th { text-align: left; background: #F0ECD9; padding: 8px; font-size: 11px; }
            .comp-table td { border-bottom: 1px solid #eee; padding: 8px; }
            
            .footer-dark { background-color: #2C3D37; padding: 30px 20px; text-align: center; color: #8FA396; font-size: 11px; }
            
            .cta-box { background: #2C3D37; padding: 25px; text-align: center; border-radius: 10px; margin: 30px 0; color: white; }
            .btn-download { background-color: #C9C19D; color: #2C3D37; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- HERO HEADER -->
            <div class="hero">
               <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                     <td>
                        <div style="font-size:24px; font-weight:bold;">🏠 Valor Comercial</div>
                        <div style="font-size:12px; opacity:0.8; margin-top:4px;">Estimación de Inteligencia Inmobiliaria</div>
                     </td>
                     <td align="right" valign="top">
                        <span class="hero-badge">⚡ Estimación IA</span>
                     </td>
                  </tr>
               </table>
               
               <div class="hero-value">${formatCurrency(valorEstimadoFinal)}</div>
               <div class="hero-sub">COP (Pesos Colombianos)</div>
               
               <div class="hero-details">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                     <tr>
                        <td style="color:#D3DDD6; font-size:12px; padding-bottom:8px;">Rango Sugerido</td>
                        <td align="right" style="color:white; font-weight:bold; font-size:12px; padding-bottom:8px;">${formatCurrency(rangoMin)} - ${formatCurrency(rangoMax)}</td>
                     </tr>
                     <tr>
                        <td style="color:#D3DDD6; font-size:12px;">Muestra de Mercado</td>
                        <td align="right" style="color:white; font-weight:bold; font-size:12px;">${comparablesData.total_comparables || 0} inmuebles</td>
                     </tr>
                  </table>
               </div>
            </div>
            
            <div class="content">
              <p>Hola,</p>
              <p>Aquí tienes el detalle de la valoración para tu inmueble ubicado en <strong>${ubicacion}</strong>. Este reporte refleja el comportamiento real del mercado local.</p>

              <!-- FICHA TÉCNICA -->
              <div class="section-title">Información Detallada</div>
              <table class="data-grid">
                <tr><td class="data-label">Tipo Inmueble</td><td class="data-val">${data.tipo_inmueble || '—'}</td></tr>
                <tr><td class="data-label">Ubicación</td><td class="data-val">${ubicacion}</td></tr>
                <tr><td class="data-label">Área Construida</td><td class="data-val">${formatNumber(area)} m²</td></tr>
                ${!esLote ? `
                <tr><td class="data-label">Habitaciones</td><td class="data-val">${data.habitaciones || comparablesData.habitaciones || '-'}</td></tr>
                <tr><td class="data-label">Baños</td><td class="data-val">${data.banos || comparablesData.banos || '-'}</td></tr>
                <tr><td class="data-label">Estado</td><td class="data-val" style="text-transform: capitalize;">${estado}</td></tr>
                ` : `
                <tr><td class="data-label">Uso del Lote</td><td class="data-val">${data.uso_lote || '-'}</td></tr>
                `}
              </table>

              <!-- RESUMEN MERCADO -->
              <div class="section-title">Resumen del Mercado</div>
               <p style="font-size: 13px; text-align: justify; color: #555; line-height: 1.5; margin-bottom: 15px;">
                  ${comparablesData.resumen_busqueda || 'Análisis basado en la oferta actual del mercado.'}
               </p>
               
               <div style="background-color: #FFFDF5; border: 1px solid #E6E0C7; padding: 15px; border-radius: 8px; font-size: 12px; color: #555;">
                  <strong>💡 Tip:</strong> Descarga el reporte PDF completo desde la plataforma para ver gráficas detalladas y el análisis técnico completo.
               </div>
              
              <!-- CTA DESCARGA PDF -->
              <div class="cta-box">
                  <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">📄 Reporte Completo</div>
                  <div style="font-size: 13px; color: #D3DDD6; margin-bottom: 15px;">
                    Para ver todas las gráficas y guardar el informe oficial, descarga el PDF.
                  </div>
                  <a href="https://avaluos.quetzalhabitats.com/resultados/${data.id}" class="btn-download" style="background-color: #C9C19D; color: #2C3D37; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: bold; display: inline-block; margin-top: 15px;">
                    Descargar PDF
                  </a>
              </div>

              <!-- TABLA COMPARABLES (Top 5) -->
              <div class="section-title">Comparables Destacados</div>
              <table class="comp-table">
                <thead>
                  <tr>
                    <th>Inmueble</th>
                    <th style="text-align:center;">Área</th>
                    <th style="text-align:right;">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  ${(comparablesData.comparables || []).slice(0, 5).map(item => `
                  <tr>
                    <td>
                      <strong style="color:#2C3D37;">${item.titulo || 'Propiedad'}</strong><br>
                      <span style="color:#888; font-size:10px;">${item.barrio || ''}</span>
                    </td>
                    <td style="text-align:center;">${formatNumber(item.area_m2)} m²</td>
                    <td style="text-align:right;">
                      <strong>${formatCurrency(item.precio_cop)}</strong>
                      ${item.tipo_origen === 'arriendo' ? '<br><span style="color:#888; font-size:9px;">(Est. x Yield)</span>' : ''}
                    </td>
                  </tr>
                  `).join('')}
                </tbody>
              </table>
              <p style="font-size: 10px; color: #888; margin-top: 5px; text-align: center;">
                 Mostrando 5 de ${comparablesData.total_comparables || 0} inmuebles. Descarga el PDF para ver todos.
              </p>

              <!-- CONTACTO -->
              <div style="background-color: #F0F2F1; padding: 25px; text-align: center; border-radius: 10px; margin-top: 30px;">
                <div style="font-size: 16px; font-weight: bold; color: #2C3D37; margin-bottom: 10px;">¿Necesitas vender este inmueble?</div>
                <div style="font-size: 13px; color: #4F5B55; margin-bottom: 20px;">En Quetzal Hábitats conectamos tu propiedad con los clientes adecuados.</div>
                <a href="https://wa.me/573186383809" style="background-color: #2C3D37; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; font-size: 14px;">Contactar Asesor</a>
              </div>
            </div>

            <div class="footer-dark">
               <img src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png" alt="Quetzal" style="height: 40px; margin-bottom: 15px;">
               <p style="color: #8FA396; margin: 5px 0;">© 2025 Quetzal Hábitats - Todos los derechos reservados</p>
               <p style="color: #5A6D66; margin: 5px 0;">Código: ${data.codigo_avaluo}</p>
            </div>
          </div>
        </body>
        </html>
    `;
}