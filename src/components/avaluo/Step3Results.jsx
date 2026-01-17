import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { generateAvaluoEmailHtml } from '@/lib/emailGenerator';
import { mapearEstadoSinPrecio } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    ArrowRight,
    TrendingUp,
    Home,
    Calculator,
    AlertCircle,
    Info,
    ChevronDown,
    ChevronUp,
    FileText,
    Globe,
    Download,
    DollarSign,
    X,
    Loader2,
    Mail,
    Send,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Share2,
    Copy,
    Check,
    AlertTriangle
} from 'lucide-react';
import TablaComparables from './TablaComparables';
import BotonPDF from './BotonPDF';
import { MarkdownTable } from './MarkdownTable';
import { construirTextoConfianza } from '@/lib/confidenceHelper';
import { NOTA_DISCLAIMER } from '@/lib/constants';
import { isDevelopmentMode, getDevUser } from '@/utils/devAuth';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Helper: Convertir texto a Title Case (Primera Letra Mayúscula)
const toTitleCase = (str) => {
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

const validarNumero = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
};

// --- COMPONENTE DE FORMATO DE TEXTO ---
const AnalisisAI = ({ text }) => {
    if (!text) return null;

    // 1. FILTRAR PREÁMBULO TÉCNICO (Root)
    let filteredContent = text;
    const startMarkerIndex = text.search(/(?:\n|^)\s*(?:#{1,3}\s*|\*\*?\s*)1[.\s]/i);
    if (startMarkerIndex !== -1) {
        filteredContent = text.substring(startMarkerIndex).trim();
    } else {
        const fallbackIdx = text.search(/(?:\n|^)\s*1[.\s]\s*DESCR/i);
        if (fallbackIdx !== -1) {
            filteredContent = text.substring(fallbackIdx).trim();
        }
    }

    // 2. LIMPIEZA INICIAL (LaTeX, HTML, Notación científica)
    let cleanText = filteredContent
        .replace(/\\quad/g, '<br>')
        .replace(/\\qquad/g, '<br>')
        .replace(/\\,/g, ' ')
        .replace(/\\:/g, ' ')
        .replace(/\\;/g, ' ')
        .replace(/\\!/g, '')
        .replace(/\\enspace/g, ' ')
        .replace(/\\hspace\{[^}]*\}/g, ' ')
        .replace(/\\\(/g, '')
        .replace(/\\\)/g, '')
        .replace(/\\\[/g, '')
        .replace(/\\\]/g, '')
        .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1 / $2)')
        .replace(/\\times/g, ' × ')
        .replace(/\\text\{([^}]+)\}/g, '$1')
        .replace(/\\sum/g, '∑')
        .replace(/\\approx/g, '≈')
        .replace(/\\cdot/g, '•')
        .replace(/\\{/g, '')
        .replace(/\\}/g, '')
        .replace(/\^2/g, '²')
        .replace(/\s+COP\/m²/g, ' COP/m²')
        .replace(/Promedio precio por m²\s*=\s*(?:\\frac\{[^{}]+\}\{[^{}]+\}|[^\n≈]+)\s*≈\s*([\d\.\,]+)\s*COP\/m²/gi, 'Promedio precio por m² ≈ $1 COP/m²')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/(\d+(?:[.,]\d+)?)\s*[×x]\s*10\^(\d+)/gi, (match, coefficient, exponent) => {
            const num = parseFloat(coefficient.replace(',', '.'));
            const power = parseInt(exponent);
            const result = num * Math.pow(10, power);
            return Math.round(result).toLocaleString('es-CO');
        })
        .replace(/[═]+/g, '')
        .replace(/\s+--\s+/g, ' ')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[\d+\]/g, '');

    // 3. BADGES Y NOTAS
    const getBadgeHtml = (validation, includeNote = false) => {
        const val = validation.trim().toLowerCase();
        let badgeClass = '';
        let badgeText = validation.trim();
        if (val === 'coincidencia') {
            badgeClass = 'bg-green-100 text-green-700 border-green-300';
            badgeText = '✓ Coincidencia';
        } else if (val === 'zona_similar') {
            badgeClass = 'bg-blue-100 text-blue-700 border-blue-300';
            badgeText = '→ Zona Similar';
        } else if (val === 'zona_extendida') {
            badgeClass = 'bg-orange-100 text-orange-700 border-orange-300';
            badgeText = '≈ Zona Extendida';
        } else {
            badgeClass = 'bg-gray-100 text-gray-600 border-gray-300';
        }
        return `<span class="inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${badgeClass} align-middle ml-1">${badgeText}</span>`;
    };

    cleanText = cleanText
        .replace(/(?:(?:<strong>)?\s*(?:#{1,3}|\*\*)\s*)?fuente_validacion:\s*([^\r\n<]+)/gi, (m, v) => getBadgeHtml(v))
        .replace(/(?:\()?\b(coincidencia|zona_extendida|zona_similar)\b(?!\s*<\/span>)/gi, (m, tag) => getBadgeHtml(tag))
        .replace(/(?:<strong>)?(?:\*\*)?Nota:(?:\*\*)?(?:<\/strong>)?\s*([^\n]+)/gi, (match, noteText) => {
            return `<span style="display:block; font-size:11px; color:#6B7280; font-style:italic; margin-top:2px;"><strong>Nota:</strong> ${noteText}</span>`;
        });

    // 4. PROCESAR BLOQUES (Split por doble salto)
    const blocks = cleanText.split(/\n\n/).filter(b => b.trim());
    const renderedBlocks = [];

    blocks.forEach((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) return;

        // A. Títulos con Markdown (## o #)
        const hashMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
        if (hashMatch) {
            const level = hashMatch[1].length;
            const titleText = hashMatch[2].replace(/<[^>]+>/g, '').trim();
            renderedBlocks.push(
                <h3 key={`h-${index}`} className={`font-outfit font-medium ${level === 1 ? 'text-xl' : 'text-lg'} text-[#2C3D37] ${renderedBlocks.length === 0 ? 'mt-0' : 'mt-8'} mb-3 border-b border-[#C9C19D]/50 pb-1`}>
                    {toTitleCase(titleText)}
                </h3>
            );
            return;
        }

        // B. Títulos Numerados (X.X o X.) - Solo si no parecen ítems de datos ($) y tienen texto largo
        const firstLine = trimmed.split('\n')[0];
        const subTitleMatch = firstLine.match(/^(\d+(?:\.\d+)?\.?)\s+([^:\n]{10,130})$/);
        const isDataLine = firstLine.includes('$') || firstLine.includes('→') || firstLine.includes('×');

        if (subTitleMatch && !isDataLine) {
            const titleText = subTitleMatch[2].replace(/<[^>]+>/g, '').trim();
            renderedBlocks.push(
                <h4 key={`sh-${index}`} className={`font-outfit font-semibold text-base text-[#2C3D37] ${renderedBlocks.length === 0 ? 'mt-0' : 'mt-6'} mb-2`}>
                    {subTitleMatch[1]} {toTitleCase(titleText)}
                </h4>
            );
            const remaining = trimmed.split('\n').slice(1).join('\n').trim();
            if (remaining) renderedBlocks.push(<p key={`p-${index}-r`} className="mb-4 text-sm text-[#4F5B55] text-justify" dangerouslySetInnerHTML={{ __html: remaining.replace(/\n/g, '<br>') }} />);
            return;
        }

        // C. Tablas
        if (trimmed.startsWith('|')) {
            renderedBlocks.push(<MarkdownTable key={`tbl-${index}`} content={trimmed} />);
            return;
        }

        // D. Listas (Numeradas o con Viñetas - Preservando el marcador original)
        const isList = trimmed.match(/^[-*•]\s/) || trimmed.match(/^\d+[.)]\s/);
        if (isList) {
            const lines = trimmed.split('\n');
            const listItems = [];
            let current = '';

            for (const line of lines) {
                const lineTrimmed = line.trim();
                // Detección de marcador: - , * , • o número X.
                if (lineTrimmed.match(/^[-*•]\s/) || lineTrimmed.match(/^\d+[.)]\s/)) {
                    if (current) listItems.push(current);
                    current = lineTrimmed;
                } else if (lineTrimmed) {
                    current += '\n' + lineTrimmed;
                }
            }
            if (current) listItems.push(current);

            renderedBlocks.push(
                <ul key={`list-${index}`} className="list-none space-y-2 mb-4">
                    {listItems.map((item, i) => {
                        // Extraer el marcador real (ej: "1.", "-", "*")
                        const markerMatch = item.match(/^([-*•]|\d+[.)])\s*/);
                        const marker = markerMatch ? markerMatch[1] : '•';
                        const content = item.replace(/^([-*•]|\d+[.)])\s*/, '').replace(/\n/g, '<br>');

                        return (
                            <li key={i} className="flex gap-2 text-sm text-[#4F5B55] text-left">
                                <span className="font-bold min-w-[20px]">{marker}</span>
                                <span dangerouslySetInnerHTML={{ __html: content }} />
                            </li>
                        );
                    })}
                </ul>
            );
            return;
        }

        // E. Párrafo normal
        renderedBlocks.push(
            <p key={`p-${index}`} className="mb-4 text-sm text-[#4F5B55] leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: trimmed.replace(/\n/g, '<br>') }} />
        );
    });

    return (
        <div className="text-[#4F5B55] font-raleway">
            <div className="hidden md:block columns-2 gap-10" style={{ columnFill: 'balance' }}>
                {renderedBlocks}
            </div>
            <div className="md:hidden space-y-2">
                {renderedBlocks}
            </div>
        </div>
    );
};

