import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

export default function BotonPDF({ formData }) {
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

      const formatText = (text) => {
        if (!text) return '';
        return text
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/^#+\s*(.*?)$/gm, '<h4>$1</h4>')
          .replace(/^\s*[-*•]\s+(.*?)$/gm, '<li style="margin-bottom: 4px;">$1</li>')
          .replace(/\n\n/g, '<br><br>')
          .replace(/\n/g, '<br>');
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

            body {
              font-family: 'Outfit', sans-serif;
              margin: 0;
              padding: 0;
              background: white;
              color: #2C3D37;
            }
            .container {
              max-width: 960px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            @media (max-width: 1024px) {
              .container {
                max-width: 768px;
              }
            }
            @media (max-width: 768px) {
              .container {
                max-width: 100%;
                padding: 20px 15px;
              }
            }
            .header {
              background: #2C3D37;
              padding: 30px;
              text-align: center;
              margin: -40px -20px 30px -20px;
              color: white;
            }
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
            }
            .info-section {
              background: #F9FAF9;
              border: 1px solid #E0E5E2;
              border-radius: 12px;
              padding: 20px;
              margin: 25px 0;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-top: 15px;
            }
            .info-item {
              padding: 10px;
              background: white;
              border-radius: 8px;
              border: 1px solid #E0E5E2;
            }
            .info-label {
              font-size: 10px;
              color: #7A8C85;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .info-value {
              font-size: 14px;
              color: #2C3D37;
              font-weight: 600;
            }
            .footer {
              margin-top: 40px;
              font-size: 10px;
              text-align: center;
              color: #666;
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
            th { background: #F0ECD9; font-weight: 600; }
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
              color: #777;
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
              color: #D3DDD6;
              line-height: 1.5;
              max-width: 600px;
              margin: 0;
              font-family: 'Raleway', sans-serif;
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
              font-size: 48px;
              font-weight: 700;
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
              padding: 16px;
              min-width: 280px;
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
              line-height: 1.5;
              margin-top: 16px;
              position: relative;
              z-index: 1;
            }

            /* Print Styles */
            @media print {
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
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
            @page {
              margin: 1.5cm;
            }
          </style>
        </head>

        <body>
          <div class="container">
            <!-- HERO HEADER - Diseño de la página -->
            <div class="hero-header">
              <div class="hero-decoration"></div>
              
              <div class="hero-top">
                <div class="hero-title-section">
                  <div class="hero-icon-title">
                    <div class="hero-icon">🏠</div>
                    <h1 class="hero-title">Valor Comercial Estimado</h1>
                  </div>
                  <p class="hero-description">
                    ${esLote
          ? 'Valor obtenido a partir del análisis de mercado y método residual, sin aplicar enfoque de rentabilidad.'
          : 'Determinación del valor comercial basada en un análisis técnico ponderado que integra el comportamiento real del mercado local y la validación experta de nuestra inteligencia artificial.'}
                  </p>
                </div>
                <div class="hero-badge">⚡ Estimación IA</div>
              </div>

              <div class="hero-value-section">
                <div class="hero-main-value">
                  <div class="hero-amount">${formatCurrency(valorEstimadoFinal)}</div>
                  <div class="hero-currency">COP (Pesos Colombianos)</div>
                </div>

                <div class="hero-details-box">
                  <div class="hero-detail-row">
                    <span class="hero-detail-label">Rango Sugerido</span>
                    <span class="hero-detail-value">
                      ${formatCurrency(rangoMin)} - ${formatCurrency(rangoMax)}
                    </span>
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

            <!-- MÉTODOS DE VALORACIÓN -->
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

            <!-- INFORMACIÓN DETALLADA -->
            <div class="info-section">
              <h3 style="margin-top: 0; color: #2C3D37; border-bottom: 2px solid #C9C19D; padding-bottom: 8px;">Información Detallada</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Tipo de Inmueble</div>
                  <div class="info-value">${formData.tipo_inmueble || '—'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Ubicación</div>
                  <div class="info-value">${formData.barrio || '—'}, ${formData.municipio || formData.ciudad || '—'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Área Construida</div>
                  <div class="info-value">${formatNumber(area)} m²</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Precio por m²</div>
                  <div class="info-value">${formatCurrency(precioM2)}/m²</div>
                </div>
                ${!esLote ? `
                <div class="info-item">
                  <div class="info-label">Habitaciones</div>
                  <div class="info-value">${formData.habitaciones || '—'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Baños</div>
                  <div class="info-value">${formData.banos || '—'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Estrato</div>
                  <div class="info-value">${formData.estrato || defaults.estrato || '—'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Estado</div>
                  <div class="info-value">${formData.estado_inmueble || defaults.estado_inmueble || '—'}</div>
                </div>
                ` : `
                <div class="info-item">
                  <div class="info-label">Uso del Lote</div>
                  <div class="info-value">${formData.uso_lote || '—'}</div>
                </div>
                `}
                <div class="info-item">
                  <div class="info-label">Comparables Analizados</div>
                  <div class="info-value">${totalComparables} inmuebles</div>
                </div>
                ${!esLote && yieldMensual ? `
                <div class="info-item">
                  <div class="info-label">Yield Mensual</div>
                  <div class="info-value">${(yieldMensual * 100).toFixed(2)}%</div>
                </div>
                ` : ''}
              </div>
            </div>

            <!-- Tabla de comparables -->
            <h2 style="margin-top: 30px;">Propiedades Comparables</h2>

            <table>
              <thead>
                <tr>
                  <th>Inmueble</th>
                  <th>Tipo</th>
                  <th>Área</th>
                  <th>Precio Publicado</th>
                  <th>Precio Estimado</th>
                  <th>Precio m²</th>
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
                      <td>
                        <strong>${item.titulo || 'Inmueble'}</strong><br>
                        <span class="sub-text">${item.barrio || ''}, ${item.municipio || ''}</span>
                      </td>
                      <td><span class="badge ${badgeClass}">${tipoLabel}</span></td>
                      <td class="text-center">${formatNumber(item.area_m2)} m²</td>
                      <td class="text-right">${formatCurrency(item.precio_publicado)} ${esArriendo ? '<span class="sub-text">/mes</span>' : ''}</td>
                      <td class="text-right">
                        <strong>${formatCurrency(item.precio_cop)}</strong>
                        ${notaArriendo}
                      </td>
                      <td class="text-right">
                        ${formatCurrency(item.precio_m2)}
                      </td>
                    </tr>
                  `;
          }).join('')}
              </tbody>
            </table>

            <!-- ✔ CORRECCIÓN 3: Nota sobre Yield -->
            <p style="font-size: 10px; color: #666; margin-top: 15px; font-style: italic;">
              Yield mensual utilizado: ${yieldMensual ? (yieldMensual * 100).toFixed(2) + '%' : '0.45%'}.
              Este yield corresponde al promedio observado en arriendos residenciales del mercado local.
            </p>

            ${esLote ? `
              <p style="font-size: 10px; color: #888; margin-top: 15px; font-style: italic; text-align: justify;">
                Nota: Ante la escasez de oferta comercial idéntica, se han utilizado lotes campestres y urbanos como referencia base, ajustando sus valores por factores de localización, escala y uso comercial. Se aplicó ajuste por factor de comercialización.
              </p>
            ` : ''}

            <div class="footer">
              <p>Quetzal Hábitats - Inteligencia Inmobiliaria</p>
              <p>Este documento es una estimación estadística y no constituye un avalúo certificado.</p>
              <p>Generado el ${fecha}</p>
            </div>

          </div>
        </body>
        </html>
      `;

      // Abrir PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 800);
      }

      return { success: true };
    }
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
