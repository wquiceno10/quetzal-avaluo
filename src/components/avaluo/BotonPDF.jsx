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

      // Área para cálculos
      const area = parseFloat(formData.area_construida || comparablesData.area_construida || 0);
      const precioM2 = comparablesData.precio_m2_final || (valorEstimadoFinal && area ? valorEstimadoFinal / area : 0);

      const defaults = comparablesData.ficha_tecnica_defaults || {};

      // Formateadores
      const formatCurrency = (val) => val ? '$ ' + Math.round(val).toLocaleString('es-CO') : '—';
      const formatNumber = (val) => val ? Math.round(val).toLocaleString('es-CO') : '—';

      // Fecha actual
      const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

      // Función para formatear texto (Markdown simple a HTML)
      const formatText = (text) => {
        if (!text) return '';
        return text
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/^#+\s*(.*?)$/gm, '<h4>$1</h4>')
          .replace(/^\s*[-*•]\s+(.*?)$/gm, '<li style="margin-bottom: 4px;">$1</li>')
          .replace(/\n\n/g, '<br><br>')
          .replace(/\n/g, '<br>');
      };

      // HTML DEL REPORTE
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Reporte de Avalúo - Quetzal Hábitats</title>
          <link rel="icon" href="https://assets.zyrosite.com/YNqM51Nez6URyK5d/fav1-AGBzN0VOzOfzwbzV.png" type="image/png">
          
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Raleway:wght@400;500&display=swap');
            
            :root {
              --primary: #2C3D37;
              --secondary: #C9C19D;
              --bg: #F9FAF9;
              --text: #4F5B55;
              --border: #E0E5E2;
            }

            body {
              font-family: 'Raleway', sans-serif;
              color: var(--text);
              background: #F0F0F0;
              margin: 0;
              padding: 20px;
              line-height: 1.4;
              font-size: 11px;
            }

            .container {
              width: 100%;
              max-width: 960px;
              margin: 0 auto;
              background: white;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              overflow: hidden;
              position: relative;
            }

            @media print {
              body { background: white; padding: 0; font-size: 10px; }
              .container { max-width: 100%; width: 100%; box-shadow: none; margin: 0; }
              .page-break { page-break-before: always; }
              .avoid-break { page-break-inside: avoid; }
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              background-color: var(--primary);
              color: white;
            }
            .header img { max-width: 120px; height: auto; filter: brightness(0) invert(1); }
            .report-meta { text-align: right; font-size: 10px; color: #E0E5E2; }

            .content { padding: 25px 40px; }

            .hero {
              background: linear-gradient(135deg, #2C3D37 0%, #1a2620 100%);
              color: white;
              padding: 25px;
              border-radius: 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 25px;
              box-shadow: 0 8px 16px rgba(44, 61, 55, 0.15);
            }
            .hero-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; }
            .hero-price { font-size: 28px; font-weight: bold; font-family: 'Outfit', sans-serif; margin: 5px 0; }
            .hero-subtitle { font-size: 10px; opacity: 0.7; }
            .hero-stats { background: rgba(255,255,255,0.1); padding: 12px 15px; border-radius: 8px; min-width: 200px; }
            .stat-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
            .stat-row:last-child { border-bottom: none; }
            .stat-label { font-size: 9px; opacity: 0.8; }
            .stat-value { font-size: 10px; font-weight: 600; }

            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .card { background: var(--bg); padding: 15px; border-radius: 8px; border: 1px solid var(--border); }
            .card-title { font-family: 'Outfit', sans-serif; font-weight: 600; color: var(--primary); font-size: 12px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed var(--border); }
            .info-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px; }
            .info-row span { color: #7A8C85; }
            .info-row strong { color: var(--primary); }

            .methods-container { display: flex; gap: 12px; margin-bottom: 20px; }
            .method-card { flex: 1; background: var(--bg); border: 1px solid var(--border); padding: 12px; text-align: center; border-radius: 8px; }
            .method-label { font-size: 9px; text-transform: uppercase; color: #888; font-weight: 600; letter-spacing: 0.5px; }
            .method-val { font-size: 16px; font-weight: bold; color: var(--primary); margin: 5px 0; font-family: 'Outfit', sans-serif; }

            .analysis-section { margin-top: 20px; }
            .analysis-section h3 { font-family: 'Outfit', sans-serif; color: var(--primary); font-size: 14px; margin-bottom: 12px; }
            .two-columns { column-count: 2; column-gap: 25px; font-size: 10px; line-height: 1.5; text-align: justify; }
            .two-columns h4 { font-family: 'Outfit', sans-serif; color: var(--primary); font-size: 11px; margin: 12px 0 5px 0; column-span: none; break-after: avoid; }
            .two-columns li { margin-bottom: 3px; }

            table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 10px; }
            th { background: var(--primary); color: white; padding: 6px 8px; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
            td { padding: 6px 8px; border-bottom: 1px solid var(--border); vertical-align: top; line-height: 1.3; }
            tr:nth-child(even) { background: #FAFBFA; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .sub-text { font-size: 8px; color: #888; display: block; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 7px; font-weight: 600; text-transform: uppercase; }
            .badge-venta { background: #E8F5E9; color: #2E7D32; }
            .badge-arriendo { background: #E3F2FD; color: #1565C0; }

            .footer { margin-top: 30px; padding: 20px; text-align: center; font-size: 9px; color: #888; border-top: 1px solid var(--border); }
            .footer p { margin: 3px 0; }
          </style>
        </head>
        <body>

          <div class="container">
            <div class="header">
              <img src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png" alt="Quetzal Hábitats">
              <div class="report-meta">
                <strong>Avalúo Comercial</strong><br>
                Fecha: ${fecha}
              </div>
            </div>

            <div class="content">
              <div class="hero">
                <div>
                  <div class="hero-title">Valor Comercial Estimado</div>
                  <div class="hero-price">${formatCurrency(valorEstimadoFinal)}</div>
                  <div class="hero-subtitle">COP (Pesos Colombianos)</div>
                  <p style="font-size: 9px; opacity: 0.8; margin-top: 5px; max-width: 300px;">
                    ${esLote
          ? 'Valor obtenido a partir del análisis de mercado y método residual, sin aplicar enfoque de rentabilidad.'
          : 'Determinación del valor comercial basada en un análisis técnico ponderado que integra el comportamiento real del mercado local y la validación experta de nuestra inteligencia artificial.'}
                  </p>
                </div>
                <div class="hero-stats">
                  <div class="stat-row">
                    <span class="stat-label">Rango Sugerido</span>
                    <span class="stat-value">${formatCurrency(rangoMin)} - ${formatCurrency(rangoMax)}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Precio por m²</span>
                    <span class="stat-value">${formatCurrency(precioM2)}/m²</span>
                  </div>
                </div>
              </div>

              <div class="grid-2">
                <div class="card">
                  <div class="card-title">Ficha Técnica</div>
                  <div class="info-row"><span>Tipo Inmueble:</span> <strong>${formData.tipo_inmueble || 'Inmueble'}</strong></div>
                  <div class="info-row"><span>Ubicación:</span> <strong>${formData.barrio || '—'}, ${formData.municipio || '—'}</strong></div>
                  <div class="info-row"><span>Área Construida:</span> <strong>${formData.area_construida || 0} m²</strong></div>
                  ${!esLote ? `
                  <div class="info-row"><span>Habitaciones:</span> <strong>${formData.habitaciones || defaults.habitaciones || 'No especificado'}</strong></div>
                  <div class="info-row"><span>Baños:</span> <strong>${formData.banos || defaults.banos || 'No especificado'}</strong></div>
                  <div class="info-row"><span>Parqueadero:</span> <strong>${formData.tipo_parqueadero || defaults.garajes || 'No especificado'}</strong></div>
                  <div class="info-row"><span>Antigüedad:</span> <strong>${formData.antiguedad || defaults.antiguedad || 'No especificado'}</strong></div>
                  ` : ''}
                  ${esLote ? `
                  <div class="info-row"><span>Uso del Lote:</span> <strong>${formData.uso_lote || '—'}</strong></div>
                  ` : ''}
                </div>

                <div class="card">
                  <div class="card-title">Resumen del Mercado</div>
                  <p style="font-size: 11px; text-align: justify; line-height: 1.3;">
                    ${comparablesData.resumen_busqueda || 'Análisis de mercado realizado con base en la oferta actual.'}
                  </p>
                  <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ccc;">
                    <div class="info-row"><span>Comparables Analizados:</span> <strong>${comparablesData.total_comparables || 0}</strong></div>
                    ${!esLote ? `
                    <div class="info-row"><span>Yield Promedio:</span> <strong>${((comparablesData.yield_mensual_mercado || 0) * 100).toFixed(2)}% mensual</strong></div>
                    <div style="font-size: 8px; color: #888; font-style: italic; margin-top: 2px;">* Yield promedio observado en Pereira (0.45%)</div>
                    ` : ''}
                  </div>
                </div>
              </div>

              <h3 style="font-family: 'Outfit', sans-serif; color: var(--primary); margin-bottom: 15px; font-size: 16px;">Metodología de Valoración</h3>
              <div class="methods-container">
                ${esLote ? `
                <div class="method-card" style="max-width: 100%; flex: 1;">
                  <div class="method-label">Metodología Ajustada (Lotes)</div>
                  <div class="method-val">${formatCurrency(valorVentaDirecta)}</div>
                  <div style="font-size: 10px; color: #666; margin-top: 5px;">Calculado a partir del precio promedio por m² de lotes comparables y ajuste residual.</div>
                </div>
                ` : `
                <div class="method-card">
                  <div class="method-label">Enfoque de Mercado</div>
                  <div class="method-val">${formatCurrency(valorVentaDirecta)}</div>
                  <div style="font-size: 10px; color: #666; margin-top: 5px;">Calculado a partir del precio promedio por m² de las propiedades comparables (precio promedio por m² × área del inmueble).</div>
                </div>
                `}
                
                ${valorRentabilidad && !esLote ? `
                <div class="method-card">
                  <div class="method-label">Enfoque de Rentabilidad</div>
                  <div class="method-val">${formatCurrency(valorRentabilidad)}</div>
                  <div style="font-size: 10px; color: #666; margin-top: 5px;">Calculado a partir del canon mensual estimado y la fórmula del rendimiento (yield) del sector (canon mensual estimado ÷ yield mensual).</div>
                </div>
                ` : ''}
              </div>

              ${comparablesData.perplexity_full_text ? `
              <div class="page-break"></div>
              <div class="analysis-section">
                <h3>Análisis Detallado</h3>
                <div class="two-columns">${formatText(comparablesData.perplexity_full_text)}</div>
              </div>
              ` : ''}

              <div>
                <h3 style="font-family: 'Outfit', sans-serif; color: var(--primary); margin-bottom: 15px; margin-top: 20px; font-size: 16px;">Evidencia de Mercado (Muestra)</h3>
                
                <table>
                  <thead>
                    <tr>
                      <th width="25%">Propiedad</th>
                      <th width="10%">Tipo</th>
                      <th width="10%">Área</th>
                      <th width="15%" class="text-right">Precio</th>
                      <th width="20%" class="text-right">Valor Estimado</th>
                      <th width="20%" class="text-right">$/m²</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(comparablesData.comparables || []).map(item => {
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
                          <td class="text-right">
                            ${formatCurrency(item.precio_publicado)}
                            ${esArriendo ? '<span class="sub-text">/mes</span>' : ''}
                          </td>
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
                ${esLote ? `
                <p style="font-size: 10px; color: #888; margin-top: 15px; font-style: italic; text-align: justify;">
                  Nota: Ante la escasez de oferta comercial idéntica, se han utilizado lotes campestres y urbanos como referencia base, ajustando sus valores por factores de localización, escala y uso comercial. Se aplicó ajuste por factor de comercialización.
                </p>
                ` : ''}
              </div>

              <div class="footer">
                <p>Quetzal Hábitats - Inteligencia Inmobiliaria</p>
                <p>Este documento es una estimación de valor basada en datos estadísticos y no constituye un avalúo certificado por la lonja.</p>
                <p>Generado el ${fecha}</p>
              </div>

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