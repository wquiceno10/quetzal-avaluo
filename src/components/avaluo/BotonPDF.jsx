import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

export default function BotonPDF({ formData }) {
  const generatePDFMutation = useMutation({
    mutationFn: async (data) => {
      const comparablesData = data.comparables_data || {};
      const esLote = (formData.tipo_inmueble || '').toLowerCase().includes('lote');

      // Valores de backend
      const valorVentaDirecta = comparablesData.valor_estimado_venta_directa;
      const valorRentabilidad = comparablesData.valor_estimado_rentabilidad;
      const rangoMin = comparablesData.rango_valor_min;
      const rangoMax = comparablesData.rango_valor_max;

      let valorEstimadoFinal = comparablesData.valor_final;
      if (!valorEstimadoFinal) {
        if (rangoMin && rangoMax) {
          valorEstimadoFinal = (rangoMin + rangoMax) / 2;
        } else if (valorVentaDirecta && valorRentabilidad) {
          valorEstimadoFinal = valorVentaDirecta * 0.8 + valorRentabilidad * 0.2;
        } else {
          valorEstimadoFinal = valorVentaDirecta || valorRentabilidad || 0;
        }
      }

      const area = parseFloat(
        formData.area_construida ||
        comparablesData.area_construida ||
        0
      );

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

      const totalEncontrados =
        comparablesData.comparables_totales_encontrados || totalComparables;

      const yieldMensual = comparablesData.yield_mensual_mercado;

      const fecha = new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const formatCurrency = (val) =>
        val ? '$ ' + Math.round(val).toLocaleString('es-CO') : '—';

      const formatNumber = (val) =>
        val ? Math.round(val).toLocaleString('es-CO') : '—';

      // ---------- Limpieza y formateo del análisis Perplexity ----------

      const generateTableHtml = (rows) => {
        if (!rows.length) return '';
        const htmlRows = rows.map((row, i) => {
          const cells = row.split('|').filter((c) => c.trim() !== '');
          if (cells.length === 0) return '';
          const tag = i === 0 ? 'th' : 'td';
          const rowHtml = cells
            .map((cell) => `<${tag}>${cell.trim()}</${tag}>`)
            .join('');
          return `<tr>${rowHtml}</tr>`;
        });
        return `
          <table>
            <tbody>
              ${htmlRows.join('')}
            </tbody>
          </table>
        `;
      };

      const formatText = (text) => {
        if (!text) return '';

        // 1. Limpieza Inicial (Artefactos y LaTeX)
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

        // 2. Procesar tablas markdown
        const lines = cleanText.split('\n');
        const processedLines = [];
        let currentTable = [];

        const flushTable = () => {
          if (currentTable.length > 0) {
            processedLines.push(generateTableHtml(currentTable));
            currentTable.length = 0;
          }
        };

        for (const line of lines) {
          const trimmed = line.trim();

          // Detectar fila de tabla | a | b |
          if (
            trimmed.startsWith('|') &&
            trimmed.endsWith('|') &&
            trimmed.includes('|')
          ) {
            currentTable.push(trimmed);
          } else if (
            currentTable.length > 0 &&
            /^[-|:\s]+$/.test(trimmed)
          ) {
            continue; // fila separadora de markdown
          } else {
            flushTable();
            // Limpieza de títulos con puntos/números "1. Título" o ". Título"
            let msgLine = line;
            // Regex detecta inicio de línea con num/punto seguidos de Texto Mayuscula
            if (/^[ \t]*[\d\.]+[ \t]+(?=[A-ZÀ-ÿ])/.test(msgLine)) {
              msgLine = msgLine.replace(/^[ \t]*[\d\.]+[ \t]+/, '');
              // Forzamos que sea un título si parece importante
              if (msgLine.length < 50) msgLine = `#### ${msgLine}`;
            }

            processedLines.push(msgLine);
          }
        }
        flushTable();

        cleanText = processedLines.join('\n');

        // 3. Convertir markdown a HTML simple
        return cleanText
          // Negritas (asegurar que cierra)
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          // Encabezados MD "# Título" o "#### Título"
          .replace(
            /^#+\s*(.*?)$/gm,
            '<h4 style="font-size: 13px; margin: 16px 0 4px 0; color: #2C3D37; font-weight:700;">$1</h4>'
          )
          // Listas
          .replace(
            /^\s*[-*•]\s+(.*?)$/gm,
            '<li style="margin-left: 18px; font-size: 11px; margin-bottom: 2px;">$1</li>'
          )
          // Párrafos (líneas sueltas que no son tags HTML)
          .replace(
            /^(?!<(h4|li|table|div))(.+)$/gm,
            '<p style="font-size: 11px; line-height: 1.5; margin: 4px 0; text-align: justify;">$1</p>'
          );
      };

      // ---------- HTML PDF ----------

      const htmlContent = `
        <html>
        <head>
          <meta charSet="utf-8" />
          <title>Reporte de Avalúo - Quetzal Hábitats</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 24px;
              font-family: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: #F3F4F0;
              color: #2C3D37;
            }
            .container {
              max-width: 900px;
              margin: 0 auto;
              background: #FFFFFF;
              border-radius: 16px;
              padding: 32px;
              box-shadow: 0 12px 30px rgba(0,0,0,0.08);
            }
            h1, h2, h3, h4 {
              margin: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 24px;
            }
            .logo-block {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .logo-title {
              font-size: 20px;
              font-weight: 600;
            }
            .logo-subtitle {
              font-size: 12px;
              color: #7A8C85;
            }
            .date {
              font-size: 11px;
              color: #7A8C85;
            }
            .hero-header {
              background: linear-gradient(135deg, #2C3D37 0%, #1a2620 100%);
              color: white;
              border-radius: 16px;
              padding: 32px;
              margin-bottom: 30px;
              position: relative;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            }
            .hero-decoration {
              position: absolute;
              top: -20px;
              right: -20px;
              width: 120px;
              height: 120px;
              background: rgba(201,193,157,0.1);
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
            .hero-title-section { flex: 1; }
            .hero-icon-title {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 12px;
            }
            .hero-icon {
              background: rgba(255,255,255,0.1);
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
              font-size: 14px;
              line-height: 1.4;
              opacity: 0.9;
              max-width: 90%;
              font-weight: 300;
              margin: 0;
            }
            .hero-main {
              display: flex;
              gap: 24px;
              position: relative;
              z-index: 1;
            }
            .value-card {
              background: #FFFFFF;
              color: #2C3D37;
              border-radius: 14px;
              padding: 18px 20px;
              min-width: 220px;
            }
            .value-label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: #7A8C85;
              margin-bottom: 6px;
            }
            .value-amount {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .value-range {
              font-size: 11px;
              color: #4b7f52;
            }
            .value-badge {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              margin-top: 8px;
              font-size: 10px;
              padding: 4px 8px;
              border-radius: 999px;
              background: rgba(44,61,55,0.08);
            }
            .value-badge span {
              font-weight: 500;
            }
            .hero-side {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .mini-summary {
              font-size: 11px;
              line-height: 1.5;
              opacity: 0.9;
            }
            .pill-row {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
            }
            .pill {
              font-size: 10px;
              padding: 4px 10px;
              border-radius: 999px;
              background: rgba(255,255,255,0.08);
            }
            .section {
              margin-bottom: 24px;
            }
            .section-title {
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 8px;
              color: #2C3D37;
            }
            .section-sub {
              font-size: 11px;
              color: #7A8C85;
              margin-bottom: 4px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 8px 24px;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #E2E4DD;
              padding-bottom: 4px;
              font-size: 11px;
            }
            .info-item:last-child { border-bottom: none; }
            .info-label {
              font-weight: 600;
              color: #7A8C85;
              font-size: 10px;
              text-transform: uppercase;
              min-width: 120px;
            }
            .info-value {
              font-weight: 600;
              color: #2C3D37;
              font-size: 11px;
            }
            .sub-text {
              font-size: 9px;
              color: #777;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th, td {
              padding: 8px;
              border-bottom: 1px solid #ddd;
              font-size: 11px;
            }
            th {
              background: #F0ECD9;
              font-weight: 600;
            }
            .badge {
              padding: 3px 7px;
              border-radius: 6px;
              font-size: 10px;
              color: #fff;
            }
            .badge-venta { background: #4B7F52; }
            .badge-arriendo { background: #2C3D37; }
            .analysis-section {
              background: #F9FAF9;
              border-radius: 14px;
              padding: 20px;
              margin-top: 24px;
              border: 1px solid #E2E4DD;
            }
            .analysis-content {
              font-size: 11px;
              line-height: 1.5;
              color: #37474f;
            }
            .footer {
              margin-top: 40px;
              font-size: 10px;
              text-align: center;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-block">
                <div class="logo-title">Quetzal Hábitats</div>
                <div class="logo-subtitle">Inteligencia Inmobiliaria</div>
              </div>
              <div class="date">Generado el ${fecha}</div>
            </div>

            <div class="hero-header">
              <div class="hero-decoration"></div>
              <div class="hero-top">
                <div class="hero-title-section">
                  <div class="hero-icon-title">
                    <div class="hero-icon">🦜</div>
                    <div>
                      <h1 class="hero-title">Valor Comercial Estimado</h1>
                      <p class="hero-description">
                        Determinación del valor comercial basada en un análisis técnico
                        ponderado del mercado local y la validación experta de la IA.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="hero-main">
                <div class="value-card">
                  <div class="value-label">Estimación IA</div>
                  <div class="value-amount">${formatCurrency(valorEstimadoFinal)}</div>
                  <div class="value-range">
                    Rango sugerido: ${formatCurrency(rangoMin)} - ${formatCurrency(
        rangoMax
      )}
                  </div>
                  <div style="margin-top: 10px; font-size: 10px; color: #555;">
                    Precio m² Ref.: <strong>${formatCurrency(precioM2)}/m²</strong>
                  </div>
                  <div class="value-badge">
                    <span>⚡ Estimación técnica ponderada</span>
                  </div>
                </div>

                <div class="hero-side">
                  <div class="section-sub">Información del inmueble analizado</div>
                  <div class="mini-summary">
                    <strong>${formData.tipo_inmueble || comparablesData.tipo_inmueble || 'Inmueble'}</strong><br/>
                    ${formData.barrio || comparablesData.barrio || ''}, ${formData.municipio || comparablesData.municipio || ''
        }<br/>
                    Área construida: <strong>${formatNumber(area)} m²</strong>.
                  </div>
                  <div class="pill-row">
                    <div class="pill">
                      ${totalComparables} comparables usados (de ${totalEncontrados} encontrados)
                    </div>
                    ${!esLote && yieldMensual
          ? `<div class="pill">
                             Yield mensual de referencia: ${(yieldMensual * 100).toFixed(2)}%
                           </div>`
          : ''
        }
                  </div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Información Detallada</div>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Tipo de Inmueble:</span>
                  <span class="info-value">${formData.tipo_inmueble || comparablesData.tipo_inmueble || '—'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Ubicación:</span>
                  <span class="info-value">${formData.barrio || comparablesData.barrio || '—'}, ${formData.municipio || comparablesData.municipio || '—'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Área Construida:</span>
                  <span class="info-value">${formatNumber(area)} m²</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Precio por m²:</span>
                  <span class="info-value">${formatCurrency(precioM2)}/m²</span>
                </div>
                ${!esLote
          ? `
                <div class="info-item">
                  <span class="info-label">Habitaciones:</span>
                  <span class="info-value">${formData.habitaciones || comparablesData.habitaciones || defaults.habitaciones || 'No especificado'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Baños:</span>
                  <span class="info-value">${formData.banos || comparablesData.banos || defaults.banos || 'No especificado'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Estrato:</span>
                  <span class="info-value">${formData.estrato || comparablesData.estrato || defaults.estrato || 'No especificado'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Estado:</span>
                  <span class="info-value" style="text-transform: capitalize;">
                    ${(formData.estado_inmueble || formData.estado || comparablesData.estado_inmueble || comparablesData.estado || defaults.estado_inmueble || defaults.estrato || '—').replace(/_/g, ' ')}
                  </span>
                </div>
                `
          : `
                <div class="info-item">
                  <span class="info-label">Uso del Lote:</span>
                  <span class="info-value">${formData.uso_lote || '—'}</span>
                </div>
                `
        }
                <div class="info-item">
                  <span class="info-label">Comparables:</span>
                  <span class="info-value">${totalComparables} inmuebles</span>
                </div>
                ${!esLote && yieldMensual
          ? `
                <div class="info-item">
                  <span class="info-label">Yield Mensual:</span>
                  <span class="info-value">${(yieldMensual * 100).toFixed(2)}%</span>
                </div>
                `
          : ''
        }
              </div>
            </div>

            <h2 style="margin-top: 30px;">Propiedades Comparables</h2>
            <table>
              <thead>
                <tr>
                  <th>Inmueble</th>
                  <th>Tipo</th>
                  <th>Área</th>
                  <th>Precio Publicado</th>
                  <th>Precio de Venta</th>
                  <th>Precio m²</th>
                </tr>
              </thead>
              <tbody>
                ${(comparables || [])
          .map((item) => {
            const esArriendo = item.tipo_origen === 'arriendo';
            const badgeClass = esArriendo ? 'badge-arriendo' : 'badge-venta';
            const tipoLabel = esArriendo ? 'Arriendo' : 'Venta';
            const notaArriendo = esArriendo
              ? `<span class="sub-text">Estimado por rentabilidad (Yield ${(item.yield_mensual * 100).toFixed(2)}%)</span>`
              : '';

            return `
                      <tr>
                        <td>
                          <strong>${item.titulo || 'Inmueble'}</strong><br/>
                          <span class="sub-text">${item.barrio || ''}, ${item.municipio || ''}</span>
                        </td>
                        <td><span class="badge ${badgeClass}">${tipoLabel}</span></td>
                        <td class="text-center">${formatNumber(item.area_m2)} m²</td>
                        <td class="text-right">${formatCurrency(item.precio_publicado)} ${esArriendo ? '<span class="sub-text">/mes</span>' : ''
              }</td>
                        <td class="text-right">
                          <strong>${formatCurrency(item.precio_cop)}</strong>
                          ${notaArriendo}
                        </td>
                        <td class="text-right">${formatCurrency(item.precio_m2)}</td>
                      </tr>
                    `;
          })
          .join('')}
              </tbody>
            </table>

            <p style="font-size: 10px; color: #666; margin-top: 15px; font-style: italic;">
              Yield mensual utilizado: ${yieldMensual ? (yieldMensual * 100).toFixed(2) + '%' : '0.45%'
        }. Este yield corresponde al promedio observado en arriendos residenciales del mercado local.
            </p>

            ${esLote
          ? `
            <p style="font-size: 10px; color: #888; margin-top: 15px; font-style: italic; text-align: justify;">
              Nota: Ante la escasez de oferta comercial idéntica, se han utilizado lotes campestres y urbanos como referencia base, ajustando sus valores por factores de localización, escala y uso comercial. Se aplicó ajuste por factor de comercialización.
            </p>
            `
          : ''
        }

            ${comparablesData.perplexity_full_text
          ? `
            <div class="analysis-section">
              <h3 style="color: #2C3D37; border-bottom: 2px solid #C9C19D; padding-bottom: 8px; margin-top: 0;">
                Análisis Detallado del Modelo
              </h3>
              <div class="analysis-content">
                ${formatText(comparablesData.perplexity_full_text)}
              </div>
            </div>
            `
          : ''
        }

            <div class="footer">
              <p>Quetzal Hábitats - Inteligencia Inmobiliaria</p>
              <p>Este documento es una estimación estadística y no constituye un avalúo certificado.</p>
              <p>Generado el ${fecha}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 800);
      }

      return { success: true };
    },
  });

  return (
    <Button
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
}