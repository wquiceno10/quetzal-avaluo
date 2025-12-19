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
    RefreshCw
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

    let cleanText = text
        .replace(/^-{3,}\s*$/gm, '')
        // INJECT DEFAULT NOTES IF MISSING (Fallback)
        // INJECT DEFAULT NOTES IF MISSING (Fallback)
        .replace(/(fuente_validacion:\s*(?:coincidencia|zona_extendida|zona_similar))(?!\s*[\r\n]+\s*(?:(?:\*+)?NOTA:(?:\*+)?|(?:\*+)?Nota:(?:\*+)?|\*(?!\s)))/gi, (match, prefix) => {
            let note = "";
            let p = prefix.toLowerCase();
            if (p.includes("zona_extendida")) note = "Similitud socioeconómica en otra zona.";
            else if (p.includes("coincidencia")) note = "Anuncio de listado en la misma zona.";
            else if (p.includes("zona_similar")) note = "Ubicación cercana con mercado comparable.";

            return `${prefix}\n**NOTA:** ${note}`;
        })
        // LaTeX spacing commands
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
        // 1. URLs Markdown: **[Portal](URL)** o [Portal](URL) -> <a href...>
        .replace(/(?:\*\*)?\[([^\]]+)\]\(([^)]+)\)(?:\*\*)?/g, (match, text, url) => {
            return `<strong><a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#2C3D37] hover:text-[#C9C19D] hover:underline font-bold" style="color: #2C3D37;">${text}</a></strong>`;
        })
        // Limpiar símbolos extraños y SEPARADORES antes de etiquetas (═══, --)
        .replace(/[═]+/g, '')
        .replace(/\s+--\s+/g, ' ')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[\d+\]/g, '');

    cleanText = cleanText
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    cleanText = cleanText.replace(/(\d+(?:[.,]\d+)?)\s*[×x]\s*10\^(\d+)/gi, (match, coefficient, exponent) => {
        const num = parseFloat(coefficient.replace(',', '.'));
        const power = parseInt(exponent);
        const result = num * Math.pow(10, power);
        return Math.round(result).toLocaleString('es-CO');
    });

    const getBadgeHtml = (validation, includeNote = false) => {
        const val = validation.trim().toLowerCase();
        let badgeClass = '';
        let badgeText = validation.trim();
        let note = '';

        if (val === 'coincidencia') {
            badgeClass = 'bg-green-100 text-green-700 border-green-300';
            badgeText = '✓ Coincidencia';
            if (includeNote) note = '<span style="display:block; font-size:11px; color:#6B7280; font-style:italic; margin-top:2px;">Ubicación exacta validada.</span>';
        } else if (val === 'verificado') {
            badgeClass = 'bg-emerald-100 text-emerald-700 border-emerald-300';
            badgeText = '✓ Verificado'; // Keep legacy variable, update badge text
            if (includeNote) note = '<span style="display:block; font-size:11px; color:#6B7280; font-style:italic; margin-top:2px;">Enlace verificado y activo.</span>';
        } else if (val === 'zona_similar') {
            badgeClass = 'bg-blue-100 text-blue-700 border-blue-300';
            badgeText = '→ Zona Similar';
        } else if (val === 'zona_extendida') {
            badgeClass = 'bg-orange-100 text-orange-700 border-orange-300';
            badgeText = '≈ Zona Extendida';
        } else {
            badgeClass = 'bg-gray-100 text-gray-600 border-gray-300';
        }

        const badge = `<span class="inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${badgeClass} align-middle ml-1">${badgeText}</span>`;
        return note ? `${badge}${note}` : badge;
    };

    cleanText = cleanText
        .replace(/&lt;strong&gt;/g, '<strong>')
        .replace(/&lt;\/strong&gt;/g, '</strong>');

    cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const keyPhrasePatterns = [
        /\b(Promedio de precios de venta de \d+ comparables):/gi,
        /\b(Precio por m² promedio):/gi,
        /\b(Precio\/m² ajustado):/gi,
        /\b(Canon mensual estimado):/gi,
        /\b(Yield promedio mercado):/gi,
        /\b(Valor total):/gi,
        /\b(Valor estimado):/gi,
        /\b(Factor total):/gi,
        /^(Justificación):/gim,
        /^(Porcentaje aplicado):/gim,
        /\b(Ajuste por antigüedad):/gi,
        /\b(Ajuste por estado):/gi,
        /\b(Ajuste por ubicación):/gi,
        /\b(Ajuste por reformas):/gi,
        /\b(PASO \d+):/gi,
        /\b(Valor Recomendado de Venta):/gi,
        /\b(Rango sugerido):/gi,
        /\b(Precio m² final):/gi,
    ];

    keyPhrasePatterns.forEach(pattern => {
        cleanText = cleanText.replace(pattern, (match, group1) => {
            if (cleanText.includes(`<strong>${group1}</strong>`)) return match;
            return `<strong>${group1}</strong>:`;
        });
    });

    // PROCESAR BADGES - MÚLTIPLES FORMATOS
    // 1. Formato con fuente_validacion: prefijo
    cleanText = cleanText.replace(/(<\/strong>|<\/a>)\s*fuente_validacion:\s*([^\r\n<]+)/gi, (match, tagEnd, validation) => {
        return `${tagEnd} ${getBadgeHtml(validation.trim(), true)}`;
    });

    // 2. Formato legacy: fuente_validacion: al inicio de línea
    cleanText = cleanText.replace(/^fuente_validacion:\s*([^\r\n<]+)/gim, (match, validation) => {
        return getBadgeHtml(validation.trim(), true);
    });

    // 3. CRÍTICO: Etiquetas sueltas (sin fuente_validacion:) 
    // FIX: EVITAR DUPLICADOS SI ESTÁ ENTRE PARÉNTESIS (ej. "(zona_similar, ...)")
    // Usamos una función de reemplazo que verifica el contexto
    cleanText = cleanText.replace(/(\()?\b(coincidencia|verificado|zona_extendida|zona_similar)\b/gi, (match, parenthesis, tag) => {
        // Si hay un paréntesis antes, NO convertir (retorna el match original)
        if (parenthesis) return match;
        return getBadgeHtml(tag.trim(), false);
    });



    cleanText = cleanText.replace(/(?:<strong>)?(?:\*)?Nota:(?:\*)?(?:<\/strong>)?\s*([^\n]+)/gi, (match, noteText) => {
        let formattedNote = noteText.trim().replace(/\*+$/, '');
        const pattern1 = /(.+?)\s+está\s+a\s+(\d+)\s*km\s+de\s+[^,]+,?\s*(.+)/i;
        const match1 = formattedNote.match(pattern1);

        if (match1) {
            const distance = match1[2];
            let characteristics = match1[3];
            characteristics = characteristics
                .replace(/^con\s+/i, 'tiene ')
                .replace(/^condiciones\s+/i, 'tiene condiciones ');
            formattedNote = `A ${distance} km de distancia, ${characteristics}`;
        }
        return `<span style="display:block; font-size:11px; color:#6B7280; font-style:italic; margin-top:4px; line-height:1.3; text-align:left;"><strong>NOTA:</strong> ${formattedNote}</span>`;
    }).replace(/(?:^|\n)\s*\*([^*]{10,})\*\s*(?:\n|$)/g, (match, noteText) => {
        let formattedNote = noteText.trim();
        const pattern1 = /(.+?)\s+está\s+a\s+(\d+)\s*km\s+de\s+[^,]+,?\s*(.+)/i;
        const match1 = formattedNote.match(pattern1);
        if (match1) {
            const distance = match1[2];
            let characteristics = match1[3];
            characteristics = characteristics.replace(/^con\s+/i, 'tiene ').replace(/^condiciones\s+/i, 'tiene condiciones ');
            formattedNote = `A ${distance} km de distancia, ${characteristics}`;
        }
        return `<span style="display:block; font-size:11px; color:#6B7280; font-style:italic; margin-top:4px; line-height:1.3; text-align:left;"><strong>NOTA:</strong> ${formattedNote}</span>`;
    });

    cleanText = cleanText.replace(/\s*-{3,}\s*/g, '\n\n');
    // Solo convertir en título si hay texto después del número (ej: "3. Título" o "3.3. Título")
    // NO convertir números sueltos sin texto descriptivo
    cleanText = cleanText.replace(/(?:^|\n)[ \t]*\**(\d+(?:\.\d+)?\.?\s+[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑA-Za-z ]{5,100}[:]??)\**/g, '\n\n# $1\n');
    cleanText = cleanText.replace(/\\\[/g, '\n\n').replace(/\\\]/g, '\n\n');
    cleanText = cleanText.replace(/([^\n])\n(\|)/g, '$1\n\n$2');

    // GENÉRICO: Detectar títulos en negrita que no estén en su propia línea y forzar salto
    // Busca: Texto previo + espacio + **Texto en Mayúscula...**
    const titleRegex = /([^\n])\s+(\*\*[A-ZÁÉÍÓÚÑ].+?\*\*)/g;
    cleanText = cleanText.replace(titleRegex, '$1\n\n- $2');

    // Asegurar que si ya está en nueva línea, tenga guión (si parece un título de comparable)
    cleanText = cleanText.replace(/\n(\*\*[A-ZÁÉÍÓÚÑ].+?\*\*)/g, '\n- $1');

    // CRÍTICO: Unificar tablas rotas.
    // Iteramos para asegurar que se unan todas las filas consecutivas separadas por saltos de línea excesivos.
    // Patrón: Una línea que empieza con | (ignorando whitespace), salto(s) de línea, otra línea que empieza con |
    let previousText = cleanText;
    do {
        previousText = cleanText;
        cleanText = cleanText.replace(/(^\s*\|[^\n]*)\n{2,}(\s*\|)/gm, '$1\n$2');
    } while (cleanText !== previousText);

    const blocks = cleanText.split('\n\n');

    return (
        <div className="text-[#4F5B55] font-raleway md:columns-2 gap-10 space-y-4">
            {blocks.map((block, index) => {
                const trimmed = block.trim();
                if (!trimmed) return null;

                if (trimmed.startsWith('#')) {
                    const lines = trimmed.split('\n');
                    const headerLine = lines[0];
                    const remainingText = lines.slice(1).join('\n').trim();
                    const title = toTitleCase(headerLine.replace(/^#+\s*/, ''));

                    return (
                        <React.Fragment key={index}>
                            <h3 className="font-outfit font-medium text-lg text-[#2C3D37] mt-6 first:mt-0 mb-3 border-b border-[#C9C19D]/50 pb-1 break-inside-avoid">
                                {title}
                            </h3>
                            {remainingText && (
                                <p className="mb-4 text-sm leading-relaxed text-justify break-inside-avoid text-[#4F5B55]" dangerouslySetInnerHTML={{ __html: remainingText.replace(/\n/g, '<br>') }} />
                            )}
                        </React.Fragment>
                    );
                }

                if (trimmed.startsWith('|')) {
                    return <MarkdownTable key={index} content={trimmed} />;
                }

                if (trimmed.match(/^[-*•]\s/) || (trimmed.match(/^\d+[\.\)]\s/) && !trimmed.match(/^\d+\.\d+/))) {
                    const lines = trimmed.split('\n');
                    const items = [];
                    let currentItem = '';

                    for (const line of lines) {
                        if ((line.match(/^[-*•]\s/) || line.match(/^\d+[\.\)]\s/)) && !line.match(/^\d+\.\d+/)) {
                            if (currentItem) items.push(currentItem);
                            currentItem = line.replace(/^(?:[-*•]|\d+[\.\)])\s*/, '');
                        } else if (line.trim()) {
                            currentItem += '\n' + line;
                        }
                    }
                    if (currentItem) items.push(currentItem);

                    return (
                        <ul key={index} className="list-none space-y-2 mb-4 break-inside-avoid">
                            {items.map((item, i) => (
                                <li key={i} className="flex gap-2 text-sm leading-relaxed text-[#4F5B55]">
                                    <span className="font-bold mt-0.5">•</span>
                                    <span dangerouslySetInnerHTML={{ __html: item.replace(/\n/g, '<br>') }} />
                                </li>
                            ))}
                        </ul>
                    );
                }

                const paragraphHtml = trimmed.replace(/\n/g, '<br>');
                return (
                    <p key={index} className="mb-4 text-sm leading-relaxed text-justify break-inside-avoid text-[#4F5B55]" dangerouslySetInnerHTML={{ __html: paragraphHtml }} />
                );
            })}
        </div>
    );
};

