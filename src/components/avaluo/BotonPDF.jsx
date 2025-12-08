import React, { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

const BotonPDF = forwardRef(({ formData }, ref) => {
  const generatePDFMutation = useMutation({
    mutationFn: async (data) => {
      const comparablesData = data.comparables_data || {};
      const esLote = (formData.tipo_inmueble || '').toLowerCase().includes('lote');

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

      // Área
      const area = parseFloat(formData.area_construida || comparablesData.area_construida || 0);

      // ✔ CORRECCIÓN 1: Variables nuevas y contadores consistentes
      const precioM2 =
        comparablesData.precio_m2_final ||
        comparablesData.precio_m2_usado ||
        comparablesData.precio_m2_venta_directa ||
        (valorEstimadoFinal && area ? valorEstimadoFinal / area : 0);

      const defaults = comparablesData.ficha_tecnica_defaults || {};
      const comparables = comparablesData.comparables || [];

      const totalComparables =
        comparablesData.comparables_usados_en_calculo ||
        comparablesData.total_comparables ||
        comparables.length;

      const totalEncontrados = comparablesData.comparables_totales_encontrados;
      const yieldMensual = comparablesData.yield_mensual_mercado;

      const fecha = new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Formateadores
      const formatCurrency = (val) =>
        val ? '$ ' + Math.round(val).toLocaleString('es-CO') : '—';

      const formatNumber = (val) =>
        val ? Math.round(val).toLocaleString('es-CO') : '—';

      // Helper para generar tablas HTML con estilos
      const generateTableHtml = (rows) => {
        if (!rows.length) return '';
        const htmlRows = rows.map((row, i) => {
          const cells = row.split('|').filter(c => c.trim() !== '');
          if (cells.length === 0) return '';
          const tag = i === 0 ? 'th' : 'td';
          const style = i === 0
            ? 'style="background:#F0ECD9; font-weight:600; padding:8px; text-align:left; border-bottom:1px solid #ddd; color:#2C3D37;"'
            : 'style="padding:8px; border-bottom:1px solid #f0f0f0; text-align:center; color:#4F5B55;"';
          const inner = cells.map(c => `<${tag} ${style}>${c.trim()}</${tag}>`).join('');
          return `<tr>${inner}</tr>`;
        }).join('');
        return `
          <div style="overflow-x:auto; margin:15px 0; border:1px solid #E0E5E2; border-radius:8px; background:#fff;">
            <table style="width:100%; border-collapse:collapse; font-size:11px;">
              <tbody>${htmlRows}</tbody>
            </table>
          </div>
        `;
      };

      const formatText = (text) => {
        if (!text) return '';

        // 1. Limpieza Inicial (Artefactos y LaTeX) - Sincronizado con Step3Results
        let cleanText = text
          // Eliminar líneas horizontales MD (reforzado)
          .replace(/^-{3,}\s*$/gm, '')
          .replace(/^[ \t]*[-_]{2,}[ \t]*$/gm, '')
          // Eliminar saltos de línea excesivos
          .replace(/\n{3,}/g, '\n\n')
          // Limpiar LaTeX básico
          .replace(/\\\(/g, '')
          .replace(/\\\)/g, '')
          .replace(/\\\[/g, '')
          .replace(/\\\]/g, '')
          .replace(/\\text\{([^}]+)\}/g, '$1')
          // LaTeX \frac con soporte de espacios
          .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1 / $2')
          .replace(/\\sum/g, '∑')
          .replace(/\\approx/g, '≈')
          // Limpiar unidades duplicadas
          .replace(/\s+COP\/m²/g, ' COP/m²');

        // Normalizar "Promedio precio..."
        cleanText = cleanText.replace(
          /Promedio precio por m²\s*=\s*(?:\\frac\{[^{}]+\}\{[^{}]+\}|[^\n≈]+)\s*≈\s*([\d\.\,]+)\s*COP\/m²/gi,
          'Promedio precio por m² ≈ $1 COP/m²'
        );

        // Limpiar títulos numerados (1. Título → Título)
        cleanText = cleanText.replace(/^[\d\.]+\s+(?=[A-Z])/gm, '');

        // 2. Detectar y Formatear Tablas Markdown
        const lines = cleanText.split('\n');
        let newLines = [];
        let inTable = false;
        let tableRows = [];

        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('|')) {
            if (!inTable) inTable = true;
            if (!trimmed.includes('---')) {
              tableRows.push(trimmed);
            }
          } else {
            if (inTable) {
              newLines.push(generateTableHtml(tableRows));
              tableRows = [];
              inTable = false;
            }
            newLines.push(line);
          }
        });
        if (inTable) {
          newLines.push(generateTableHtml(tableRows));
        }

        cleanText = newLines.join('\n');

        // 3. Convertir markdown a HTML con estilos mejorados
        return cleanText
          // Negritas (asegurar que cierra)
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          // Encabezados MD "# Título" o "#### Título"
          .replace(
            /^#+\s*(.*?)$/gm,
            '<h4 style="font-size:13px; margin:16px 0 8px 0; color:#2C3D37; font-weight:700; border-bottom:1px solid #C9C19D; padding-bottom:4px;">$1</h4>'
          )
          // Listas
          .replace(
            /^\s*[-*•]\s+(.*?)$/gm,
            '<li style="margin-left:18px; font-size:11px; margin-bottom:6px; color:#4F5B55; line-height:1.2;">$1</li>'
          )
          // Párrafos (líneas sueltas que no son tags HTML)
          .replace(
            /^(?!<(h4|li|table|div|strong))(.+)$/gm,
            '<p style="font-size:11px; line-height:1.2; margin:8px 0; text-align:justify; color:#4F5B55;">$2</p>'
          );
      };

      // -----------------------------------------------------------------------------------
      // HTML DEL REPORTE
      // -----------------------------------------------------------------------------------

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Reporte de Avalúo - Quetzal Hábitats</title>

          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Raleway:wght@300;400;500;600&display=swap');

            /* CONFIGURACIÓN DE PÁGINA: Sin headers/footers */
            @page {
              size: auto;
              margin: 15mm;
            }

            body {
              font-family: 'Outfit', sans-serif;
              font-size: 13px;
              margin: 0;
              padding: 0;
              background: white;
              color: #2C3D37;
            }

            .container {
              max-width: 960px;
              margin: 0 auto;
              padding: 0;
            }

            /* --- ESTILOS ORIGINALES CONSERVADOS --- */
            
            .header-logo {
              height: 50px;
              margin-bottom: 15px;
              filter: brightness(0) invert(1);
            }
            .header-title {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 8px;
            }
            .header-subtitle {
              font-size: 14px;
              opacity: 0.9;
            }
            h1 { font-size: 26px; font-weight: 700; margin-bottom: 5px; }
            h2 { font-size: 20px; font-weight: 600; margin: 12px 0 4px; }
            h3 { font-size: 16px; font-weight: 600; margin: 10px 0 6px; }
            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-top: 20px;
            }
            .box {
              background: #F8F6EF;
              padding: 16px;
              border-radius: 12px;
              border: 1px solid #e6e0c7;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .info-section {
              background: #F9FAF9;
              border: 1px solid #E0E5E2;
              border-radius: 12px;
              padding: 20px;
              margin: 25px 0;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
            }
            .info-item {
              display: flex;
              align-items: baseline;
              gap: 8px;
              padding: 2px 0;
              border-bottom: 1px solid #eee;
            }
            .info-item:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 600;
              color: #7A8C85;
              font-size: 12px;
              text-transform: uppercase;
              min-width: 120px;
              font-family: 'Outfit', sans-serif;
            }
            .info-value {
              font-weight: 600;
              color: #2C3D37;
              border-bottom: 1px solid #ddd;
              font-size: 11px;
              line-height: 1.2;
              white-space: normal;
              word-wrap: break-word;
              overflow: visible;
              font-family: 'Outfit', sans-serif;
              vertical-align: middle;
              text-align: center;
            }
            td strong {
              display: block;
              margin-bottom: 2px;
            }
            th { background: #F0ECD9; font-weight: 600; text-align: left; }
            td { vertical-align: top; }
            td.text-center { text-align: center; }
            td.text-right { text-align: right; }
            .badge {
              padding: 3px 7px;
              border-radius: 6px;
              font-size: 10px;
              color: white;
            }
            .badge-venta { background: #4B7F52; }
            .badge-arriendo { background: #2C3D37; }
            .sub-text {
              font-size: 9px;
              color: #888;
              font-family: 'Raleway', sans-serif;
            }

            /* Hero Header Styles */
            .hero-header {
              background: linear-gradient(135deg, #2C3D37 0%, #1a2620 100%);
              color: white;
              border-radius: 16px;
              padding: 32px;
              margin-bottom: 30px;
              position: relative;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0,0,0,0.15);
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .hero-decoration {
              position: absolute;
              top: -20px;
              right: -20px;
              width: 120px;
              height: 120px;
              background: rgba(201, 193, 157, 0.1);
              border-radius: 50%;
              filter: blur(40px);
            }
            .hero-top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
              position: relative;
              z-index: 1;
            }
            .hero-title-section {
              flex: 1;
            }
            .hero-icon-title {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 12px;
            }
            .hero-icon {
              background: rgba(255, 255, 255, 0.1);
              padding: 8px;
              border-radius: 8px;
              font-size: 24px;
              line-height: 1;
            }
            .hero-title {
              font-size: 24px;
              font-weight: 600;
              margin: 0;
            }
            .hero-description {
              font-size: 13px;
              line-height: 1.2;
              opacity: 0.9;
              margin-bottom: 12px;
              margin-top: 2px;
              max-width: 85%; 
              font-weight: 300;
              font-family: 'Raleway', sans-serif;
            }
            .analysis-section {
              background: #F9FAF9;
              border: 1px solid #E0E5E2;
              border-radius: 12px;
              padding: 20px;
              margin: 25px 0;
            }
            .analysis-content {
              column-count: 2;
              column-gap: 30px;
              font-size: 13px;
              line-height: 1.2;
              text-align: justify;
              color: #4F5B55;
              font-family: 'Raleway', sans-serif;
            }
             .analysis-content h4 {
              column-span: all;
              margin: 16px 0 8px 0;
              font-size: 15px;
              color: #2C3D37;
              font-weight: 700;
              font-family: 'Outfit', sans-serif;
            }
             .analysis-content li {
              margin-left: 18px;
              margin-bottom: 6px;
              color: #4F5B55;
              font-family: 'Raleway', sans-serif;
              font-size: 12px;
            }
            .analysis-content p {
              margin-bottom: 12px;
              color: #4F5B55;
              font-family: 'Raleway', sans-serif;
              font-size: 12px;
            }
            .hero-badge {
              background: rgba(201, 193, 157, 0.9);
              color: #1a2620;
              padding: 6px 16px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: 600;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .hero-value-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              gap: 30px;
              margin: 24px 0;
              position: relative;
              z-index: 1;
            }
            .hero-main-value {
              flex: 1;
            }
            .hero-amount {
              font-size: 28px;
              font-weight: 700;
              font-family: 'Outfit', sans-serif;
              line-height: 1;
              margin-bottom: 8px;
            }
            .hero-currency {
              font-size: 12px;
              color: #D3DDD6;
              opacity: 0.8;
            }
            .hero-details-box {
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 12px;
              padding: 14px 18px;
              min-width: 240px;
            }
            .hero-detail-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            .hero-detail-row:last-child {
              border-bottom: none;
            }
            .hero-detail-label {
              color: #D3DDD6;
              font-size: 13px;
            }
            .hero-detail-value {
              font-weight: 600;
              text-align: right;
              font-size: 13px;
            }
            .hero-detail-sub {
              font-size: 10px;
              color: #A3B2AA;
              display: block;
              margin-top: 2px;
            }
            .hero-footer {
              font-size: 11px;
              color: rgba(211, 221, 214, 0.8);
              font-style: italic;
              line-height: 1.2;
              margin-top: 16px;
              position: relative;
              z-index: 1;
            }

            /* Print Styles */
            @media print {
              @page {
                margin: 0;
                size: letter;
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                margin: 0 !important;
                padding: 60px 20mm 60px 20mm !important;
              }

              .analysis-content {
                column-count: 2;
                column-gap: 30px;
              }
              
              .analysis-content p, 
              .analysis-content li {
                break-inside: avoid;
                page-break-inside: avoid;
              }

              .hero-header {
                background: linear-gradient(135deg, #2C3D37 0%, #1a2620 100%) !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .hero-details-box {
                background: rgba(255, 255, 255, 0.1) !important;
                -webkit-print-color-adjust: exact !important;
              }
              .hero-badge {
                background: #C9C19D !important;
                -webkit-print-color-adjust: exact !important;
              }
              .info-section {
                page-break-inside: avoid;
              }
              table {
                page-break-inside: auto;
              }
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              thead {
                display: table-header-group;
              }
            }
            
            /* Analysis Styles */
            .analysis-section {
              margin-top: 30px;
              border-top: 2px solid #E0E5E2;
              padding-top: 20px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .analysis-content h4 {
              color: #2C3D37;
              font-size: 14px;
              margin: 15px 0 8px 0;
            }
             .analysis-content li {
              margin-bottom: 5px;
              font-size: 12px;
              color: #4F5B55;
              font-family: 'Raleway', sans-serif;
            }
            .analysis-content p {
              margin-bottom: 10px;
              font-size: 12px;
              text-align: justify;
              color: #4F5B55;
              font-family: 'Raleway', sans-serif;
            }

            /* Hero Layout Update */
            .hero-content-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 30px;
              margin: 20px 0;
              position: relative;
              z-index: 1;
            }
            .hero-left-col {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .hero-value-block {
              margin-top: auto;
            }
          </style>
        </head>

        <body>


          <div class="container">
            <div class="hero-header">
              <div class="hero-decoration"></div>
              
              <div class="hero-top" style="margin-bottom: 10px;">
                <div class="hero-icon-title">
                  <div class="hero-icon">🏠</div>
                  <h1 class="hero-title">Valor Comercial Estimado</h1>
                </div>
                <div class="hero-badge">⚡ Estimación IA</div>
              </div>
              
              <!-- Property Summary Row -->
              ${!esLote ? `
              <div style="display: flex; gap: 20px; padding: 10px 0; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); position: relative; z-index: 1;">
                <span style="font-size: 14px; color: #D3DDD6;">
                  🏠 ${formData.tipo_inmueble || 'Inmueble'}
                </span>
                <span style="font-size: 14px; color: #D3DDD6;">
                  📐 ${formatNumber(area)} m²
                </span>
                <span style="font-size: 14px; color: #D3DDD6;">
                  🛏️ ${formData.habitaciones || comparablesData.habitaciones || defaults.habitaciones || '—'} hab
                </span>
                <span style="font-size: 14px; color: #D3DDD6;">
                  🚿 ${formData.banos || comparablesData.banos || defaults.banos || '—'} baños
                </span>
              </div>
              ` : `
              <div style="display: flex; gap: 20px; padding: 10px 0; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); position: relative; z-index: 1;">
                <span style="font-size: 14px; color: #D3DDD6;">
                  🏠 ${formData.tipo_inmueble || 'Lote'}
                </span>
                <span style="font-size: 14px; color: #D3DDD6;">
                  📐 ${formatNumber(area)} m²
                </span>
                <span style="font-size: 14px; color: #D3DDD6;">
                  📍 ${formData.uso_lote || 'Uso no especificado'}
                </span>
              </div>
              `}

              <div class="hero-content-row">
                <div class="hero-left-col">
                  <p class="hero-description" style="max-width: 85%;">
                    ${esLote
          ? 'Valor obtenido a partir del análisis de mercado y método residual, sin aplicar enfoque de rentabilidad.'
          : 'Determinación del valor comercial basada en un análisis técnico ponderado que integra el comportamiento real del mercado local y la validación experta de nuestra inteligencia artificial.'}
                  </p>
                  
                  <div class="hero-value-block">
                    <div class="hero-amount">${formatCurrency(valorEstimadoFinal)}</div>
                    <div class="hero-currency">COP (Pesos Colombianos)</div>
                  </div>
                </div>

                <div class="hero-details-box">
                  <div class="hero-detail-row" style="align-items: flex-start;">
                    <span class="hero-detail-label" style="align-self: center;">Rango Sugerido</span>
                    <div style="text-align: right; line-height: 1.4;">
                      <div class="hero-detail-value">${formatCurrency(rangoMin)}</div>
                      <div class="hero-detail-value">${formatCurrency(rangoMax)}</div>
                    </div>
                  </div>
                  <div class="hero-detail-row">
                    <span class="hero-detail-label">Precio m² Ref.</span>
                    <span class="hero-detail-value">${formatCurrency(precioM2)}/m²</span>
                  </div>
                  ${totalComparables ? `
                  <div class="hero-detail-row">
                    <span class="hero-detail-label">Muestra</span>
                    <span class="hero-detail-value">
                      ${totalComparables} inmuebles
                      ${totalEncontrados && totalEncontrados > totalComparables
            ? `<span class="hero-detail-sub">(de ${totalEncontrados} encontrados)</span>`
            : `<span class="hero-detail-sub">(${comparablesData.total_comparables_venta || 0} venta, ${comparablesData.total_comparables_arriendo || 0} arriendo)</span>`
          }
                    </span>
                  </div>
                  ` : ''}
                </div>
              </div>

              <div class="hero-footer">
                El valor final es una recomendación técnica ponderada entre el enfoque de mercado
                y el de rentabilidad, priorizando el método con datos más consistentes según la
                cantidad, homogeneidad y dispersión de los comparables disponibles.
              </div>
            </div>

            <div class="grid-2">
              <div class="box">
                <h3>${esLote ? 'Metodología Ajustada (Lotes)' : 'Enfoque de Mercado'}</h3>
                <p style="font-size: 22px; font-weight: 700;">
                  ${formatCurrency(valorVentaDirecta)}
                </p>
                <p style="font-size: 11px; margin-top: 8px;">
                  ${esLote
          ? 'Calculado a partir del precio promedio por m² de lotes comparables y ajuste residual.'
          : 'Basado en precio promedio por m² × área construida.'}
                </p>
              </div>

              ${valorRentabilidad ? `
              <div class="box">
                <h3>Enfoque de Rentabilidad</h3>
                <p style="font-size: 22px; font-weight: 700;">
                  ${formatCurrency(valorRentabilidad)}
                </p>
                <p style="font-size: 11px; margin-top: 8px;">
                  Canon mensual estimado ÷ yield mensual del sector.
                </p>
                ${yieldMensual ? `
                <p style="font-size: 10px; color: #7A8C85; font-style: italic; margin-top: 8px;">
                  Yield utilizado: ${(yieldMensual * 100).toFixed(2)}% mensual
                </p>
                ` : ''}
              </div>
              ` : ''}
            </div>

            <div class="info-section">
              <h3 style="margin-top: 0; color: #2C3D37; border-bottom: 2px solid #C9C19D; padding-bottom: 8px;">Información Detallada</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Tipo de Inmueble:</span>
                  <span class="info-value">${formData.tipo_inmueble || '—'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Ubicación:</span>
                  <span class="info-value">${formData.barrio || '—'}, ${formData.municipio || formData.ciudad || '—'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Área Construida:</span>
                  <span class="info-value">${formatNumber(area)} m²</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Precio por m²:</span>
                  <span class="info-value">${formatCurrency(precioM2)}/m²</span>
                </div>
                ${!esLote ? `
                <div class="info-item">
                  <span class="info-label">Habitaciones:</span>
                  <span class="info-value">${formData.habitaciones || comparablesData.habitaciones || defaults.habitaciones || '—'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Baños:</span>
                  <span class="info-value">${formData.banos || comparablesData.banos || defaults.banos || '—'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Estrato:</span>
                  <span class="info-value">${formData.estrato || comparablesData.estrato || defaults.estrato || 'No especificado'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Estado:</span>
                  <span class="info-value" style="text-transform: capitalize;">
                    ${(() => {
            const estado = formData.estado_inmueble || formData.estado ||
              comparablesData.estado_inmueble || comparablesData.estado ||
              defaults.estado_inmueble || defaults.estado;
            return estado ? estado.replace(/_/g, ' ') : '—';
          })()}
                  </span>
                </div>
                ` : `
                <div class="info-item">
                  <span class="info-label">Uso del Lote:</span>
                  <span class="info-value">${formData.uso_lote || '—'}</span>
                </div>
                `}
                <div class="info-item">
                  <span class="info-label">Comparables:</span>
                  <span class="info-value">${totalComparables} inmuebles</span>
                </div>
                ${!esLote && yieldMensual ? `
                <div class="info-item">
                  <span class="info-label">Yield Mensual:</span>
                  <span class="info-value">${(yieldMensual * 100).toFixed(2)}%</span>
                </div>
                ` : ''}
              </div>
            </div>

            <!-- ANÁLISIS DETALLADO DEL MODELO -->
            ${comparablesData.perplexity_full_text ? `
            <div class="analysis-section">
              <h3 style="color: #2C3D37; border-bottom: 2px solid #C9C19D; padding-bottom: 8px;">Análisis Detallado del Modelo</h3>
              <div class="analysis-content">
                ${formatText(comparablesData.perplexity_full_text)}
              </div>
            </div>
            ` : ''}

            <!-- Tabla de comparables -->
            <h2 style="margin-top: 30px;">Propiedades Comparables</h2>

            <table>
              <thead>
                <tr>
                  <th style="text-align:center; vertical-align:middle; min-width: 180px;">Inmueble</th>
                  <th style="text-align:center; vertical-align:middle;">Tipo</th>
                  <th style="text-align:center; vertical-align:middle;">Área</th>
                  <th style="text-align:center; vertical-align:middle; max-width: 50px;">Hab/<br>Baños</th>
                  <th style="text-align:center; vertical-align:middle; min-width: 135px;">Precio Publicado</th>
                  <th style="text-align:center; vertical-align:middle; min-width: 135px;">Precio de Venta</th>
                  <th style="text-align:center; vertical-align:middle; min-width: 130px;">Precio m²</th>
                </tr>
              </thead>

              <tbody>
                ${(comparables || []).map(item => {
            const esArriendo = item.tipo_origen === 'arriendo';
            const badgeClass = esArriendo ? 'badge-arriendo' : 'badge-venta';
            const tipoLabel = esArriendo ? 'Arriendo' : 'Venta';
            const notaArriendo = esArriendo
              ? `<span class="sub-text">Estimado por rentabilidad (Yield ${(item.yield_mensual * 100).toFixed(2)}%)</span>`
              : '';

            return `
                    <tr>
                      <td style="text-align:left;">
                        <strong style="display:block; margin-bottom:2px;">${item.titulo || 'Inmueble'}</strong>
                        <span class="sub-text">${item.barrio || ''}, ${item.municipio || ''}</span>
                      </td>
                      <td style="text-align:center;"><span class="badge ${badgeClass}">${tipoLabel}</span></td>
                      <td style="text-align:center;">${formatNumber(item.area_m2)} m²</td>
                      <td style="text-align:center; white-space: nowrap;">
                        ${item.habitaciones || '—'} / ${item.banos || '—'}
                      </td>
                      <td style="text-align:right;">${formatCurrency(item.precio_publicado)}${esArriendo ? '<br><span class="sub-text">/mes</span>' : ''}</td>
                      <td style="text-align:right;">
                        <strong>${formatCurrency(item.precio_cop)}</strong>
                        ${notaArriendo}
                      </td>
                      <td style="text-align:right;">
                        ${formatCurrency(item.precio_m2)}
                      </td>
                    </tr>
                  `;
          }).join('')}
              </tbody>
            </table>

            <!-- ✔ CORRECCIÓN 3: Nota sobre Yield -->
            <p style="font-size: 10px; color: #666; margin-top: 15px; font-style: italic;">
              Yield mensual utilizado: ${yieldMensual ? (yieldMensual * 100).toFixed(2) + '%' : '0.5%'}.
              Este yield corresponde al promedio observado en arriendos residenciales del mercado local.
            </p>

            ${esLote ? `
              <p style="font-size: 10px; color: #888; margin-top: 15px; font-style: italic; text-align: justify;">
                Nota: Ante la escasez de oferta comercial idéntica, se han utilizado lotes campestres y urbanos como referencia base, ajustando sus valores por factores de localización, escala y uso comercial. Se aplicó ajuste por factor de comercialización.
              </p>
            ` : ''}

          </div>
        </body>
        </html>
      `;

      // Abrir PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.document.title = 'Reporte de Avalúo - Quetzal Hábitats';

        // Esperar a que las fuentes se carguen antes de imprimir
        setTimeout(() => {
          printWindow.print();
        }, 1500); // Aumentado de 800ms a 1500ms para asegurar carga de Google Fonts
      }

      return { success: true };
    }
  });

  return (
    <Button
      ref={ref}
      onClick={() => generatePDFMutation.mutate(formData)}
      disabled={generatePDFMutation.isPending}
      className="flex-1 bg-[#C9C19D] hover:bg-[#b8b08c] text-[#2C3D37] rounded-full py-6 text-lg font-medium"
    >
      {generatePDFMutation.isPending ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Generando PDF...
        </>
      ) : (
        <>
          <Download className="w-5 h-5 mr-2" />
          Descargar Reporte PDF
        </>
      )}
    </Button>
  );
});

BotonPDF.displayName = 'BotonPDF';

export default BotonPDF;