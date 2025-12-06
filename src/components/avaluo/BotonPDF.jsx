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
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');

            body {
              font-family: 'Outfit', sans-serif;
              margin: 40px;
              background: white;
              color: #2C3D37;
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
          </style>
        </head>

        <body>
          <div>
            <h1>Reporte de Avalúo</h1>
            <p style="margin-top: -4px; font-size: 13px;">Generado por Quetzal Hábitats</p>

            <div class="grid-2">
              <div class="box">
                <h3>Estimación IA</h3>
                <p style="font-size: 22px; font-weight: 700;">
                  ${formatCurrency(valorEstimadoFinal)}
                </p>
              </div>

              <div class="box">
                <h3>Rango Sugerido</h3>
                <p style="font-size: 14px;">
                  ${formatCurrency(rangoMin)} – ${formatCurrency(rangoMax)}
                </p>
              </div>
            </div>

            <!-- ✔ CORRECCIÓN 2: Explicación del Valor Final -->
            <p style="font-size: 8px; color: #666; font-style: italic; margin: 15px 0 20px 0; line-height: 1.4; text-align: justify;">
              El valor final es una recomendación técnica ponderada entre el enfoque de mercado
              y el de rentabilidad, priorizando el método con datos más consistentes según la
              cantidad, homogeneidad y dispersión de los comparables disponibles.
            </p>

            <div class="grid-2">
              <div class="box">
                <h3>Enfoque de Mercado</h3>
                <p><strong>${formatCurrency(valorVentaDirecta)}</strong></p>
                <p style="font-size: 11px;">Basado en precio promedio por m² × área construida.</p>
              </div>

              <div class="box">
                <h3>Enfoque de Rentabilidad</h3>
                <p><strong>${formatCurrency(valorRentabilidad)}</strong></p>
                <p style="font-size: 11px;">Canon mensual estimado ÷ yield mensual del sector.</p>
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
