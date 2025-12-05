import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

export default function BotonPDF({ formData }) {
  const generatePDFMutation = useMutation({
    mutationFn: async (data) => {
      const comparablesData = data.comparables_data || {};

      // Cálculos de valores (Lógica espejo del frontend)
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
      const precioM2 = valorEstimadoFinal && area ? valorEstimadoFinal / area : 0;

      // Formateadores
      const formatCurrency = (val) => val ? '$ ' + Math.round(val).toLocaleString('es-CO') : '—';
      const formatNumber = (val) => val ? Math.round(val).toLocaleString('es-CO') : '—';

      // Fecha actual
      const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

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
              line-height: 1.5;
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
              body { background: white; padding: 0; }
              .container { 
                max-width: 100%; 
                width: 100%; 
                box-shadow: none; 
                margin: 0;
              }
              .page-break { page-break-before: always; }
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 40px 50px 20px 50px;
              border-bottom: 2px solid var(--primary);
              margin-bottom: 30px;
            }
            .header img { max-width: 180px; height: auto; }
            .report-meta { text-align: right; font-size: 12px; color: #888; }

            .content { padding: 0 50px 50px 50px; }

            .hero {
              background: linear-gradient(135deg, #2C3D37 0%, #1a2620 100%);
              color: white;
              padding: 40px;
              border-radius: 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 40px;
              box-shadow: 0 10px 20px rgba(44, 61, 55, 0.15);
            }
            .hero-title { font-family: 'Outfit', sans-serif; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-bottom: 10px; }
            .hero-price { font-family: 'Outfit', sans-serif; font-size: 42px; font-weight: 700; color: white; }
            .hero-subtitle { font-size: 14px; opacity: 0.8; }
            .hero-stats { text-align: right; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 30px; }
            .stat-label { font-size: 12px; opacity: 0.7; display: block; }
            .stat-value { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 600; color: var(--secondary); }

            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
            .card { background: var(--bg); padding: 25px; border-radius: 10px; border: 1px solid var(--border); }
            .card-title { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: var(--primary); margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #ccc; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; }
            .info-row strong { color: var(--primary); }

            .methods-container { display: flex; gap: 20px; margin-bottom: 40px; justify-content: center; }
            .method-card { flex: 1; max-width: 300px; background: white; border: 1px solid var(--border); border-radius: 8px; padding: 20px; text-align: center; }
            .method-val { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 700; color: var(--primary); margin: 10px 0; }
            .method-label { font-size: 12px; text-transform: uppercase; color: #888; letter-spacing: 1px; }

            /* TABLA COMPARABLES */
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 20px; }
            th { background: var(--primary); color: white; padding: 10px; text-align: left; font-family: 'Outfit', sans-serif; }
            td { padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
            tr:nth-child(even) { background: #f9f9f9; }
            .badge { 
              display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase;
            }
            .badge-venta { background: #E8F5E9; color: #2E7D32; }
            .badge-arriendo { background: #E3F2FD; color: #1565C0; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .sub-text { font-size: 9px; color: #888; display: block; margin-top: 2px; }

            .footer { margin-top: 60px; border-top: 2px solid var(--primary); padding-top: 20px; text-align: center; font-size: 11px; color: #888; }
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
                  <div class="hero-subtitle">Peso Colombiano (COP)</div>
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
                  <div class="info-row"><span>Habitaciones:</span> <strong>${formData.habitaciones || '—'}</strong></div>
                  <div class="info-row"><span>Baños:</span> <strong>${formData.banos || '—'}</strong></div>
                  <div class="info-row"><span>Parqueadero:</span> <strong>${formData.tipo_parqueadero || '—'}</strong></div>
                  <div class="info-row"><span>Antigüedad:</span> <strong>${formData.antiguedad || '—'}</strong></div>
                </div>

                <div class="card">
                  <div class="card-title">Resumen del Mercado</div>
                  <p style="font-size: 13px; text-align: justify;">
                    ${comparablesData.resumen_busqueda || 'Análisis de mercado realizado con base en la oferta actual.'}
                  </p>
                  <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ccc;">
                    <div class="info-row"><span>Comparables Analizados:</span> <strong>${comparablesData.total_comparables || 0}</strong></div>
                    <div class="info-row"><span>Yield Promedio:</span> <strong>${((comparablesData.yield_mensual_mercado || 0) * 100).toFixed(2)}% mensual</strong></div>
                  </div>
                </div>
              </div>

              <h3 style="font-family: 'Outfit', sans-serif; color: var(--primary); margin-bottom: 15px;">Metodología de Valoración</h3>
              <div class="methods-container">
                <div class="method-card">
                  <div class="method-label">Enfoque de Mercado</div>
                  <div class="method-val">${formatCurrency(valorVentaDirecta)}</div>
                  <div style="font-size: 11px; color: #666;">Basado en comparables de venta directa</div>
                </div>
                ${valorRentabilidad ? `
                <div class="method-card">
                  <div class="method-label">Enfoque de Rentabilidad</div>
                  <div class="method-val">${formatCurrency(valorRentabilidad)}</div>
                  <div style="font-size: 11px; color: #666;">Basado en canon estimado y yield</div>
                </div>
                ` : ''}
              </div>

              <div class="page-break"></div>

              <h3 style="font-family: 'Outfit', sans-serif; color: var(--primary); margin-bottom: 15px; margin-top: 30px;">Evidencia de Mercado (Muestra)</h3>
              
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