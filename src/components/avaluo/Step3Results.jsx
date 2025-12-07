import React, { useState } from 'react';
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
    Download
} from 'lucide-react';
import TablaComparables from './TablaComparables';
import BotonPDF from './BotonPDF';

// --- COMPONENTE DE FORMATO DE TEXTO ---
// --- COMPONENTE DE FORMATO DE TEXTO ---
const AnalisisAI = ({ text }) => {
    if (!text) return null;

    // 1. Limpieza de LaTeX básico (Igual que en BotonPDF)
    // 1. Limpieza de LaTeX básico (Igual que en BotonPDF)
    const cleanText = text
        .replace(/^-{3,}\s*$/gm, '')
        .replace(/^[ \t]*[-_]{2,}[ \t]*$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\\\(/g, '')
        .replace(/\\\)/g, '')
        .replace(/\\\[/g, '')
        .replace(/\\\]/g, '')
        .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1 / $2')
        .replace(/\\text\{([^}]+)\}/g, '$1')
        .replace(/\\sum/g, '∑')
        .replace(/\\approx/g, '≈')
        .replace(/\s+COP\/m²/g, ' COP/m²')
        .replace(/Promedio precio por m²\s*=\s*(?:\\frac\{[^{}]+\}\{[^{}]+\}|[^\n≈]+)\s*≈\s*([\d\.\,]+)\s*COP\/m²/gi, 'Promedio precio por m² ≈ $1 COP/m²')
        .replace(/^[\d\.]+\s+(?=[A-Z])/gm, '')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const blocks = cleanText.split('\n\n');

    return (
        <div className="text-[#4F5B55] font-raleway columns-1 md:columns-2 gap-10 space-y-4">
            {blocks.map((block, index) => {
                const trimmed = block.trim();
                if (!trimmed) return null;

                // HEADERS
                if (trimmed.startsWith('#')) {
                    const title = trimmed.replace(/^#+\s*/, '');
                    return (
                        <h3 key={index} className="font-outfit font-bold text-lg text-[#2C3D37] mt-6 first:mt-0 mb-3 border-b border-[#C9C19D]/50 pb-1 break-inside-avoid">
                            {title}
                        </h3>
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
                                                {cells.map((cell, cIdx) => (
                                                    <td key={cIdx} className="p-2 border-r border-[#f0f0f0] last:border-r-0 text-center last:text-right first:text-left">
                                                        {cell.trim()}
                                                    </td>
                                                ))}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                }

                // LISTAS
                if (trimmed.match(/^[-*•]|^\d+[\.\)]/)) {
                    const items = trimmed.split('\n').map((line) => line.replace(/^[-*•\d+[\.\)]\s*/, ''));
                    return (
                        <ul key={index} className="list-none space-y-2 mb-4 break-inside-avoid">
                            {items.map((item, i) => (
                                <li key={i} className="flex gap-2 text-sm leading-relaxed text-[#4F5B55]">
                                    <span className="font-bold mt-0.5">•</span>
                                    <span dangerouslySetInnerHTML={{ __html: item }} />
                                </li>
                            ))}
                        </ul>
                    );
                }

                // PARRAGRAFOS
                return (
                    <p key={index} className="mb-4 text-sm leading-relaxed text-justify break-inside-avoid text-[#4F5B55]" dangerouslySetInnerHTML={{ __html: trimmed }} />
                );
            })}
        </div>
    );
};

