/**
 * Genera explicación clara del nivel de confianza para usuarios no técnicos.
 * Versión 2.0: Narrativa positiva para zonas similares, lenguaje simple.
 */
export function construirTextoConfianza(nivel, detalle) {
    const total = detalle?.total_comparables ?? 0;
    const porcentajeReales = detalle?.porcentaje_reales ?? 0;
    const dispersionAlta = !!detalle?.dispersion_alta;
    const esLote = !!detalle?.es_lote;

    // Desglose de fuentes
    const totalVerificados = detalle?.total_portal_verificado ?? 0;
    const totalZonasSimilares = detalle?.total_zona_similar ?? 0;
    const totalEstimaciones = (detalle?.total_estimacion_zona ?? 0) +
        (detalle?.total_promedio_municipal ?? 0);

    // ==========================================
    // PARTE 1: INTRODUCCIÓN (Base de datos)
    // ==========================================
    let parteBase = '';

    if (total === 0) {
        parteBase = 'El sistema realizó un análisis de mercado con información disponible.';
    } else if (totalVerificados > 0 && totalZonasSimilares > 0) {
        parteBase = `El sistema analizó ${total} inmuebles comparables, combinando ${totalVerificados} listados verificados de portales inmobiliarios y ${totalZonasSimilares} propiedades de zonas cercanas con características similares.`;
    } else if (totalVerificados > 0) {
        parteBase = `El sistema analizó ${total} inmuebles comparables verificados en portales inmobiliarios de la zona.`;
    } else if (totalZonasSimilares > 0) {
        parteBase = `El sistema analizó ${total} inmuebles comparables de zonas cercanas con características similares.`;
    } else {
        parteBase = `El sistema analizó ${total} inmuebles comparables basándose en promedios estadísticos del mercado.`;
    }

    // ==========================================
    // PARTE 2: CONTEXTO GEOGRÁFICO
    // ==========================================
    let parteGeografia = '';

    if (esLote && totalZonasSimilares > 0) {
        // Para lotes, ampliar geográficamente es POSITIVO
        parteGeografia = ` Dado que los lotes tienen características de mercado regional, el análisis incluyó municipios cercanos para obtener una perspectiva más completa del valor del suelo en la zona.`;
    } else if (!esLote && totalZonasSimilares > 0 && totalVerificados > 0) {
        // Para propiedades, zonas similares COMPLEMENTAN
        parteGeografia = ` Se complementó la muestra con datos de barrios cercanos para enriquecer el análisis de mercado.`;
    } else if (totalZonasSimilares > 0 && totalVerificados === 0) {
        // Solo zonas similares (neutral)
        parteGeografia = ` Los datos provienen de zonas con características socioeconómicas y urbanas similares.`;
    } else if (totalVerificados > 0 && totalZonasSimilares === 0) {
        // Solo zona objetivo (muy positivo)
        parteGeografia = ` Todos los datos provienen directamente de la zona objetivo, lo que aumenta la precisión del análisis.`;
    }

    // ==========================================
    // PARTE 3: DISPERSIÓN DE PRECIOS
    // ==========================================
    let parteDispersion = '';

    if (dispersionAlta) {
        parteDispersion = ` Los precios muestran variación amplia entre comparables, por lo que el valor debe entenderse como un rango de referencia más que un punto exacto.`;
    } else {
        parteDispersion = ` Los precios son relativamente consistentes entre sí, lo que respalda la estabilidad del valor estimado.`;
    }

    // ==========================================
    // TEXTOS FINALES POR NIVEL
    // ==========================================

    if (nivel === 'Alto') {
        return (
            `**Nivel de confianza ALTO.** ${parteBase}${parteGeografia}${!dispersionAlta ? ' ' + parteDispersion : ''} ` +
            `Este análisis cuenta con una muestra robusta y datos verificables que respaldan con solidez el valor estimado. ` +
            `El reporte puede usarse con confianza como referencia de mercado para decisiones de compra, venta o financiamiento.`
        );
    }

    if (nivel === 'Medio') {
        return (
            `**Nivel de confianza MEDIO.** ${parteBase}${parteGeografia} ${parteDispersion} ` +
            `El análisis es confiable como referencia de mercado y refleja las condiciones actuales del sector. ` +
            `Para decisiones de alto impacto económico (compra definitiva, solicitud de crédito), se recomienda complementar con inspección física y avalúo profesional presencial.`
        );
    }

    // Nivel Bajo
    let razonBajo = '';
    if (totalEstimaciones > total * 0.7) {
        razonBajo = ' La mayoría de datos provienen de promedios estadísticos en lugar de listados específicos verificados.';
    } else if (total < 5) {
        razonBajo = ' La cantidad de inmuebles comparables encontrados es limitada.';
    } else if (dispersionAlta) {
        razonBajo = ' Los precios de los comparables muestran variación significativa.';
    } else {
        razonBajo = ' La disponibilidad de datos verificados en la zona es limitada.';
    }

    return (
        `**Nivel de confianza BAJO.** ${parteBase}${parteGeografia}${razonBajo} ${parteDispersion} ` +
        `Este resultado debe tomarse como una **referencia aproximada** del rango de precios en el mercado. ` +
        `**Se recomienda fuertemente complementar con un avalúo profesional presencial** para decisiones importantes como compra, venta o solicitud de crédito hipotecario.`
    );
}


// ==========================================
// HELPER: Texto corto para badges/UI
// ==========================================
export function getNivelConfianzaLabel(nivel) {
    const labels = {
        'Alto': { text: 'Alta Confiabilidad', color: 'green', icon: '✓' },
        'Medio': { text: 'Confiabilidad Media', color: 'blue', icon: 'ℹ️' },
        'Bajo': { text: 'Referencia Aproximada', color: 'yellow', icon: '⚠️' }
    };
    return labels[nivel] || labels['Medio'];
}


// ==========================================
// HELPER: Recomendaciones específicas
// ==========================================
export function getRecomendacionesPorNivel(nivel, esLote, valorEstimado) {
    const recomendaciones = {
        'Alto': [
            'Este valor puede usarse con confianza para negociaciones.',
            esLote
                ? 'El mercado de lotes en la región muestra comportamiento consistente.'
                : 'Los datos del barrio son sólidos y actualizados.',
            'Recomendamos publicar en el rango sugerido para liquidez óptima.'
        ],
        'Medio': [
            'Este valor es una buena referencia de mercado.',
            'Considere inspección física para ajustar por características específicas.',
            esLote
                ? 'Para lotes, factores como topografía y servicios pueden afectar el valor final.'
                : 'Factores como remodelaciones o vista pueden justificar precio superior.',
            'Para crédito bancario, el banco realizará su propio avalúo.'
        ],
        'Bajo': [
            'Use este valor solo como punto de partida para investigación.',
            '**Recomendamos fuertemente avalúo profesional presencial.**',
            esLote
                ? 'El mercado de lotes en esta zona tiene poca oferta pública, consulte con agentes locales.'
                : 'Consulte con agentes inmobiliarios de la zona para obtener más referencias.',
            'No use este reporte como base única para decisiones financieras importantes.'
        ]
    };

    return recomendaciones[nivel] || recomendaciones['Medio'];
}