export default function Step3Results({ formData, onUpdate, onNext, onBack, onReset, autoDownloadPDF, onEmailSent, actionButtonLabel = "Enviar a un Correo", ActionButtonIcon = Mail, actionButtonIconPosition = "left" }) {
    const [mostrarComparables, setMostrarComparables] = useState(false);
    const [mostrarCostos, setMostrarCostos] = useState(false);
    const [hasAvaluos, setHasAvaluos] = useState(false);
    const [feedbackModal, setFeedbackModal] = useState({ open: false, title: '', description: '', type: 'success' });
    const [linkCopied, setLinkCopied] = useState(false);
    const pdfButtonRef = useRef(null);
    const navigate = useNavigate();

    // Función para compartir/copiar enlace
    const handleShareLink = async () => {
        const avaluoId = formData.id;
        if (!avaluoId) {
            setFeedbackModal({
                open: true,
                title: 'No disponible',
                description: 'Este avalúo aún no ha sido guardado. Completa el proceso para poder compartirlo.',
                type: 'error'
            });
            return;
        }

        const shareUrl = `${window.location.origin}/resultados/${avaluoId}`;

        // Intentar usar Web Share API (móvil)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Avalúo Comercial - Quetzal Hábitats',
                    text: `Mira mi avalúo: ${formData.tipo_inmueble} en ${formData.barrio || formData.municipio}`,
                    url: shareUrl
                });
                return;
            } catch (err) {
                // Si el usuario cancela, seguimos con copiar al portapapeles
                if (err.name !== 'AbortError') console.log('Share failed, falling back to clipboard');
            }
        }

        // Fallback: copiar al portapapeles
        try {
            await navigator.clipboard.writeText(shareUrl);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (err) {
            setFeedbackModal({
                open: true,
                title: 'Error',
                description: 'No se pudo copiar el enlace. Intenta de nuevo.',
                type: 'error'
            });
        }
    };

    useEffect(() => {
        const checkAvaluos = async () => {
            try {
                if (isDevelopmentMode()) {
                    const devUser = getDevUser();
                    if (devUser) {
                        setHasAvaluos(true);
                    }
                    return;
                }

                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                if (!supabaseUrl || !supabaseAnonKey) return;
                const supabase = createClient(supabaseUrl, supabaseAnonKey);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { count } = await supabase
                    .from('avaluos')
                    .select('*', { count: 'exact', head: true })
                    .eq('email', user.email);

                setHasAvaluos(count && count > 0);
            } catch (e) {
                console.error("Error checking avaluos:", e);
            }
        };
        checkAvaluos();
    }, []);

    useEffect(() => {
        if (autoDownloadPDF && pdfButtonRef.current) {
            const timer = setTimeout(() => {
                pdfButtonRef.current?.click();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [autoDownloadPDF]);

    const sendEmailMutation = useMutation({
        mutationFn: async () => {
            const data = formData.comparables_data || formData;
            const codigoAvaluo = formData.codigo_avaluo || data.codigo_avaluo;

            const valorVentaDirecta = validarNumero(data.valor_estimado_venta_directa);
            const valorRentabilidad = validarNumero(data.valor_estimado_rentabilidad);
            const rangoMin = validarNumero(data.rango_valor_min);
            const rangoMax = validarNumero(data.rango_valor_max);

            let valorPrincipal = validarNumero(data.valor_final);
            if (!valorPrincipal) {
                if (rangoMin && rangoMax) valorPrincipal = Math.round((rangoMin + rangoMax) / 2);
                else if (valorVentaDirecta && valorRentabilidad) valorPrincipal = Math.round(valorVentaDirecta * 0.80 + valorRentabilidad * 0.20);
                else valorPrincipal = valorVentaDirecta || valorRentabilidad || null;
            }

            const emailHtml = generateAvaluoEmailHtml({
                data: { ...data, ...formData },
                codigoAvaluo,
                valorEstimadoFinal: valorPrincipal,
                rangoMin,
                rangoMax,
                confianzaInfo: construirTextoConfianza(data, validarNumero(data.comparables_totales_encontrados), validarNumero(data.comparables_usados_en_calculo) || validarNumero(data.total_comparables))
            });

            const recipient = formData.email || formData.contacto_email;
            console.log("📧 [Mutation] Intentando enviar email a:", recipient);

            const response = await fetch(`${import.meta.env.VITE_WORKER_EMAIL_URL}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipient,
                    subject: `Reporte de Avalúo: ${data.tipo_inmueble} en ${data.barrio}`,
                    htmlBody: emailHtml
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("📧 [Mutation] Error del Worker:", errorData);
                throw new Error(errorData.error || 'Error al enviar el correo');
            }
            console.log("📧 [Mutation] ¡Correo enviado con éxito!");
            return true;
        },
        onSuccess: () => {
            // If callback provided (for historical views), call it instead of showing modal
            if (onEmailSent) {
                onEmailSent();
            } else {
                setFeedbackModal({
                    open: true,
                    title: '¡Correo enviado!',
                    description: `El reporte del avalúo ha sido enviado exitosamente a ${formData.email || formData.contacto_email}.`,
                    type: 'success'
                });
            }
        },
        onError: (error) => {
            console.error("Error reenviando correo:", error);
            // alert("Error al reenviar el correo. Por favor intenta de nuevo.");
            setFeedbackModal({
                open: true,
                title: 'Error al enviar',
                description: 'No pudimos enviar el correo en este momento. Por favor intenta de nuevo más tarde.',
                type: 'error'
            });
        }
    });

    const handleAction = () => {
        if (formData.id && (formData.email || formData.contacto_email)) {
            sendEmailMutation.mutate();
        } else {
            onNext();
        }
    };

    const renderErrorState = (message, action) => (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-gray-50 rounded-xl border border-gray-200">
            <AlertCircle className="w-12 h-12 text-[#FF9E9E] mb-4" />
            <h3 className="text-xl font-semibold text-[#2C3D37] mb-2">No pudimos analizar esta propiedad</h3>
            <p className="text-[#4F5B55] mb-6 max-w-md">{message}</p>
            <Button onClick={action} className="bg-[#2C3D37] text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver al formulario
            </Button>
        </div>
    );

    if (!formData) return renderErrorState('Datos del formulario no disponibles', onBack);

    const data = formData.comparables_data || formData;
    if (!data || (Array.isArray(data.comparables) && data.comparables.length === 0 && !data.valor_final)) {
        if (!data.valor_final && !data.valor_estimado_venta_directa && !data.valor_estimado_rentabilidad) {
            return renderErrorState("Análisis de mercado insuficiente", onBack);
        }
    }

    const valorMercado = validarNumero(data.valor_mercado) || validarNumero(data.valor_estimado_venta_directa);
    const valorVentaDirecta = valorMercado;
    const factorAjuste = validarNumero(data.factor_ajuste_total) || 1.0;
    const valorRentabilidad = validarNumero(data.valor_estimado_rentabilidad);
    const rangoMin = validarNumero(data.rango_valor_min);
    const rangoMax = validarNumero(data.rango_valor_max);
    const precioM2Usado = validarNumero(data.precio_m2_ref) || validarNumero(data.precio_m2_implicito) || validarNumero(data.precio_m2_final);


    let valorPrincipal = validarNumero(data.valor_final);
    if (!valorPrincipal) {
        if (rangoMin && rangoMax) valorPrincipal = Math.round((rangoMin + rangoMax) / 2);
        else if (valorVentaDirecta && valorRentabilidad) valorPrincipal = Math.round(valorVentaDirecta * 0.80 + valorRentabilidad * 0.20);
        else valorPrincipal = valorVentaDirecta || valorRentabilidad || null;
    }

    const areaInmueble = validarNumero(formData.area_construida || formData.area_total || data.area_construida || data.area_total);
    const esLote = (formData.tipo_inmueble || '').toLowerCase().includes('lote');
    const usoLote = formData.uso_lote || data.uso_lote;

    // Calcular costos de venta (Colombia 2025) - Frontend Only
    const calcularCostosVenta = (valor) => {
        if (!valor || valor <= 0) return null;

        // 1. Retención en la fuente: 1% fijo sobre el valor de venta
        // (Estatuto Tributario Art. 398 - Corrección: es tasa fija del 1%, no progresiva)
        const retencionFuente = valor * 0.01;

        // 2. Gastos Notariales: ~0.54% total, vendedor paga 50%
        // (Resolución de tarifas notariales vigente)
        const gastosNotarialesVendedor = valor * 0.0027; // 0.27%

        // 3. Comisión Inmobiliaria: 3% + IVA (19% sobre la comisión)
        const comisionBase = valor * 0.03;
        const ivaComision = comisionBase * 0.19;
        const comisionTotal = comisionBase + ivaComision;

        // Total descuentos vendedor
        const totalDescuentos = retencionFuente + gastosNotarialesVendedor + comisionTotal;
        const netoRecibir = valor - totalDescuentos;

        // Costos comprador (informativo)
        const gastosNotarialesComprador = valor * 0.0027; // 0.27%
        const beneficenciaRegistro = valor * 0.0167; // ~1.67% (1% Beneficencia + ~0.6-0.7% Registro)
        const totalGastosComprador = gastosNotarialesComprador + beneficenciaRegistro;

        return {
            seller: {
                retencion: retencionFuente,
                notariales: gastosNotarialesVendedor,
                comision: comisionTotal,
                totalDescuentos,
                netoRecibir
            },
            buyer: {
                notariales: gastosNotarialesComprador,
                registro: beneficenciaRegistro,
                totalGastos: totalGastosComprador
            }
        };
    };

    const costosVenta = calcularCostosVenta(valorPrincipal);

    const formatCurrency = (value) => {
        const num = validarNumero(value);
        if (num === null) return '—';
        return '$ ' + Math.round(num).toLocaleString('es-CO');
    };

    const formatNumber = (value) => {
        const num = validarNumero(value);
        if (num === null) return '—';
        return Math.round(num).toLocaleString('es-CO');
    };

    const tieneComparables = Array.isArray(data.comparables) && data.comparables.length > 0;
    const tieneAnalisisCompleto = data.perplexity_full_text && data.perplexity_full_text.length > 50;
    const tieneResumen = data.resumen_busqueda && data.resumen_busqueda.length > 10;

    const totalComparables = validarNumero(data.comparables_usados_en_calculo) || validarNumero(data.total_comparables);
    const totalEncontrados = validarNumero(data.comparables_totales_encontrados);
    const totalVenta = validarNumero(data.total_comparables_venta);
    const totalArriendo = validarNumero(data.total_comparables_arriendo);
    const portales = data.portales_consultados || [];

    const codigoAvaluo = formData.codigo_avaluo || data.codigo_avaluo;

    // Calcular confianza una sola vez para asegurar consistencia
    const confianzaInfo = construirTextoConfianza(data, totalEncontrados, totalComparables);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-3">
                    {hasAvaluos && codigoAvaluo && (
                        <Badge variant="outline" className="bg-[#C9C19D]/10 text-[#2C3D37] border-[#C9C19D] px-4 py-2 text-sm font-semibold">
                            {codigoAvaluo}
                        </Badge>
                    )}
                    {hasAvaluos && (
                        <button
                            onClick={() => navigate('/mis-avaluos')}
                            className="text-[#7A8C85] hover:text-[#2C3D37] transition-colors flex items-center gap-1.5 font-medium"
                        >
                            <FileText className="w-4 h-4" />
                            Mis Avalúos
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-6">
                    <button
                        onClick={() => pdfButtonRef.current?.click()}
                        className="text-[#7A8C85] hover:text-[#2C3D37] transition-colors flex items-center gap-1.5 font-medium"
                    >
                        <Download className="w-4 h-4" />
                        Descargar PDF
                    </button>
                    {onReset && (
                        <button
                            onClick={onReset}
                            className="text-[#7A8C85] hover:text-[#2C3D37] transition-colors flex items-center gap-1.5 font-medium"
                        >
                            <ArrowRight className="w-4 h-4" />
                            Nuevo Avalúo
                        </button>
                    )}
                    {formData.id && (
                        <button
                            onClick={handleShareLink}
                            className="text-[#7A8C85] hover:text-[#2C3D37] transition-colors flex items-center gap-1.5 font-medium"
                        >
                            {linkCopied ? (
                                <>
                                    <Check className="w-4 h-4 text-green-600" />
                                    <span className="text-green-600">¡Copiado!</span>
                                </>
                            ) : (
                                <>
                                    <Share2 className="w-4 h-4" />
                                    Compartir
                                </>
                            )}
                        </button>
                    )}
                    <button
                        onClick={handleAction}
                        disabled={!valorPrincipal || sendEmailMutation.isPending}
                        className="text-[#7A8C85] hover:text-[#2C3D37] transition-colors flex items-center gap-1.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Mail className="w-4 h-4" />
                        Enviar al Correo
                    </button>
                </div>
            </div>

            <Card className="border-none shadow-lg bg-gradient-to-br from-[#2C3D37] to-[#1a2620] text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-[#C9C19D] opacity-10 rounded-full blur-2xl"></div>
                <CardHeader className="pb-1 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl md:text-2xl font-outfit font-semibold flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-lg"><Home className="w-6 h-6 text-[#C9C19D]" /></div>
                                Valor Comercial Estimado
                            </CardTitle>
                            <p className="text-sm text-[#D3DDD6] mt-0 font-raleway max-w-lg">
                                {esLote
                                    ? 'Valor obtenido a partir del análisis de mercado y método residual, sin aplicar enfoque de rentabilidad.'
                                    : 'Determinación del valor comercial basada en un análisis técnico ponderado que integra el comportamiento real del mercado local y la validación experta de nuestra inteligencia artificial.'}
                            </p>
                        </div>
                        <span className="inline-flex self-start md:self-center items-center rounded-full bg-[#C9C19D]/90 px-4 py-1.5 text-xs md:text-sm font-semibold text-[#1a2620] shadow-sm">
                            <TrendingUp className="w-3 h-3 mr-2" />
                            Estimación IA
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="pt-2 relative z-10">
                    <div className="flex flex-col lg:flex-row items-end lg:items-center justify-between gap-8">
                        <div>
                            <div className="text-4xl md:text-6xl font-bold font-outfit tracking-tight">
                                {formatCurrency(valorPrincipal)}
                            </div>
                            <p className="text-xs md:text-sm text-[#D3DDD6] mt-2 opacity-80">COP (Pesos Colombianos)</p>

                            <div className="flex flex-wrap gap-2 mt-4">
                                {esLote ? (
                                    <>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                                            📐 {formatNumber(areaInmueble)} m²
                                        </span>
                                        {usoLote && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                                                🏗️ {toTitleCase(usoLote)}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                                            📍 {toTitleCase(formData.municipio || formData.ciudad || '—')}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        {formData.tipo_inmueble && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                                                🏠 {toTitleCase(formData.tipo_inmueble)}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                                            📐 {formatNumber(areaInmueble)} m²
                                        </span>
                                        {(formData.habitaciones || data.habitaciones) && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                                                🛏️ {formData.habitaciones || data.habitaciones} hab
                                            </span>
                                        )}
                                        {(formData.banos || data.banos) && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                                                🚿 {formData.banos || data.banos} baños
                                            </span>
                                        )}
                                        {(formData.estado_inmueble || formData.estado || data.estado_inmueble || data.estado) && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                                                ✨ {mapearEstadoSinPrecio(formData.estado_inmueble || formData.estado || data.estado_inmueble || data.estado)}
                                            </span>
                                        )}
                                        {(formData.estrato || data.estrato) && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                                                📊 Estrato {formData.estrato || data.estrato}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="bg-[#FFFFFF]/10 backdrop-blur-sm border border-[#FFFFFF]/10 rounded-xl p-4 w-full lg:w-auto min-w-[320px] space-y-3">
                            <div className="flex justify-between items-start border-b border-white/10 pb-2">
                                <span className="text-[#D3DDD6] text-sm self-center">Rango Sugerido</span>
                                <div className="text-right">
                                    <div className="font-semibold font-outfit text-white text-sm">{rangoMin ? formatCurrency(rangoMin) : '—'}</div>
                                    <div className="font-semibold font-outfit text-white text-sm">{rangoMax ? formatCurrency(rangoMax) : '—'}</div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <span className="text-[#D3DDD6] text-sm">Precio m² Sugerido</span>
                                <span className="font-semibold font-outfit text-white text-sm whitespace-nowrap">{formatCurrency(precioM2Usado)}/m²</span>
                            </div>
                            {!esLote && data.yield_mensual_mercado && rangoMin && rangoMax && (
                                <div className="flex justify-between items-start border-b border-white/10 pb-2">
                                    <span className="text-[#D3DDD6] text-sm self-center">Rango Arriendo Sug.</span>
                                    <div className="text-right">
                                        <div className="font-semibold font-outfit text-white text-sm whitespace-nowrap">
                                            {formatCurrency(Math.round(rangoMin * data.yield_mensual_mercado))}/mes
                                        </div>
                                        <div className="font-semibold font-outfit text-white text-sm whitespace-nowrap">
                                            {formatCurrency(Math.round(rangoMax * data.yield_mensual_mercado))}/mes
                                        </div>
                                    </div>
                                </div>
                            )}
                            {totalComparables !== null && (
                                <div className="flex justify-between items-center">
                                    <span className="text-[#D3DDD6] text-sm">Muestra</span>
                                    <div className="text-right">
                                        <span className="font-semibold text-sm block">{totalComparables} inmuebles</span>
                                        {totalEncontrados && totalEncontrados > totalComparables ? (
                                            <span className="text-[10px] text-[#A3B2AA] block">(de {totalEncontrados} encontrados)</span>
                                        ) : (
                                            <span className="text-[10px] text-[#A3B2AA] block">({totalVenta || 0} venta, {totalArriendo || 0} arriendo)</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
                <div className="px-6 pb-6 relative z-10">
                    <p className="text-xs text-[#D3DDD6]/80 italic leading-relaxed">
                        El valor final es una recomendación técnica ponderada entre el enfoque de mercado y el de rentabilidad,
                        priorizando el método con datos más consistentes según la cantidad, homogeneidad y dispersión de los
                        comparables disponibles.
                    </p>
                </div>
            </Card>

            {/* SECCIÓN DE COSTOS DE VENTA (NUEVA - Movida después del Hero) */}
            {costosVenta && (
                <div
                    className="animate-in fade-in slide-in-from-top-4 duration-500"
                >
                    <Card
                        className={`border-[#C9C19D] overflow-hidden shadow-sm transition-all duration-300 hover:bg-[#F0F2F1] bg-[#F8F6EF] cursor-pointer`}
                        onClick={() => setMostrarCostos(!mostrarCostos)}
                    >
                        <CardHeader className={`${mostrarCostos ? 'bg-[#F0F2F1]' : 'bg-transparent'} border-b border-[#E0E5E2] py-3`}>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-base text-[#2C3D37] flex items-center gap-2 font-outfit">
                                    <DollarSign className="w-4 h-4 text-[#C9C19D]" />
                                    {mostrarCostos
                                        ? "¿Cuánto recibes al vender?"
                                        : "¿Cuánto recibes al vender? (Ver Costos)"
                                    }
                                </CardTitle>
                                {mostrarCostos ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMostrarCostos(false);
                                        }}
                                        className="text-[#7A8C85] hover:text-[#2C3D37] h-8 px-2"
                                    >
                                        <ChevronUp className="w-4 h-4 ml-1" /> Ocultar
                                    </Button>
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-[#7A8C85] mr-2" />
                                )}
                            </div>
                        </CardHeader>
                        {mostrarCostos && (
                            <CardContent className="pt-6 pb-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* VENDEDOR */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-4 border-b border-[#C9C19D]/30 pb-2">
                                            <div className="p-1.5 bg-[#8C9A90] rounded-md text-white">
                                                <span className="text-xs font-bold">VENDEDOR</span>
                                            </div>
                                            <span className="text-sm font-medium text-[#4F5B55]">Gastos de venta</span>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between text-[#4F5B55]">
                                                <span>Retención en la fuente (1%):</span>
                                                <span className="font-medium">{formatCurrency(costosVenta.seller.retencion)}</span>
                                            </div>
                                            <div className="flex justify-between text-[#4F5B55]">
                                                <span>Gastos Notariales (~0.27%):</span>
                                                <span className="font-medium">{formatCurrency(costosVenta.seller.notariales)}</span>
                                            </div>
                                            <div className="flex justify-between text-[#4F5B55]">
                                                <span>Comisión (3% + IVA):</span>
                                                <span className="font-medium">{formatCurrency(costosVenta.seller.comision)}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-[#C9C19D]/50">
                                            <div className="flex justify-between items-end">
                                                <span className="text-sm font-semibold text-[#2C3D37]">Neto estimado a recibir:</span>
                                                <span className="text-xl font-bold text-[#2C3D37] font-outfit">
                                                    {formatCurrency(costosVenta.seller.netoRecibir)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* COMPRADOR */}
                                    <div className="space-y-4 relative">
                                        {/* Separador vertical en desktop */}
                                        <div className="hidden md:block absolute left-0 top-0 bottom-0 w-px bg-[#E0E5E2] -ml-4"></div>

                                        <div className="flex items-center gap-2 mb-4 border-b border-[#C9C19D]/30 pb-2">
                                            <div className="p-1.5 bg-[#2C3D37] rounded-md text-white">
                                                <span className="text-xs font-bold">COMPRADOR</span>
                                            </div>
                                            <span className="text-sm font-medium text-[#4F5B55]">Gastos de compra</span>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between text-[#4F5B55]">
                                                <span>Beneficencia + Registro (~1.67%):</span>
                                                <span className="font-medium">{formatCurrency(costosVenta.buyer.registro)}</span>
                                            </div>
                                            <div className="flex justify-between text-[#4F5B55]">
                                                <span>Gastos Notariales (~0.27%):</span>
                                                <span className="font-medium">{formatCurrency(costosVenta.buyer.notariales)}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-[#C9C19D]/50">
                                            <div className="flex justify-between items-end">
                                                <span className="text-sm font-semibold text-[#2C3D37]">Total gastos adicionales:</span>
                                                <span className="text-lg font-bold text-[#4F5B55] font-outfit">
                                                    {formatCurrency(costosVenta.buyer.totalGastos)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Otros gastos y Disclaimer */}
                                <div className="mt-6 pt-4 border-t border-dashed border-[#E0E5E2] w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                    <div className="text-[10px] text-[#4F5B55] text-left leading-relaxed">
                                        <p className="font-semibold mb-1 uppercase tracking-wider text-[#2C4A3E]">Otros gastos que podrían aplicar (no incluidos):</p>
                                        <p>
                                            Impuesto de ganancia ocasional (15% al 39%) | Estudio de títulos (0.12%) | Avalúo bancario (0.1%) | Cancelación de hipoteca (~0.5%) | Certificados adicionales (~$120.000)
                                        </p>
                                    </div>

                                    <div className="text-[10px] text-[#7A8C85] italic text-left md:text-right leading-tight flex items-center">
                                        <p>
                                            * Los valores mostrados son <strong>estimaciones orientativas</strong> basadas en prácticas habituales del mercado colombiano.
                                            La Retención en la Fuente es del 1% (Art. 398 E.T.). Los gastos de registro y notariales son aproximados y pueden variar según el municipio y la notaría.
                                            No constituye asesoría legal, notarial ni tributaria.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div>
            )}

            <div className={valorRentabilidad ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "flex justify-center"}>
                <Card className="border-[#e6e0c7] shadow-sm hover:shadow-md transition-shadow duration-200 w-full max-w-lg bg-[#F8F6EF]">
                    <CardHeader className="pb-3 bg-[#F8F6EF] border-b border-[#e6e0c7]">
                        <CardTitle className="text-base text-[#2C3D37] flex items-center gap-2 font-outfit">
                            <TrendingUp className="w-4 h-4 text-[#C9C19D]" />
                            {esLote ? 'Valor Estimado por Mercado' : 'Enfoque de Mercado (Comparables)'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4 bg-[#F8F6EF]">
                        <div className="text-center mb-[36px]">
                            <div className="text-3xl font-bold text-[#2C3D37] mt-1 font-outfit">
                                {formatCurrency(valorVentaDirecta)}
                            </div>
                        </div>
                        <div className="min-h-[80px] flex flex-col justify-center">
                            <p
                                className="text-sm text-[#4F5B55] text-center px-4 mt-1 border-b border-dashed border-[#E0E5E2] pb-3 mb-[20px]"
                                dangerouslySetInnerHTML={{
                                    __html: esLote
                                        ? (areaInmueble && areaInmueble > 0 && formData.area_construida && formData.area_construida > 0
                                            ? 'Valor del terreno calculado por <strong>método comparativo de mercado</strong>, más valoración independiente de las construcciones existentes según su área, estado y uso.'
                                            : 'Calculado a partir de la <strong>mediana de precio por m²</strong> de lotes comparables en la zona, ajustado por ubicación, topografía y servicios disponibles.')
                                        : 'Calculado a partir de la <strong>mediana de precio por m²</strong> de las propiedades comparables<br>(mediana de precio por m² × área del inmueble).'
                                }}
                            />
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-sm text-[#7A8C85]">Precio m² estimado:</span>
                            <span className="text-sm font-semibold text-[#2C3D37]">
                                {areaInmueble && valorVentaDirecta ? `${formatCurrency(valorVentaDirecta / areaInmueble)}/m²` : '—'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {valorRentabilidad && (
                    <Card className="border-[#e6e0c7] shadow-sm hover:shadow-md transition-shadow duration-200 bg-[#F8F6EF]">
                        <CardHeader className="pb-3 bg-[#F8F6EF] border-b border-[#e6e0c7]">
                            <CardTitle className="text-base text-[#2C3D37] flex items-center gap-2 font-outfit">
                                <Calculator className="w-4 h-4 text-[#C9C19D]" />
                                Enfoque de Rentabilidad (Capitalización)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4 bg-[#F8F6EF]">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-[#2C3D37] mt-1 font-outfit">
                                    {formatCurrency(valorRentabilidad)}
                                </div>
                            </div>
                            <div className="min-h-[80px] flex flex-col justify-center">
                                <p
                                    className="text-sm text-[#4F5B55] text-center px-4 mt-1 border-b border-dashed border-[#E0E5E2] pb-3"
                                    dangerouslySetInnerHTML={{
                                        __html: 'Calculado a partir del <strong>canon mensual</strong> y la fórmula del rendimiento (yield) del sector<br>(canon mensual estimado ÷ yield mensual).'
                                    }}
                                />
                                {data.yield_mensual_mercado && (
                                    <p
                                        className="text-xs text-[#7A8C85] italic px-4 mt-2 text-center"
                                        dangerouslySetInnerHTML={{
                                            __html: `<strong>El yield utilizado (${(data.yield_mensual_mercado * 100).toFixed(2)}% mensual)</strong> (promedio observado en arriendos residenciales del sector, ajustado por valor del sector)`
                                        }}
                                    />
                                )}
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-sm text-[#7A8C85]">Canon mensual estimado:</span>
                                <span className="text-sm font-semibold text-[#2C3D37]">
                                    {data.canon_estimado ? formatCurrency(data.canon_estimado) : '—'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>


            {/* Nota Disclaimer - Avalúo no certificado */}
            <Alert className="border-amber-200 bg-[#FFF8E1] text-amber-900">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 text-sm">
                    <strong>Nota importante:</strong> {NOTA_DISCLAIMER}
                </AlertDescription>
            </Alert>

            {/* Nivel de Confianza y Resumen - Lado a lado */}
            <div className="space-y-8">
                {/* Resumen de Comparables - AHORA PRIMERO */}
                <Alert className="border-[#E0E5E2] bg-[#EFF2F1]">
                    <TrendingUp className="h-4 w-4 text-[#2C3D37]" />
                    <AlertDescription className="space-y-3">
                        <strong className="text-base text-[#2C3D37]">Resumen de Avalúo</strong>

                        {tieneResumen ? (
                            <p
                                className="text-sm text-[#4F5B55] leading-relaxed text-justify"
                                dangerouslySetInnerHTML={{
                                    __html: data.resumen_busqueda
                                        .replace(/``([^`]+)``/g, '$1')
                                        .replace(/`([^`]+)`/g, '$1')
                                        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                                }}
                            />
                        ) : (
                            <p className="text-sm text-[#7A8C85] italic">
                                No hay un resumen de búsqueda disponible.
                            </p>
                        )}

                        {tieneComparables && (
                            <div className="flex justify-center mt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setMostrarComparables(!mostrarComparables)}
                                    className="text-[#2C3D37] border-[#B0BDB4] hover:bg-[#F0F2F1] text-sm"
                                >
                                    {mostrarComparables ? (
                                        <>
                                            <ChevronUp className="w-4 h-4 mr-2" /> Ocultar Comparables
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-4 h-4 mr-2" /> Ver Comparables Utilizados
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </AlertDescription>
                </Alert>

                {/* Tabla de Comparables - Aparece justo después de Resumen */}
                {mostrarComparables && tieneComparables && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <TablaComparables comparables={data.comparables} esLote={esLote} areaInmueble={areaInmueble} />
                    </div>
                )}

                {/* Nivel de Confianza - AHORA SEGUNDO */}
                <div>
                    {(() => {
                        const nivel = confianzaInfo.nivel;

                        let alertVariant = "default";
                        let alertClass = "";
                        let barColor = "bg-gray-300";
                        let percentage = 20;

                        if (nivel === 'ALTO') {
                            alertClass = "border-green-200 bg-green-50";
                            barColor = "bg-green-500";
                            percentage = 90;
                        } else if (nivel === 'MEDIO') {
                            alertClass = "border-blue-200 bg-blue-50";
                            barColor = "bg-blue-500";
                            percentage = 60;
                        } else {
                            alertClass = "border-orange-200 bg-orange-50";
                            barColor = "bg-orange-500";
                            percentage = 30;
                        }

                        return (
                            <Alert className={alertClass}>
                                <Info className="h-4 w-4" />
                                <AlertDescription className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <strong className="text-base">Solidez del Análisis: {confianzaInfo.label}</strong>
                                        <span className="text-xs font-medium text-[#7A8C85]">{percentage}%</span>
                                    </div>

                                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                        <div className={`h-full ${barColor} rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        {confianzaInfo.razones.map((razon, idx) => (
                                            <div key={idx} className="flex gap-2 items-start">
                                                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${barColor}`} />
                                                <p className="leading-relaxed">{razon}</p>
                                            </div>
                                        ))}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        );
                    })()}
                </div>

                {/* Aviso de Dispersión (Mercado Heterogéneo) */}
                {data.nivel_confianza_detalle?.dispersion_nivel && data.nivel_confianza_detalle.dispersion_nivel !== 'bajo' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                        {(() => {
                            const nivel = data.nivel_confianza_detalle.dispersion_nivel;
                            let bgColor = "bg-green-50 border-green-200 text-green-900";
                            let iconColor = "text-green-600";
                            let label = "Dispersión media";
                            let icon = <CheckCircle2 className={`h-4 w-4 ${iconColor}`} />;

                            if (nivel === 'muy_alto') {
                                bgColor = "bg-red-50 border-red-200 text-red-900";
                                iconColor = "text-red-600";
                                label = "Dispersión muy alta";
                                icon = <AlertCircle className={`h-4 w-4 ${iconColor}`} />;
                            } else if (nivel === 'alto') {
                                bgColor = "bg-amber-50 border-amber-200 text-amber-900";
                                iconColor = "text-amber-600";
                                label = "Dispersión alta";
                                icon = <AlertTriangle className={`h-4 w-4 ${iconColor}`} />;
                            } else if (nivel === 'medio') {
                                bgColor = "bg-blue-50 border-blue-200 text-blue-900";
                                iconColor = "text-blue-600";
                                label = "Dispersión media";
                                icon = <Info className={`h-4 w-4 ${iconColor}`} />;
                            }

                            return (
                                <Alert className={`${bgColor} border`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        {icon}
                                        <strong className="text-sm">{label}</strong>
                                    </div>
                                    <AlertDescription className="text-xs leading-relaxed opacity-90">
                                        {data.nivel_confianza_detalle.dispersion_narrativa}
                                    </AlertDescription>
                                </Alert>
                            );
                        })()}
                    </div>
                )}
            </div>


            <Card className="border-[#E0E5E2] shadow-sm bg-white overflow-hidden">
                <CardHeader className="py-4 bg-[#2C3D37] border-b border-[#1a2620]">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg text-white flex items-center gap-2 font-outfit">
                            <FileText className="w-5 h-5 text-[#C9C19D]" />
                            Análisis detallado
                        </CardTitle>
                        <div className="hidden md:flex items-center">
                            <BotonPDF
                                formData={formData}
                                confianzaInfo={confianzaInfo}
                                variant="ghost"
                                label=""
                                className="bg-transparent text-[#C9C19D] hover:text-[#E8E4D0] hover:bg-black/30 text-sm font-medium rounded-full px-4 py-2"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-8 px-6 md:px-10">
                    {tieneAnalisisCompleto ? (
                        <AnalisisAI text={data.perplexity_full_text} />
                    ) : (
                        <div className="text-center py-10 text-[#7A8C85]">
                            <p>No se ha generado un análisis detallado para este avalúo.</p>
                        </div>
                    )}
                </CardContent>
            </Card>


            {/* Botones de acción: Editar, Guardar, Nuevo */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 pb-6">

                {/* 1. Volver: Editar Datos */}
                <Button
                    onClick={onBack}
                    variant="outline"
                    className="border-[#B0BDB4] text-[#4F5B55] hover:text-[#2C3D37] hover:bg-[#F5F7F6] px-8 py-6 rounded-full text-base w-full sm:w-auto order-1"
                >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Volver
                </Button>

                {/* 2. Nuevo Avalúo */}
                {onReset && (
                    <Button
                        onClick={onReset}
                        className="bg-[#E8E4D0] hover:bg-[#DDD8C4] text-[#2C3D37] rounded-full px-8 py-6 text-lg font-medium w-full sm:w-auto order-2 shadow-lg hover:shadow-xl transition-all"
                    >
                        <RefreshCw className="mr-2 w-5 h-5" />
                        Nuevo Avalúo
                    </Button>
                )}

                {/* 3. Descargar PDF */}
                <div className="w-full sm:w-auto order-3">
                    <BotonPDF ref={pdfButtonRef} label="Descargar PDF" formData={formData} confianzaInfo={confianzaInfo} className="w-full sm:w-auto px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all bg-[#E8E4D0] hover:bg-[#DDD8C4] text-[#2C3D37]" />
                </div>

                {/* 4. Continuar / Guardar / Enviar (Principal) */}
                <Button
                    onClick={handleAction}
                    className="bg-[#2C3D37] text-white hover:bg-[#1a2620] px-10 py-6 rounded-full text-lg shadow-lg hover:shadow-xl transition-all w-full sm:w-auto order-4"
                >
                    {actionButtonIconPosition === "left" && <ActionButtonIcon className="mr-2 w-5 h-5" />}
                    {actionButtonLabel}
                    {actionButtonIconPosition === "right" && <ActionButtonIcon className="ml-2 w-5 h-5" />}
                </Button>
            </div>

            {/* Modal de Feedback (Email Alert) */}
            <AlertDialog open={feedbackModal.open} onOpenChange={(open) => !open && setFeedbackModal(prev => ({ ...prev, open: false }))}>
                <AlertDialogContent className="bg-white border-[#E0E5E2]">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            {feedbackModal.type === 'success' ? (
                                <div className="bg-green-100 p-2 rounded-full">
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                </div>
                            ) : (
                                <div className="bg-red-100 p-2 rounded-full">
                                    <XCircle className="w-6 h-6 text-red-600" />
                                </div>
                            )}
                            <AlertDialogTitle className="text-[#2C3D37] text-xl">{feedbackModal.title}</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-[#4F5B55] text-base">
                            {feedbackModal.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={() => setFeedbackModal(prev => ({ ...prev, open: false }))}
                            className={`border-none ${feedbackModal.type === 'success' ? 'bg-[#2C3D37] hover:bg-[#1a2620]' : 'bg-red-600 hover:bg-red-700'} text-white`}
                        >
                            Aceptar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Floating Share Button */}
            {formData.id && (
                <button
                    onClick={handleShareLink}
                    className="fixed bottom-6 right-6 z-50 bg-[#2C3D37] hover:bg-[#1a2620] text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
                    title="Compartir avalúo"
                >
                    {linkCopied ? (
                        <Check className="w-6 h-6" />
                    ) : (
                        <Share2 className="w-6 h-6" />
                    )}
                    {linkCopied && (
                        <span className="absolute -top-10 right-0 bg-green-600 text-white px-3 py-1 rounded-full text-sm whitespace-nowrap shadow-md">
                            ¡Enlace copiado!
                        </span>
                    )}
                </button>
            )}
        </div >
    );
}
