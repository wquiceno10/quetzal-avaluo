/**
 * Genera el HTML para el correo electrónico del reporte de avalúo.
 * DISEÑO CORRECTO - Matching user screenshots
 */
import { construirTextoConfianza } from './confidenceHelper';

export const generateAvaluoEmailHtml = ({ data, codigoAvaluo, valorEstimadoFinal, rangoMin, rangoMax }) => {
  const formatCurrency = (val) => val ? '$ ' + Math.round(val).toLocaleString('es-CO') : '—';
  const formatNumber = (val) => val ? Math.round(val).toLocaleString('es-CO') : '—';

  const esLote = (data.tipo_inmueble || '').toLowerCase().includes('lote');
  const comparablesData = data.comparables_data || data.payload_json || data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; line-height: 1.6; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; overflow: hidden; font-size: 14px; }
        
        /* HERO Styles */
        .hero { background-color: #2C3D37; color: white; padding: 30px 25px; border-radius: 0 0 15px 15px; }
        .hero-badge { background-color: #C9C19D; color: #1a2620; padding: 5px 12px; border-radius: 15px; font-size: 11px; font-weight: bold; display: inline-block; }
        .hero-value { font-size: 36px; font-weight: bold; line-height: 1; margin: 15px 0 5px 0; }
        .hero-sub { font-size: 12px; opacity: 0.8; }
        .hero-details { background: rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin-top: 25px; }
        
        .content { padding: 30px 25px; }
        .section-title { color: #2C3D37; font-size: 16px; font-weight: bold; border-bottom: 2px solid #C9C19D; padding-bottom: 8px; margin-bottom: 15px; margin-top: 25px; }
        
        .data-grid { width: 100%; border-collapse: collapse; }
        .data-grid td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
        .data-label { color: #666; width: 40%; font-weight: bold; font-size: 11px; text-transform: uppercase; }
        .data-val { color: #333; font-weight: bold; text-align: right; }
        
        .comp-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        .comp-table th { text-align: left; background: #F0ECD9; padding: 8px; font-size: 11px; }
        .comp-table td { border-bottom: 1px solid #eee; padding: 8px; }
        
        .footer-dark { background-color: #2C3D37; padding: 30px 20px; text-align: center; color: #8FA396; font-size: 11px; }
        
        .cta-box { background: #2C3D37; padding: 25px; text-align: center; border-radius: 10px; margin: 30px 0; color: white; }
        .btn-download { background-color: #C9C19D; color: #2C3D37; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- HERO HEADER -->
        <div class="hero">
           <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                 <td>
                    <div style="font-size:24px; font-weight:bold;">🏠 Valor Comercial</div>
                    <div style="font-size:12px; opacity:0.8; margin-top:4px;">Estimación de Inteligencia Inmobiliaria</div>
                 </td>
                 <td align="right" valign="top">
                    <span class="hero-badge">⚡ Estimación IA</span>
                 </td>
              </tr>
           </table>
           
           <div class="hero-value">${formatCurrency(valorEstimadoFinal)}</div>
           <div class="hero-sub">COP (Pesos Colombianos)</div>
           
           <div class="hero-details">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                 <tr>
                    <td style="color:#D3DDD6; font-size:12px; padding-bottom:8px;">Rango Sugerido</td>
                    <td align="right" style="color:white; font-weight:bold; font-size:12px; padding-bottom:8px;">${formatCurrency(rangoMin)} - ${formatCurrency(rangoMax)}</td>
                 </tr>
                 <tr>
                    <td style="color:#D3DDD6; font-size:12px;">Muestra de Mercado</td>
                    <td align="right" style="color:white; font-weight:bold; font-size:12px;">${comparablesData.total_comparables || 0} inmuebles</td>
                 </tr>
              </table>
           </div>
        </div>
        
        <div class="content">
          <p>Hola,</p>
          <p>Aquí tienes el detalle de la valoración para tu inmueble ubicado en <strong>${data.barrio || '-'}, ${data.municipio || data.ciudad || '-'}</strong>. Este reporte refleja el comportamiento real del mercado local.</p>

          <!-- INFORMACIÓN DETALLADA -->
          <div class="section-title">Información Detallada</div>
          <table class="data-grid">
            <tr><td class="data-label">Tipo Inmueble</td><td class="data-val">${data.tipo_inmueble || '—'}</td></tr>
            <tr><td class="data-label">Ubicación</td><td class="data-val">${data.barrio || '-'}, ${data.municipio || data.ciudad || '-'}</td></tr>
            <tr><td class="data-label">Área Construida</td><td class="data-val">${formatNumber(data.area_construida || comparablesData.area_construida)} m²</td></tr>
            ${!esLote ? `
            <tr><td class="data-label">Habitaciones</td><td class="data-val">${data.habitaciones || comparablesData.habitaciones || '-'}</td></tr>
            <tr><td class="data-label">Baños</td><td class="data-val">${data.banos || comparablesData.banos || '-'}</td></tr>
            <tr><td class="data-label">Estrato</td><td class="data-val">${data.estrato || comparablesData.estrato || 'No especificado'}</td></tr>
            <tr><td class="data-label">Estado</td><td class="data-val" style="text-transform: capitalize;">${(data.estado_inmueble || data.estado || comparablesData.estado_inmueble || comparablesData.estado || '—').replace(/_/g, ' ')}</td></tr>
            ` : `
            <tr><td class="data-label">Uso del Lote</td><td class="data-val">${data.uso_lote || '-'}</td></tr>
            `}
          </table>

          <!-- NIVEL DE CONFIANZA -->
          ${comparablesData.nivel_confianza ? `
          <div style="background: ${comparablesData.nivel_confianza === 'Alto' ? '#f0fdf4' : comparablesData.nivel_confianza === 'Medio' ? '#eff6ff' : '#fffbeb'}; 
                      border: 1px solid ${comparablesData.nivel_confianza === 'Alto' ? '#86efac' : comparablesData.nivel_confianza === 'Medio' ? '#93c5fd' : '#fcd34d'}; 
                      border-radius: 8px; 
                      padding: 15px; 
                      margin: 20px 0;">
            <div style="font-weight: 600; 
                        color: ${comparablesData.nivel_confianza === 'Alto' ? '#166534' : comparablesData.nivel_confianza === 'Medio' ? '#1e40af' : '#92400e'}; 
                        font-size: 13px; 
                        margin-bottom: 8px;">
              ℹ️ Nivel de Confianza del Análisis
            </div>
            <p style="font-size: 12px; 
                      line-height: 1.5; 
                      margin: 0; 
                      color: ${comparablesData.nivel_confianza === 'Alto' ? '#166534' : comparablesData.nivel_confianza === 'Medio' ? '#1e3a8a' : '#78350f'};">
              ${construirTextoConfianza(comparablesData.nivel_confianza, comparablesData.nivel_confianza_detalle)}
            </p>
          </div>
          ` : ''}


          <!-- RESUMEN MERCADO -->
          <div class="section-title">Resumen del Mercado</div>
           <p style="font-size: 13px; text-align: justify; color: #555; line-height: 1.5; margin-bottom: 15px;">
              ${comparablesData.resumen_busqueda || 'Análisis basado en la oferta actual del mercado.'}
           </p>
           
           <div style="background-color: #FFFDF5; border: 1px solid #E6E0C7; padding: 15px; border-radius: 8px; font-size: 12px; color: #555;">
              <strong>💡 Tip:</strong> Descarga el reporte PDF completo desde la plataforma para ver gráficas detalladas y el análisis técnico completo.
           </div>
          
          <!-- CTA DESCARGA PDF -->
          <div class="cta-box">
              <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">📄 Reporte Completo</div>
              <div style="font-size: 13px; color: #D3DDD6; margin-bottom: 15px;">
                Para ver todas las gráficas y guardar el informe oficial, descarga el PDF.
              </div>
              <a href="https://avaluos.quetzalhabitats.com/resultados/${data.id}?download=pdf" class="btn-download" style="background-color: #C9C19D; color: #2C3D37; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: bold; display: inline-block; margin-top: 15px;">
                Descargar PDF
              </a>
          </div>

          <!-- TABLA COMPARABLES (Top 5) -->
          <div class="section-title">Comparables Destacados</div>
          <table class="comp-table">
            <thead>
              <tr>
                <th>Inmueble</th>
                <th style="text-align:center;">Área</th>
                <th style="text-align:right;">Precio</th>
              </tr>
            </thead>
            <tbody>
              ${(comparablesData.comparables || []).slice(0, 5).map(item => `
              <tr>
                <td>
                  <strong style="color:#2C3D37;">${item.titulo || 'Propiedad'}</strong><br>
                  <span style="color:#888; font-size:10px;">${item.barrio || ''}</span>
                </td>
                <td style="text-align:center;">${formatNumber(item.area_m2)} m²</td>
                <td style="text-align:right;">
                  <strong>${formatCurrency(item.precio_cop)}</strong>
                  ${item.tipo_origen === 'arriendo' ? '<br><span style="color:#888; font-size:9px;">(Est. x Yield)</span>' : ''}
                </td>
              </tr>
              `).join('')}
            </tbody>
          </table>
          <p style="font-size: 10px; color: #888; margin-top: 5px; text-align: center;">
             Mostrando 5 de ${comparablesData.total_comparables || 0} inmuebles. Descarga el PDF para ver todos.
          </p>

          <!-- CONTACTO -->
          <div style="background-color: #F0F2F1; padding: 25px; text-align: center; border-radius: 10px; margin-top: 30px;">
            <div style="font-size: 16px; font-weight: bold; color: #2C3D37; margin-bottom: 10px;">¿Necesitas vender este inmueble?</div>
            <div style="font-size: 13px; color: #4F5B55; margin-bottom: 20px;">En Quetzal Hábitats conectamos tu propiedad con los clientes adecuados.</div>
            <a href="https://wa.me/573186383809" style="background-color: #2C3D37; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; font-size: 14px;">Contactar Asesor</a>
          </div>
        </div>

        <div class="footer-dark">
           <img src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png" alt="Quetzal" style="height: 40px; margin-bottom: 15px;">
           <p style="color: #8FA396; margin: 5px 0;">© 2025 Quetzal Hábitats - Todos los derechos reservados</p>
           <p style="color: #5A6D66; margin: 5px 0;">Código: ${codigoAvaluo}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
