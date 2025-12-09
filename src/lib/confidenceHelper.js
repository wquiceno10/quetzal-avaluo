/**
 * Genera una explicación clara y comprensible del nivel de confianza
 * del análisis inmobiliario para usuarios no técnicos.
 * 
 * @param {string} nivel - "Alto", "Medio" o "Bajo"
 * @param {Object} detalle - Objeto con detalles del cálculo
 * @returns {string} Explicación en lenguaje natural
 */
export function construirTextoConfianza(nivel, detalle) {
    const total = detalle?.total_comparables ?? null;
    const porcentajeReales = detalle?.porcentaje_reales ?? null;
    const zonasAlt = detalle?.total_zonas_alternativas ?? 0;
    const dispersionAlta = !!detalle?.dispersion_alta;

    const parteBase = (() => {
        if (!total) {
            return 'El sistema realizó un análisis de mercado con la información disponible en portales inmobiliarios y zonas similares.';
        }
        if (porcentajeReales != null) {
            return `El sistema analizó ${total} inmuebles comparables, de los cuales aproximadamente el ${porcentajeReales}% proviene de portales inmobiliarios verificados.`;
        }
        return `El sistema analizó ${total} inmuebles comparables de la zona y barrios similares.`;
    })();

    const parteZonas = zonasAlt > 0
        ? ` Para complementar la muestra se usaron también datos estimados de zonas similares, lo que puede introducir algo más de variación en los resultados.`
        : ` La mayoría de los datos proviene directamente de la zona objetivo, sin depender de estimaciones de otras zonas.`;

    const parteDispersion = dispersionAlta
        ? ` Los precios por metro cuadrado muestran una variación amplia entre sí, por lo que el valor debe entenderse como una referencia de rango más que como un punto exacto.`
        : ` Los precios por metro cuadrado son relativamente consistentes entre sí, lo que respalda la estabilidad del valor estimado.`;

    if (nivel === 'Alto') {
        return (
            'Nivel de confianza ALTO. ' +
            parteBase +
            parteZonas +
            (!dispersionAlta ? ' ' + parteDispersion : '')
        );
    }

    if (nivel === 'Medio') {
        return (
            'Nivel de confianza MEDIO. ' +
            parteBase +
            parteZonas +
            ' ' +
            parteDispersion
        );
    }

    // Bajo
    return (
        'Nivel de confianza BAJO. ' +
        parteBase +
        ' Debido a la cantidad limitada de inmuebles comparables y/o a la variación alta entre sus precios, este resultado debe tomarse como una referencia aproximada. ' +
        'Si vas a tomar decisiones importantes (compra, venta o solicitud de crédito), se recomienda complementar este informe con un avalúo profesional presencial.'
    );
}
