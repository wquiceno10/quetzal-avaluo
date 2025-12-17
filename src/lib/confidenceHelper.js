/**
 * Genera información de confianza para UI.
 * Versión 4.0: NO recalcula el nivel. Usa el nivel del Worker como fuente de verdad.
 */
export function construirTextoConfianza(data, totalEncontrados, totalComparables) {
    // ═══ PASO 1: Leer nivel del Worker (fuente de verdad) ═══
    const nivelWorker = data?.nivel_confianza || 'Bajo'; // 'Alto' | 'Medio' | 'Bajo'

    // Normalizar a mayúsculas para consistencia interna
    const nivel = nivelWorker.toUpperCase(); // 'ALTO' | 'MEDIO' | 'BAJO'

    // ═══ PASO 2: Leer metadatos del Worker ═══
    const detalle = data?.nivel_confianza_detalle || {};
    const stats = data?.estadisticas_fuentes || {};

    const total = totalComparables || data?.total_comparables || 0;
    const totalVerificados = detalle.total_coincidencia ?? stats.total_coincidencia ?? 0;
    const totalZonasSimilares = (detalle.total_zona_similar ?? stats.total_zona_similar ?? 0) + (detalle.total_verificado ?? stats.total_verificado ?? 0);
    const dispersionAlta = detalle.dispersion_alta ?? false;
    const esLote = detalle.es_lote ?? (data?.tipo_inmueble || '').toLowerCase().includes('lote');

    // ═══ PASO 3: Construir razones descriptivas (NO decisivas) ═══
    const razones = [];

    // Razón 1: Base de datos y distribución geográfica
    if (total === 0) {
        razones.push('El sistema realizó un análisis de mercado con información disponible.');
    } else if (totalVerificados > 0 && totalZonasSimilares > 0) {
        // Caso mixto: algunos en zona exacta, otros en zonas cercanas
        const porcentajeZonaExacta = Math.round((totalVerificados / total) * 100);

        razones.push(`Se analizaron ${total} inmuebles comparables en ${esLote ? 'Filandia y zonas cercanas' : 'la zona y barrios vecinos'}.`);

        if (porcentajeZonaExacta < 50) {
            razones.push(`Solo ${totalVerificados} comparables coinciden exactamente con la ubicación; los demás provienen de ${esLote ? 'municipios similares' : 'zonas similares'}, lo que amplía la muestra.`);
        } else {
            razones.push(`La mayoría (${porcentajeZonaExacta}%) coinciden exactamente con la ubicación objetivo, complementados con datos de zonas similares.`);
        }
    } else if (totalVerificados > 0) {
        razones.push(`Se analizaron ${total} comparables que COINCIDEN exactamente con la ubicación objetivo.`);
        razones.push('Todos los datos provienen del mismo barrio/sector, garantizando máxima precisión local.');
    } else if (totalZonasSimilares > 0) {
        razones.push(`Se analizaron ${total} comparables de zonas similares verificadas.`);
        razones.push(esLote
            ? 'Debido a la escasez en la ubicación exacta, se incluyeron lotes de municipios cercanos con características homólogas.'
            : 'La muestra se basa en barrios vecinos con dinámica de precios similar.');
    } else {
        razones.push(`Se analizaron ${total} comparables de zonas extendidas con perfil socioeconómico similar.`);
    }

    // Razón 2: Dispersión de precios (más específica)
    if (dispersionAlta) {
        const cvDispersion = detalle.cv_dispersion ?? 0;
        const porcentajeDispersion = Math.round(cvDispersion * 100);

        if (porcentajeDispersion > 100) {
            razones.push(`Los precios muestran variación muy alta (${porcentajeDispersion}%), indicando un mercado heterogéneo. El valor debe entenderse como rango amplio de referencia.`);
        } else {
            razones.push('Los precios muestran variación amplia, por lo que el valor debe entenderse como un rango de referencia.');
        }
    } else {
        razones.push('Los precios son relativamente consistentes entre sí, lo que respalda la estabilidad del valor estimado.');
    }

    // Razón 3: Recomendación según nivel (más específica)
    if (nivel === 'ALTO') {
        razones.push('Este análisis cuenta con una muestra robusta y puede usarse con confianza como referencia de mercado.');
    } else if (nivel === 'MEDIO') {
        razones.push('El análisis es confiable como referencia. Para decisiones de alto impacto, se recomienda complementar con avalúo profesional presencial.');
    } else {
        // Nivel BAJO: ser más específico sobre las limitaciones
        if (esLote && totalZonasSimilares > totalVerificados) {
            razones.push('Debido a la escasez de lotes grandes en la zona y la alta dispersión de precios, este resultado es una aproximación inicial. Se recomienda fuertemente avalúo profesional presencial para confirmar valor de construcciones y características del terreno.');
        } else if (dispersionAlta) {
            razones.push('Debido a la alta variación de precios en el mercado, este resultado debe tomarse como referencia aproximada. Se recomienda avalúo profesional presencial para mayor precisión.');
        } else {
            razones.push('Este resultado debe tomarse como referencia aproximada. Se recomienda fuertemente complementar con avalúo profesional presencial.');
        }
    }

    // ═══ PASO 4: Mapeo de etiquetas ═══
    const labels = {
        'ALTO': 'Alta solidez de datos',
        'MEDIO': 'Solidez intermedia de datos',
        'BAJO': 'Solidez limitada de datos'
    };

    return {
        nivel,
        label: labels[nivel] || labels['BAJO'],
        razones
    };
}


// ==========================================
// HELPER: Texto corto para badges/UI
// ==========================================
export function getNivelConfianzaLabel(nivel) {
    const labels = {
        'ALTO': { text: 'Alta Confiabilidad', color: 'green', icon: '✓' },
        'MEDIO': { text: 'Confiabilidad Media', color: 'blue', icon: 'ℹ️' },
        'BAJO': { text: 'Referencia Aproximada', color: 'yellow', icon: '⚠️' }
    };
    return labels[nivel] || labels['MEDIO'];
}


// ==========================================
// HELPER: Recomendaciones específicas
// ==========================================
export function getRecomendacionesPorNivel(nivel, esLote, valorEstimado) {
    const recomendaciones = {
        'ALTO': [
            'Este valor puede usarse con confianza para negociaciones.',
            esLote
                ? 'El mercado de lotes en la región muestra comportamiento consistente.'
                : 'Los datos del barrio son sólidos y actualizados.',
            'Recomendamos publicar en el rango sugerido para liquidez óptima.'
        ],
        'MEDIO': [
            'Este valor es una buena referencia de mercado.',
            'Considere inspección física para ajustar por características específicas.',
            esLote
                ? 'Para lotes, factores como topografía y servicios pueden afectar el valor final.'
                : 'Factores como remodelaciones o vista pueden justificar precio superior.',
            'Para crédito bancario, el banco realizará su propio avalúo.'
        ],
        'BAJO': [
            'Use este valor solo como punto de partida para investigación.',
            '**Recomendamos fuertemente avalúo profesional presencial.**',
            esLote
                ? 'El mercado de lotes en esta zona tiene poca oferta pública, consulte con agentes locales.'
                : 'Consulte con agentes inmobiliarios de la zona para obtener más referencias.',
            'No use este reporte como base única para decisiones financieras importantes.'
        ]
    };

    return recomendaciones[nivel] || recomendaciones['MEDIO'];
}