export default function Step3Results({ formData, onUpdate, onNext, onBack, onReset, autoDownloadPDF, onEmailSent, actionButtonLabel = "Continuar / Guardar Avalúo", ActionButtonIcon = ArrowRight, actionButtonIconPosition = "right" }) {
    const [mostrarComparables, setMostrarComparables] = useState(false);
    const [hasAvaluos, setHasAvaluos] = useState(false);
    const [feedbackModal, setFeedbackModal] = useState({ open: false, title: '', description: '', type: 'success' }); // Nuevo state para feedback
    const pdfButtonRef = useRef(null);
    const navigate = useNavigate();

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

            const response = await fetch(`${import.meta.env.VITE_WORKER_EMAIL_URL}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: formData.email || formData.contacto_email, // Priorizar datos guardados en BD
                    subject: `Reporte de Avalúo: ${data.tipo_inmueble} en ${data.barrio}`,
                    htmlBody: emailHtml
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al enviar el correo');
            }
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
                        <div className="bg-[#FFFFFF]/10 backdrop-blur-sm border border-[#FFFFFF]/10 rounded-xl p-4 w-full lg:w-auto min-w-[280px] space-y-3">
                            <div className="flex justify-between items-start border-b border-white/10 pb-2">
                                <span className="text-[#D3DDD6] text-sm self-center">Rango Sugerido</span>
                                <div className="text-right">
                                    <div className="font-semibold font-outfit text-white">{rangoMin ? formatCurrency(rangoMin) : '—'}</div>
                                    <div className="font-semibold font-outfit text-white">{rangoMax ? formatCurrency(rangoMax) : '—'}</div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <span className="text-[#D3DDD6] text-sm">Precio m² Ref.</span>
                                <span className="font-semibold font-outfit text-white">{formatCurrency(precioM2Usado)}/m²</span>
                            </div>
                            {totalComparables !== null && (
                                <div className="flex justify-between items-center">
                                    <span className="text-[#D3DDD6] text-sm">Muestra</span>
                                    <div className="text-right">
                                        <span className="font-semibold block">{totalComparables} inmuebles</span>
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
                                        ? 'Calculado a partir de la <strong>mediana de precio por m²</strong> de lotes comparables en la zona (sin incluir construcciones ni ajustes adicionales).'
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
                            <p className="text-sm text-[#4F5B55] leading-relaxed text-justify">
                                {data.resumen_busqueda}
                            </p>
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
        </div >
    );
}
