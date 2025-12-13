import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { generateAvaluoEmailHtml } from '@/lib/emailGenerator';
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
    Send
} from 'lucide-react';
import TablaComparables from './TablaComparables';
import BotonPDF from './BotonPDF';
import { construirTextoConfianza } from '@/lib/confidenceHelper';
import { isDevelopmentMode, getDevUser } from '@/utils/devAuth';

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

// --- COMPONENTE DE FORMATO DE TEXTO ---
// Force rebuild 2025-12-09 - Ensure 2 columns
const AnalisisAI = ({ text }) => {
    console.log('📝 RAW ANALISIS TEXT (Frontend):', text);
    if (!text) return null;

    // 1. Limpieza de LaTeX básico (Igual que en BotonPDF)
    // 1. Limpieza de LaTeX básico (Mejorada para soportar fórmulas matemáticas complejas)
    let cleanText = text
        .replace(/^-{3,}\s*$/gm, '')
        // INJECT DEFAULT NOTES IF MISSING (Fallback)
        // Detecta si falta nota (considerando variantes como *Nota:, Nota:, **NOTA:**, *TextoItalico*)
        // CRÍTICO: Soporta CRLF (Windows) y LF (Unix) line endings
        .replace(/(fuente_validacion:\s*(?:estimacion_zona|promedio_municipal|portal_verificado|zona_similar))(?!\s*[\r\n]+\s*(?:(?:\*+)?NOTA:(?:\*+)?|(?:\*+)?Nota:(?:\*+)?|\*(?!\s)))/gi, (match, prefix) => {
            let note = "";
            let p = prefix.toLowerCase();
            if (p.includes("estimacion_zona")) note = "Basado en datos de propiedades similares en la zona.";
            else if (p.includes("promedio_municipal")) note = "Basado en datos de propiedades similares en ciudad/municipio.";
            else if (p.includes("portal_verificado")) note = "Anuncio de listado en la misma zona.";
            else if (p.includes("zona_similar")) note = "Propiedad en zona con características similares.";
            return `${prefix}\n**NOTA:** ${note}`;
        })
        // LaTeX spacing commands (NEW)
        .replace(/\\quad/g, '<br>')        // \quad → line break
        .replace(/\\qquad/g, '<br>')       // \qquad → line break
        .replace(/\\,/g, ' ')              // thin space
        .replace(/\\:/g, ' ')              // medium space
        .replace(/\\;/g, ' ')              // thick space
        .replace(/\\!/g, '')               // negative thin space
        .replace(/\\enspace/g, ' ')
        .replace(/\\hspace\{[^}]*\}/g, ' ')
        // End LaTeX spacing commands
        .replace(/\\\(/g, '')
        .replace(/\\\)/g, '')
        .replace(/\\\[/g, '')
        .replace(/\\\]/g, '')
        .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1 / $2)') // (Num / Den)
        .replace(/\\times/g, ' × ')
        .replace(/\\text\{([^}]+)\}/g, '$1')
        .replace(/\\sum/g, '∑')
        .replace(/\\approx/g, '≈')
        .replace(/\\cdot/g, '•')
        .replace(/\\{/g, '')
        .replace(/\\}/g, '')
        .replace(/\^2/g, '²') // m^2 -> m²
        .replace(/\s+COP\/m²/g, ' COP/m²')
        .replace(/Promedio precio por m²\s*=\s*(?:\\frac\{[^{}]+\}\{[^{}]+\}|[^\n≈]+)\s*≈\s*([\d\.\,]+)\s*COP\/m²/gi, 'Promedio precio por m² ≈ $1 COP/m²')
        // Convertir markdown bold a HTML (IGUAL QUE PDF - PASO 1)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Eliminar citaciones numéricas [1][2][3]...
        .replace(/\[\d+\]/g, '');

    // Desescapear HTML entities que Perplexity pueda enviar escapadas
    cleanText = cleanText
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    // 4. Limpieza final de tags sobrantes si quedaron
    // cleanText = cleanText.replace(/<\/?strong>/g, ''); // ELIMINADO: Queremos mantener strong para el parser HTML

    console.log('🔍 DESPUÉS DE HTML entities cleanup:', cleanText.substring(0, 500));
    console.log('🔍 ¿Contiene <strong>?', cleanText.includes('<strong>'));
    console.log('🔍 ¿Contiene **?', cleanText.includes('**'));

    // Limpiar notación científica: 3.18 × 10^6 → 3.180.000
    cleanText = cleanText.replace(/(\d+(?:[.,]\d+)?)\s*[×x]\s*10\^(\d+)/gi, (match, coefficient, exponent) => {
        const num = parseFloat(coefficient.replace(',', '.'));
        const power = parseInt(exponent);
        const result = num * Math.pow(10, power);
        return Math.round(result).toLocaleString('es-CO');
    });

    // Helper para convertir validación a HTML badge (como en PDF)
    const getBadgeHtml = (validation) => {
        const val = validation.trim().toLowerCase();
        let badgeClass = '';
        let badgeText = validation.trim();

        if (val === 'portal_verificado') {
            badgeClass = 'bg-green-100 text-green-700 border-green-300';
            badgeText = '✓ Coincidencia';
        } else if (val === 'estimacion_zona') {
            badgeClass = 'bg-orange-100 text-orange-700 border-orange-300';
            badgeText = '≈ Estimación';
        } else if (val === 'zona_similar') {
            badgeClass = 'bg-blue-100 text-blue-700 border-blue-300';
            badgeText = '→ Zona Similar';
        } else if (val === 'promedio_municipal') {
            badgeClass = 'bg-purple-100 text-purple-700 border-purple-300';
            badgeText = '≈ Estimación';
        } else {
            badgeClass = 'bg-gray-100 text-gray-600 border-gray-300';
        }

        return `<span class="inline-block px-2 py-1 rounded text-xs font-medium border ${badgeClass}">${badgeText}</span>`;
    };

    // PROCESAR PATRONES INLINE (como en PDF) - convertir a HTML directamente
    // Limpiar HTML entities escapados (IGUAL QUE PDF - antes del procesamiento)
    cleanText = cleanText
        .replace(/&lt;strong&gt;/g, '<strong>')
        .replace(/&lt;\/strong&gt;/g, '</strong>');

    // Detectar patrón: <strong>Portal</strong> (con posible salto de línea) fuente_validacion: xxx
    // REFUERZO: Reemplazar ** que puedan haber quedado (IGUAL QUE PDF - PASO 2)
    cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // --- POST-PROCESAMIENTO: DESTACAR PALABRAS CLAVE ---
    // Detectar y destacar automáticamente frases clave comunes para mejor legibilidad
    const keyPhrasePatterns = [
        // Análisis de métodos
        /\b(Promedio de precios de venta de \d+ comparables):/gi,
        /\b(Precio por m² promedio):/gi,
        /\b(Precio\/m² ajustado):/gi,
        /\b(Canon mensual estimado):/gi,
        /\b(Yield promedio mercado):/gi,
        /\b(Valor total):/gi,
        /\b(Valor estimado):/gi,
        /\b(Factor total):/gi,

        // Ajustes
        /^(Justificación):/gim,
        /^(Porcentaje aplicado):/gim,
        /\b(Ajuste por antigüedad):/gi,
        /\b(Ajuste por estado):/gi,
        /\b(Ajuste por ubicación):/gi,
        /\b(Ajuste por reformas):/gi,

        // Pasos metodológicos
        /\b(PASO \d+):/gi,

        // Resultados
        /\b(Valor Recomendado de Venta):/gi,
        /\b(Rango sugerido):/gi,
        /\b(Precio m² final):/gi,
    ];

    keyPhrasePatterns.forEach(pattern => {
        cleanText = cleanText.replace(pattern, (match, group1) => {
            // Si ya está en <strong>, no duplicar
            if (cleanText.includes(`<strong>${group1}</strong>`)) return match;
            return `<strong>${group1}</strong>:`;
        });
    });

    // Ahora procesar los badges
    cleanText = cleanText.replace(/(<strong>[^<]+<\/strong>)[\s\r\n]*fuente_validacion:\s*([^\r\n]+)/gi, (match, portal, validation) => {
        return `${portal} ${getBadgeHtml(validation.trim())}`;
    });

    // Si encuentra fuente_validacion sin portal antes (legacy), solo mostrar badge
    cleanText = cleanText.replace(/^fuente_validacion:\s*(.+)$/gim, (match, validation) => {
        return getBadgeHtml(validation.trim());
    });

    // FORMATEAR NOTA en tamaño pequeño (8pt) debajo del badge (para zona_similar u otros)
    // Mejorar el formato: "Centro está a 3 km..." → "A 3 km de distancia, tiene características..."
    // Regex flexible para capturar: "**NOTA:**", "*Nota:", "Nota:", "NOTA:", etc.
    cleanText = cleanText.replace(/(?:<strong>)?(?:\*)?Nota:(?:\*)?(?:<\/strong>)?\s*([^\n]+)/gi, (match, noteText) => {
        // Extraer distancia y características del texto original
        let formattedNote = noteText.trim()
            // Limpiar asteriscos finales si quedaron (Markdown malformado)
            .replace(/\*+$/, '');

        // Patrón 1: "Ciudad está a X km de Objetivo, [con/condiciones] características..."
        const pattern1 = /(.+?)\s+está\s+a\s+(\d+)\s*km\s+de\s+[^,]+,?\s*(.+)/i;
        const match1 = formattedNote.match(pattern1);

        if (match1) {
            const distance = match1[2];
            let characteristics = match1[3];

            // Normalizar: "con características" o "condiciones" → "tiene características"
            characteristics = characteristics
                .replace(/^con\s+/i, 'tiene ')
                .replace(/^condiciones\s+/i, 'tiene condiciones ');

            formattedNote = `A ${distance} km de distancia, ${characteristics}`;
        }

        return `<span style="display:block; font-size:11px; color:#6B7280; font-style:italic; margin-top:4px; line-height:1.3; text-align:left;"><strong>NOTA:</strong> ${formattedNote}</span>`;
    })
        // Formatear notas "huerfanas" en itálicas (sin prefijo Nota:)
        // Captura líneas enteras *Texto* que vengan después de un badge (o en contexto de validación)
        .replace(/(?:^|\n)\s*\*([^*]{10,})\*\s*(?:\n|$)/g, (match, noteText) => {
            let formattedNote = noteText.trim();
            // Limpiar asteriscos si se capturaron
            // El regex captura el grupo interno 1 sin asteriscos si hacemos *([^...])*, ajustemos:
            // *([^*]{10,})* => captura lo de adentro.

            // Misma lógica de limpieza de distancia
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

    // --- SMART FORMATTER: Rehidratar estructura ---
    // 1. Reemplazar separadores "---" o líneas horizontales por saltos dobles
    cleanText = cleanText.replace(/\s*-{3,}\s*/g, '\n\n');

    // 2. Convertir títulos numerados ("1. TÍTULO") en Headers Markdown ("# 1. TÍTULO")
    // Busca patrones como: "1. TÍTULO", "**1. TÍTULO**" (solo en la misma línea)
    // Usamos [ \t] en vez de \s para NO capturar saltos de línea accidentalmente
    cleanText = cleanText.replace(/(?:^|\n|\.)[ \t]*\**(\d+\.\s+[A-ZÁÉÍÓÚÑ ]{3,100}[:]??)\**/g, '\n\n# $1\n');

    // 3. Separar fórmulas de bloque LaTeX (\[ ... \])
    cleanText = cleanText.replace(/\\\[/g, '\n\n').replace(/\\\]/g, '\n\n');

    // 4. Asegurar que las tablas tengan espacio antes (si una línea empieza con | y la anterior no es vacía)
    cleanText = cleanText.replace(/([^\n])\n(\|)/g, '$1\n\n$2');

    // 5. LISTAS DE COMPARABLES: Convertir bloques pegados ("**Casa...") en listas ("- **Casa...")
    // Detecta inicio de comparable en medio de línea y fuerza nueva línea + viñeta
    const comparableRegex = /([^\n])\s+(\*\*(?:Casa|Apartamento|Lote|Fincaraíz|Ciencuadras|Metrocudrado|Inmueble|Propiedad)\b)/g;
    cleanText = cleanText.replace(comparableRegex, '$1\n\n- $2');

    // También si ya está al inicio de línea pero sin viñeta
    cleanText = cleanText.replace(/\n(\*\*(?:Casa|Apartamento|Lote)\b)/g, '\n- $1');

    // Primero dividir en bloques por doble salto de línea
    // CORRECCIÓN: NO reemplazar \n por <br> aquí, hacerlo solo al renderizar párrafos
    const blocks = cleanText.split('\n\n');

    return (
        <div className="text-[#4F5B55] font-raleway columns-2 gap-10 space-y-4">
            {blocks.map((block, index) => {
                const trimmed = block.trim();
                if (!trimmed) return null;

                // HEADERS
                if (trimmed.startsWith('#')) {
                    // CRÍTICO: Solo tomar la PRIMERA LÍNEA como header
                    // Si hay texto después del salto de línea, procesarlo como bloque separado
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

                // TABLAS MARKDOWN
                if (trimmed.startsWith('|')) {
                    const rows = trimmed.split('\n').filter(r => r.trim());
                    return (
                        <div key={index} className="overflow-x-auto mb-4 break-inside-avoid shadow-sm rounded-lg border border-[#E0E5E2] bg-white">
                            <table className="w-full text-xs border-collapse">
                                <tbody>
                                    {rows.map((row, rIdx) => {
                                        if (row.includes('---')) return null; // Ignorar separadores
                                        const cells = row.split('|').filter(c => c.trim() !== '');
                                        if (cells.length === 0) return null;

                                        const isHeader = rIdx === 0;
                                        return (
                                            <tr key={rIdx} className={isHeader ? "bg-[#F0ECD9] text-[#2C3D37] font-bold" : "border-t border-[#f0f0f0] text-[#4F5B55]"}>
                                                {cells.map((cell, cIdx) => {
                                                    // Alineación: Primera columna Izquierda, Última Derecha, Resto Centro
                                                    // Vertical: Middle
                                                    let alignClass = "text-center";
                                                    if (cIdx === 0) alignClass = "text-left";
                                                    if (cIdx === cells.length - 1) alignClass = "text-right";

                                                    // Padding: Menos padding vertical en el header para quitar espacio blanco
                                                    const paddingClass = isHeader ? "px-2 py-1" : "p-2";

                                                    return (
                                                        <td
                                                            key={cIdx}
                                                            className={`${paddingClass} border-r border-[#f0f0f0] last:border-r-0 ${alignClass} align-middle`}
                                                            dangerouslySetInnerHTML={{ __html: cell.trim() }}
                                                        />
                                                    );
                                                })}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                }

                // LISTAS
                // IMPORTANTE: NO capturar títulos con números (3.1., 3.2.) - solo listas reales
                if (trimmed.match(/^[-*•]\s/) || (trimmed.match(/^\d+[\.\)]\s/) && !trimmed.match(/^\d+\.\d+/))) {
                    // Dividir solo por líneas que EMPIEZAN con marcador de lista
                    const lines = trimmed.split('\n');
                    const items = [];
                    let currentItem = '';

                    for (const line of lines) {
                        // Si la línea empieza con marcador de lista, es un nuevo item
                        // PERO NO si es un título de sección (3.1., 3.2., etc.)
                        if ((line.match(/^[-*•]\s/) || line.match(/^\d+[\.\)]\s/)) && !line.match(/^\d+\.\d+/)) {
                            if (currentItem) items.push(currentItem);
                            currentItem = line.replace(/^(?:[-*•]|\d+[\.\)])\s*/, '');
                        } else if (line.trim()) {
                            // Línea de continuación (cálculo, etc.) - agregar al item actual
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

                // PARRAGRAFOS (ahora incluyen badges inline)
                // Convertir \n a <br> AQUÍ, solo para párrafos normales
                const paragraphHtml = trimmed.replace(/\n/g, '<br>');
                return (
                    <p key={index} className="mb-4 text-sm leading-relaxed text-justify break-inside-avoid text-[#4F5B55]" dangerouslySetInnerHTML={{ __html: paragraphHtml }} />
                );
            })}
        </div>
    );
};




export default function Step3Results({ formData, onUpdate, onNext, onBack, onReset, autoDownloadPDF }) {
    const [mostrarComparables, setMostrarComparables] = useState(false);
    const [hasAvaluos, setHasAvaluos] = useState(false);
    const pdfButtonRef = useRef(null);
    const navigate = useNavigate();

    // Verificar si el usuario tiene avalúos guardados
    useEffect(() => {
        const checkAvaluos = async () => {
            try {
                // En modo desarrollo, usar usuario mock
                if (isDevelopmentMode()) {
                    const devUser = getDevUser();
                    if (devUser) {
                        console.log('🔧 Usuario de desarrollo:', devUser.email);
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

    // Auto-download PDF cuando viene desde email
    useEffect(() => {
        if (autoDownloadPDF && pdfButtonRef.current) {
            // Esperar un momento para que la página cargue completamente
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

            // Recalcular valores para el email (misma lógica que en render)
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
                rangoMax
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
            alert("¡Correo reenviado con éxito!");
        },
        onError: (error) => {
            console.error("Error reenviando correo:", error);
            alert("Error al reenviar el correo. Por favor intenta de nuevo.");
        }
    });

    const handleAction = () => {
        // Si ya tiene ID y datos de contacto, reenviar directamente
        if (formData.id && (formData.email || formData.contacto_email)) {
            sendEmailMutation.mutate();
        } else {
            // Si es nuevo o no tiene datos, ir al formulario
            onNext();
        }
    };

    if (!formData) return renderErrorState('Datos del formulario no disponibles', onBack);

    const data = formData.comparables_data || formData;
    if (!data || (Array.isArray(data.comparables) && data.comparables.length === 0 && !data.valor_final)) {
        if (!data.valor_final && !data.valor_estimado_venta_directa && !data.valor_estimado_rentabilidad) {
            return renderErrorState("Análisis de mercado insuficiente", onBack);
        }
    }

    // Priorizar nuevo campo valor_mercado, fallback a legacy
    const valorMercado = validarNumero(data.valor_mercado) || validarNumero(data.valor_estimado_venta_directa);
    const valorVentaDirecta = valorMercado;  // Alias para compatibilidad
    const factorAjuste = validarNumero(data.factor_ajuste_total) || 1.0;
    const valorRentabilidad = validarNumero(data.valor_estimado_rentabilidad);
    const rangoMin = validarNumero(data.rango_valor_min);
    const rangoMax = validarNumero(data.rango_valor_max);
    const precioM2Usado = validarNumero(data.precio_m2_final) || validarNumero(data.precio_m2_usado) || validarNumero(data.precio_m2_venta_directa);

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

    // Corrección 3: Usar contadores consistentes del Worker
    const totalComparables = validarNumero(data.comparables_usados_en_calculo) || validarNumero(data.total_comparables);
    const totalEncontrados = validarNumero(data.comparables_totales_encontrados);
    const totalVenta = validarNumero(data.total_comparables_venta);
    const totalArriendo = validarNumero(data.total_comparables_arriendo);
    const portales = data.portales_consultados || [];

    // Código de avalúo
    const codigoAvaluo = formData.codigo_avaluo || data.codigo_avaluo;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">

            {/* MINIMALIST NAVIGATION LINKS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm">
                {/* IZQUIERDA: Código de Avalúo + Botón Mis Avalúos */}
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

                {/* DERECHA: Acciones */}
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

            {/* 1. SECCIÓN HERO */}
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

                            {/* Ficha Técnica Resumida */}
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
                                                ✨ {toTitleCase((formData.estado_inmueble || formData.estado || data.estado_inmueble || data.estado || '').replace(/_/g, ' '))}
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
                {/* Corrección 4: Explicación del Valor Final */}
                <div className="px-6 pb-6 relative z-10">
                    <p className="text-xs text-[#D3DDD6]/80 italic leading-relaxed">
                        El valor final es una recomendación técnica ponderada entre el enfoque de mercado y el de rentabilidad,
                        priorizando el método con datos más consistentes según la cantidad, homogeneidad y dispersión de los
                        comparables disponibles.
                    </p>
                </div>
            </Card>

            {/* 2. MÉTODOS DESGLOSADOS (ADAPTATIVO) */}
            <div className={valorRentabilidad ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "flex justify-center"}>
                {/* Venta Directa */}
                <Card className="border-[#e6e0c7] shadow-sm hover:shadow-md transition-shadow duration-200 w-full max-w-lg bg-[#F8F6EF]">
                    <CardHeader className="pb-3 bg-[#F8F6EF] border-b border-[#e6e0c7]">
                        <CardTitle className="text-base text-[#2C3D37] flex items-center gap-2 font-outfit">
                            <TrendingUp className="w-4 h-4 text-[#C9C19D]" />
                            {esLote ? 'Metodología Ajustada (Lotes)' : 'Enfoque de Mercado (Comparables)'}
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
                                        ? 'Calculado a partir del precio promedio por m² de lotes comparables y ajuste residual.'
                                        : 'Calculado a partir del <strong>precio promedio por m²</strong> de las propiedades comparables<br>(precio promedio por m² × área del inmueble).'
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

                {/* Rentabilidad (Condicional) */}
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
                                {/* Corrección 5: Nota sobre Yield */}
                                {data.yield_mensual_mercado && (
                                    <p
                                        className="text-xs text-[#7A8C85] italic px-4 mt-2 text-center"
                                        dangerouslySetInnerHTML={{
                                            __html: `<strong>El yield utilizado (${(data.yield_mensual_mercado * 100).toFixed(2)}% mensual)</strong> (promedio observado en arriendos residenciales del sector, ajustado por valor del sector)`
                                        }}
                                    />
                                )}
                            </div>
                            <div className="flex justify-between items-center pt-2 mt-1">
                                <span className="text-sm text-[#7A8C85]">Precio m² implícito:</span>
                                <span className="text-sm font-semibold text-[#2C3D37]">
                                    {areaInmueble && valorRentabilidad ? `${formatCurrency(valorRentabilidad / areaInmueble)}/m²` : '—'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Alert className="border-[#C9C19D]/30 bg-[#FFFDF5] text-[#2C3D37]">
                <Info className="h-4 w-4 text-[#C4A356]" />
                <AlertDescription className="text-sm">
                    Este informe es una estimación automatizada basada en datos estadísticos. <strong>No reemplaza un avalúo certificado profesional.</strong>
                </AlertDescription>
            </Alert>

            {/* 3. RESUMEN DEL MERCADO (ESTILO ESTIMACIÓN IA) */}
            {tieneResumen && (
                <div className="bg-[#C9C19D]/90 rounded-xl p-6 shadow-sm border border-[#C9C19D]">
                    <h3 className="font-outfit font-semibold text-lg text-[#1a2620] mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-[#1a2620] rounded-full"></span>
                        Resumen del Mercado
                    </h3>
                    <p className="text-sm text-[#1a2620] leading-relaxed font-raleway whitespace-pre-line font-medium" dangerouslySetInnerHTML={{ __html: data.resumen_busqueda.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
            )}

            {/* AVISO DE DESCARGA PDF */}
            <Alert className="border-[#C9C19D]/30 bg-[#FFFDF5] text-[#2C3D37]">
                <Download className="h-4 w-4 text-[#C9C19D]" />
                <AlertDescription className="text-sm">
                    <strong>Descarga el reporte completo en PDF</strong> para compartir o guardar esta valoración con todos los detalles y comparables.
                </AlertDescription>
            </Alert>

            {/* 4. PORTALES CONSULTADOS (BLOQUE DESTACADO TIPO ALERTA) */}
            {portales.length > 0 && (
                <Alert className="border-[#C9C19D]/30 bg-[#FFFDF5] text-[#2C3D37]">
                    <Globe className="h-4 w-4 text-[#C9C19D]" />
                    <div className="flex flex-col gap-2 w-full">
                        <span className="text-sm font-semibold">Fuentes Consultadas:</span>
                        <div className="flex flex-wrap gap-2">
                            {portales.map((portal, idx) => (
                                <Badge key={idx} variant="outline" className="bg-white border-[#C9C19D]/50 text-[#4F5B55] font-normal hover:bg-[#E0E5E2]">
                                    {portal}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </Alert>
            )}

            {/* 5. TABLA DE COMPARABLES */}
            {tieneComparables && (
                <>
                    {/* Alert de nivel de confianza (todos los niveles) */}
                    {data.nivel_confianza && (
                        <Alert
                            variant="default"
                            className={
                                data.nivel_confianza === 'Alto'
                                    ? "border-green-300 bg-green-50 mb-6 mt-6"
                                    : data.nivel_confianza === 'Medio'
                                        ? "border-blue-300 bg-blue-50 mb-6 mt-6"
                                        : "border-yellow-300 bg-yellow-50 mb-6 mt-6"
                            }
                        >
                            <AlertCircle className={
                                data.nivel_confianza === 'Alto'
                                    ? "h-4 w-4 text-green-600"
                                    : data.nivel_confianza === 'Medio'
                                        ? "h-4 w-4 text-blue-600"
                                        : "h-4 w-4 text-yellow-600"
                            } />
                            <AlertDescription className={
                                data.nivel_confianza === 'Alto'
                                    ? "text-green-800"
                                    : data.nivel_confianza === 'Medio'
                                        ? "text-blue-800"
                                        : "text-yellow-800"
                            }>
                                {construirTextoConfianza(
                                    data.nivel_confianza,
                                    data.nivel_confianza_detalle
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    <Card className="border-[#E0E5E2] shadow-sm overflow-hidden transition-all duration-300 mt-6">
                        <button
                            onClick={() => setMostrarComparables(!mostrarComparables)}
                            className="w-full flex items-center justify-between p-4 bg-[#F9FAF9] hover:bg-[#F0F2F1] transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-white border border-[#E0E5E2] rounded-md text-[#2C3D37]">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-outfit font-semibold text-base text-[#2C3D37]">Propiedades Comparables</h3>
                                    <p className="text-xs text-[#7A8C85]">Ver los {totalComparables || data.comparables.length} inmuebles usados para el cálculo</p>
                                </div>
                            </div>
                            {mostrarComparables ? <ChevronUp className="w-5 h-5 text-[#7A8C85]" /> : <ChevronDown className="w-5 h-5 text-[#7A8C85]" />}
                        </button>
                        {mostrarComparables && (
                            <div className="border-t border-[#E0E5E2] animate-in slide-in-from-top-2 duration-300">
                                <TablaComparables comparables={data.comparables} yieldMensualMercado={data.yield_mensual_mercado} esLote={esLote} />
                            </div>
                        )}
                    </Card>
                </>
            )}

            {/* 6. ANÁLISIS COMPLETO IA */}
            {tieneAnalisisCompleto && (
                <Card className="border-[#E0E5E2] shadow-sm overflow-hidden mt-8">
                    <CardHeader className="bg-[#2C3D37] py-4">
                        <CardTitle className="text-base text-white font-outfit flex items-center gap-2">
                            <span className="bg-[#C9C19D] text-[#2C3D37] text-[10px] font-bold px-2 py-0.5 rounded">AI</span>
                            Análisis Detallado del Modelo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 md:p-8 bg-white">
                        <AnalisisAI text={data.perplexity_full_text} />
                    </CardContent>
                </Card>
            )}

            {/* 7. NAVEGACIÓN (BOTONES ALINEADOS) */}
            <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4 pt-3 border-t border-[#E0E5E2] mt-8">
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={onBack} className="text-[#7A8C85] hover:text-[#2C3D37] hover:bg-[#F5F7F6]">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Editar Datos
                    </Button>
                </div>
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <BotonPDF ref={pdfButtonRef} formData={formData} />
                    {onReset && (
                        <Button
                            variant="outline"
                            onClick={onReset}
                            className="bg-transparent text-[#2C3D37] border-2 border-[#2C3D37] hover:bg-[#2C3D37]/5 rounded-full py-6 text-lg font-medium"
                        >
                            Nuevo Avalúo
                        </Button>
                    )}
                    <Button
                        onClick={handleAction}
                        className="bg-[#2C3D37] hover:bg-[#1a2620] text-white rounded-full py-6 text-lg font-medium shadow-lg transition-all"
                        disabled={!valorPrincipal || sendEmailMutation.isPending}
                    >
                        {sendEmailMutation.isPending ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                {formData.id && (formData.email || formData.contacto_email) ? (
                                    <>Reenviar al correo <Send className="w-5 h-5 ml-2" /></>
                                ) : (
                                    <>Enviar al correo <ArrowRight className="w-5 h-5 ml-2" /></>
                                )}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function validarNumero(valor) {
    if (valor === null || valor === undefined) return null;
    if (typeof valor === 'number') return isFinite(valor) && !isNaN(valor) ? valor : null;
    if (typeof valor === 'string') {
        const num = parseFloat(valor.replace(/[^\d.-]/g, ''));
        return isFinite(num) && !isNaN(num) ? num : null;
    }
    return null;
}

function renderErrorState(mensaje, onBack) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6">
            <div className="bg-red-50 p-4 rounded-full"><AlertCircle className="h-10 w-10 text-red-500" /></div>
            <div className="max-w-md space-y-2">
                <h3 className="text-lg font-semibold text-[#2C3D37]">No pudimos generar el análisis</h3>
                <p className="text-sm text-[#4F5B55]">{mensaje}</p>
            </div>
            <Button onClick={onBack} variant="outline" className="border-[#B0BDB4] text-[#2C3D37] rounded-full">
                <ArrowLeft className="w-4 h-4 mr-2" /> Intentar nuevamente
            </Button>
        </div>
    );
}
