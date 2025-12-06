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
                                <Card key={avaluo.id} className="border-[#E0E5E2] hover:shadow-md transition-all duration-300">
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
                                        <div className="grid md:grid-cols-3 gap-6">
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

                                        <div className="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-[#F0F2F1]">
                                            <div className="flex-1 flex gap-3">
                                                <Button
                                                    onClick={() => navigate(`/resultados/${avaluo.id}`)}
                                                    className="bg-[#2C3D37] text-white hover:bg-[#1a2620]"
                                                >
                                                    <ArrowRight className="w-4 h-4 mr-2" />
                                                    Ver Detalles
                                                </Button>
                                                <BotonPDF
                                                    formData={formDataForPDF}
                                                    className="bg-white text-[#2C3D37] border border-[#2C3D37] hover:bg-[#F0F2F1]"
                                                    variant="outline"
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleResendEmail(avaluo)}
                                                disabled={sendingEmailId === avaluo.id}
                                                className="border-[#B0BDB4] text-[#4F5B55] hover:text-[#2C3D37] hover:bg-[#F5F7F6]"
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

// Helper function to generate email HTML (Simplified version of Step4Contact logic)
function generateEmailBody(data) {
    const formatCurrency = (val) => {
        if (!val && val !== 0) return '—';
        return '$ ' + Math.round(val).toLocaleString('es-CO');
    };

    const comparablesData = data.payload_json || data.comparables_data || {};

    // Calculate value
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

    // Basic HTML Template
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2C3D37; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 20px; border: 1px solid #ddd; }
    .value-box { background-color: #f8f9fa; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .value { font-size: 24px; font-weight: bold; color: #2C3D37; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Reporte de Avalúo</h2>
      <p>Código: ${data.codigo_avaluo}</p>
    </div>
    <div class="content">
      <p>Hola <strong>${data.nombre_contacto}</strong>,</p>
      <p>Adjunto encontrarás el detalle de la valoración para tu inmueble en <strong>${data.barrio}, ${data.municipio}</strong>.</p>
      
      <div class="value-box">
        <p>Valor Comercial Estimado</p>
        <div class="value">${formatCurrency(valorEstimadoFinal)}</div>
        <p style="font-size: 14px; color: #666;">Rango: ${formatCurrency(rangoMin)} - ${formatCurrency(rangoMax)}</p>
      </div>

      <h3>Detalles del Inmueble</h3>
      <ul>
        <li>Tipo: ${data.tipo_inmueble}</li>
        <li>Área: ${data.area_construida} m²</li>
        <li>Habitaciones: ${data.habitaciones || 'N/A'}</li>
        <li>Baños: ${data.banos || 'N/A'}</li>
      </ul>

      <p>Para ver el análisis completo y los comparables detallados, por favor descarga el PDF adjunto o visita nuestra plataforma.</p>
    </div>
    <div class="footer">
      <p>© 2025 Quetzal Hábitats. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
    `;
}
