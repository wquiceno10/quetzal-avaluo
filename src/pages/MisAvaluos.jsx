import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Mail, Calendar, MapPin, ArrowRight, Home, RefreshCw, Trash2 } from 'lucide-react';
import BotonPDF from '@/components/avaluo/BotonPDF';
import { useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateAvaluoEmailHtml } from '@/lib/emailGenerator';

export default function MisAvaluos() {
    const navigate = useNavigate();
    const [avaluos, setAvaluos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sendingEmailId, setSendingEmailId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

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

            // Intentar obtener el usuario actual
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            console.log('[MisAvaluos] getUser result:', { user, userError });

            // Si getUser falla, intentar con getSession como fallback
            let userEmail = user?.email;

            if (!userEmail) {
                console.log('[MisAvaluos] getUser returned null, trying getSession...');
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                console.log('[MisAvaluos] getSession result:', { session, sessionError });
                userEmail = session?.user?.email;
            }

            if (!userEmail) {
                console.warn('[MisAvaluos] No se pudo obtener email del usuario');
                // En desarrollo local, permitir listar todos los avalúos para testing
                const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

                if (isLocalDev) {
                    console.log('[MisAvaluos] Modo desarrollo - listando todos los avalúos');
                    const { data, error } = await supabase
                        .from('avaluos')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(10); // Limitar a 10 para no saturar

                    if (error) throw error;
                    setAvaluos(data || []);
                    setLoading(false);
                    return;
                }

                // En producción, si no hay usuario, no mostrar nada
                setLoading(false);
                return;
            }

            console.log('[MisAvaluos] Buscando avalúos para email:', userEmail);

            // Buscar avalúos por email del usuario
            const { data, error } = await supabase
                .from('avaluos')
                .select('*')
                .eq('email', userEmail)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[MisAvaluos] Error al consultar avalúos:', error);
                throw error;
            }

            console.log('[MisAvaluos] Avalúos encontrados:', data?.length || 0);
            setAvaluos(data || []);
        } catch (err) {
            console.error('[MisAvaluos] Error fetching avaluos:', err);
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

        try {
            const comparablesData = avaluo.payload_json || {};
            const codigoAvaluo = avaluo.codigo_avaluo;

            // Calcular valores (misma lógica que en otras partes)
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

            // Usar el helper compartido
            const htmlBody = generateAvaluoEmailHtml({
                data: {
                    ...avaluo,
                    ...comparablesData,
                    // Asegurar uso_lote desde cualquier fuente posible
                    uso_lote: avaluo.uso_lote || comparablesData.uso_lote || comparablesData.ficha_tecnica_defaults?.uso_lote
                },
                codigoAvaluo,
                valorEstimadoFinal,
                rangoMin,
                rangoMax
            });

            const response = await fetch(`${import.meta.env.VITE_WORKER_EMAIL_URL}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: avaluo.email,
                    subject: `Reporte de Avalúo: ${avaluo.tipo_inmueble} en ${avaluo.barrio}`,
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

    const handleDeleteAvaluo = async (avaluoId, codigoAvaluo) => {
        if (!confirm(`¿Estás seguro de eliminar el avalúo ${codigoAvaluo}? Esta acción no se puede deshacer.`)) {
            return;
        }

        setDeletingId(avaluoId);

        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            const { error } = await supabase
                .from('avaluos')
                .delete()
                .eq('id', avaluoId);

            if (error) throw error;

            // Actualizar la lista localmente
            setAvaluos(avaluos.filter(a => a.id !== avaluoId));
        } catch (e) {
            console.error('Error eliminando avalúo:', e);
            alert('Error al eliminar el avalúo. Por favor intenta de nuevo.');
        } finally {
            setDeletingId(null);
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

    // Helper: Convertir texto a Title Case (Primera Letra Mayúscula)
    const toTitleCase = (str) => {
        if (!str) return '';
        const smallWords = ['y', 'de', 'en', 'a', 'o', 'la', 'el', 'del', 'un', 'una', 'para', 'por', 'con', 'sin'];
        return str
            .toLowerCase()
            .split(' ')
            .map((word, index) => {
                // Primera palabra siempre en mayúscula, o si no es palabra pequeña
                if (index === 0 || !smallWords.includes(word)) {
                    return word.charAt(0).toUpperCase() + word.slice(1);
                }
                return word;
            })
            .join(' ');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#2C3D37]" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#2C3D37] font-outfit">Mis Avalúos</h1>
                    <p className="text-[#4F5B55] mt-2">Historial de tus valoraciones generadas</p>
                </div>
                <button
                    onClick={() => navigate('/AvaluoInmobiliario')}
                    className="text-[#7A8C85] hover:text-[#2C3D37] transition-colors flex items-center gap-1.5 font-medium text-sm mt-1"
                >
                    <RefreshCw className="w-4 h-4" />
                    Nuevo Avalúo
                </button>
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
                                comparables_data: avaluo.payload_json || {},
                                // Asegurar uso_lote para el PDF
                                uso_lote: avaluo.uso_lote || avaluo.payload_json?.uso_lote || avaluo.payload_json?.ficha_tecnica_defaults?.uso_lote
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
                                <Card key={avaluo.id} className="border-[#E0E5E2] hover:shadow-md transition-all duration-300 overflow-hidden relative">
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
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-[#DEE8E9] text-[#2C3D37] hover:bg-[#d0ddde]">
                                                    {avaluo.status || 'Completado'}
                                                </Badge>
                                                <button
                                                    onClick={() => handleDeleteAvaluo(avaluo.id, avaluo.codigo_avaluo)}
                                                    disabled={deletingId === avaluo.id}
                                                    className="p-2 text-[#7A8C85] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Eliminar avalúo"
                                                >
                                                    {deletingId === avaluo.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
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
                                                        <p className="font-semibold text-[#2C3D37] capitalize text-lg">{toTitleCase(avaluo.tipo_inmueble)}</p>
                                                        <p className="text-sm text-[#4F5B55]">
                                                            {(avaluo.tipo_inmueble || '').toLowerCase().includes('lote') ? (
                                                                <>
                                                                    {avaluo.area_construida || avaluo.payload_json?.area_construida || '—'} m² • {toTitleCase(avaluo.uso_lote || avaluo.payload_json?.uso_lote || '—')} • {toTitleCase(avaluo.municipio || avaluo.ciudad || '—')}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {avaluo.area_construida || avaluo.payload_json?.area_construida || '—'} m² • {avaluo.habitaciones || avaluo.payload_json?.habitaciones || '—'} Hab • {avaluo.banos || avaluo.payload_json?.banos || '—'} Baños
                                                                </>
                                                            )}
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
                                                        <p className="font-semibold text-[#2C3D37] text-lg">{toTitleCase(avaluo.barrio)}</p>
                                                        <p className="text-sm text-[#4F5B55]">{toTitleCase(avaluo.municipio || avaluo.ciudad)}</p>
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

            <div className="mt-12 flex justify-center">
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