export default function Step3Results({ formData, onUpdate, onNext, onBack, onReset }) {
    const [mostrarComparables, setMostrarComparables] = useState(false);

    if (!formData) return renderErrorState('Datos del formulario no disponibles', onBack);

    const data = formData.comparables_data || formData;
    if (!data || (Array.isArray(data.comparables) && data.comparables.length === 0 && !data.valor_final)) {
        if (!data.valor_final && !data.valor_estimado_venta_directa && !data.valor_estimado_rentabilidad) {
            return renderErrorState("Análisis de mercado insuficiente", onBack);
        }
    }

    const valorVentaDirecta = validarNumero(data.valor_estimado_venta_directa);
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

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">

            {/* 1. SECCIÓN HERO */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-[#2C3D37] to-[#1a2620] text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-[#C9C19D] opacity-10 rounded-full blur-2xl"></div>
                <CardHeader className="pb-2 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl md:text-2xl font-outfit font-semibold flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-lg"><Home className="w-6 h-6 text-[#C9C19D]" /></div>
                                Valor Comercial Estimado
                            </CardTitle>
                            <p className="text-sm text-[#D3DDD6] mt-2 font-raleway max-w-lg">
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
                <CardContent className="pt-4 relative z-10">
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
                                        {formData.uso_lote && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                                                🏗️ {formData.uso_lote}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                                            📍 {formData.municipio || formData.ciudad || '—'}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        {formData.tipo_inmueble && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                                                🏠 {formData.tipo_inmueble}
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
                                                ✨ {(formData.estado_inmueble || formData.estado || data.estado_inmueble || data.estado || '').replace(/_/g, ' ')}
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
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <span className="text-[#D3DDD6] text-sm">Rango Sugerido</span>
                                <span className="font-semibold font-outfit text-white">
                                    {rangoMin ? formatCurrency(rangoMin) : '—'} - {rangoMax ? formatCurrency(rangoMax) : '—'}
                                </span>
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
            <div className={valorRentabilidad ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "max-w-lg mx-auto"}>
                {/* Venta Directa */}
                <Card className="border-[#E0E5E2] shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-3 bg-[#F9FAF9] border-b border-[#F0F2F1]">
                        <CardTitle className="text-base text-[#2C3D37] flex items-center gap-2 font-outfit">
                            <TrendingUp className="w-4 h-4 text-[#C9C19D]" />
                            {esLote ? 'Metodología Ajustada (Lotes)' : 'Enfoque de Mercado (Comparables)'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-[#2C3D37] mt-1 font-outfit">
                                {formatCurrency(valorVentaDirecta)}
                            </div>
                        </div>
                        <p className="text-sm text-[#4F5B55] leading-relaxed text-center px-4 mt-1 border-b border-dashed border-[#E0E5E2] pb-3">
                            {esLote
                                ? 'Calculado a partir del precio promedio por m² de lotes comparables y ajuste residual.'
                                : 'Calculado a partir del precio promedio por m² de las propiedades comparables (precio promedio por m² × área del inmueble).'}
                        </p>
                        <div className="flex justify-between items-center pt-2 mt-1">
                            <span className="text-sm text-[#7A8C85]">Precio m² estimado:</span>
                            <span className="text-sm font-semibold text-[#2C3D37]">
                                {areaInmueble && valorVentaDirecta ? `${formatCurrency(valorVentaDirecta / areaInmueble)}/m²` : '—'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Rentabilidad (Condicional) */}
                {valorRentabilidad && (
                    <Card className="border-[#E0E5E2] shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="pb-3 bg-[#F9FAF9] border-b border-[#F0F2F1]">
                            <CardTitle className="text-base text-[#2C3D37] flex items-center gap-2 font-outfit">
                                <Calculator className="w-4 h-4 text-[#C9C19D]" />
                                Enfoque de Rentabilidad (Capitalización)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-[#2C3D37] mt-1 font-outfit">
                                    {formatCurrency(valorRentabilidad)}
                                </div>
                            </div>
                            <p className="text-sm text-[#4F5B55] leading-relaxed text-center px-4 mt-1 border-b border-dashed border-[#E0E5E2] pb-3">
                                Calculado a partir del canon mensual estimado y la fórmula del rendimiento (yield) del sector (canon mensual estimado ÷ yield mensual).
                            </p>
                            {/* Corrección 5: Nota sobre Yield */}
                            {data.yield_mensual_mercado && (
                                <p className="text-xs text-[#7A8C85] italic px-4 mt-2">
                                    El yield utilizado ({(data.yield_mensual_mercado * 100).toFixed(2)}% mensual) corresponde al promedio
                                    observado en arriendos residenciales del sector, ajustado automáticamente por zona y disponibilidad de comparables.
                                </p>
                            )}
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
                                <p className="text-xs text-[#7A8C85]">Ver los {data.comparables.length} inmuebles usados para el cálculo</p>
                            </div>
                        </div>
                        {mostrarComparables ? <ChevronUp className="w-5 h-5 text-[#7A8C85]" /> : <ChevronDown className="w-5 h-5 text-[#7A8C85]" />}
                    </button>
                    {mostrarComparables && (
                        <div className="border-t border-[#E0E5E2] animate-in slide-in-from-top-2 duration-300">
                            <TablaComparables comparables={data.comparables} yieldMensualMercado={data.yield_mensual_mercado} />
                        </div>
                    )}
                </Card>
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
            <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E0E5E2] mt-8">
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={onBack} className="text-[#7A8C85] hover:text-[#2C3D37] hover:bg-[#F5F7F6]">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Editar Datos
                    </Button>
                </div>
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <BotonPDF formData={formData} />
                    {onReset && (
                        <Button variant="outline" onClick={onReset} className="text-[#7A8C85] border-[#B0BDB4] hover:text-[#2C3D37] hover:bg-[#F5F7F6] rounded-full py-6">
                            Nuevo Avalúo
                        </Button>
                    )}
                    <Button onClick={onNext} className="bg-[#2C3D37] hover:bg-[#1a2620] text-white rounded-full py-6 text-lg font-medium shadow-lg transition-all" disabled={!valorPrincipal}>
                        Finalizar Informe <ArrowRight className="w-5 h-5 ml-2" />
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