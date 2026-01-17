/**
 * Genera el HTML para el correo electrónico del reporte de avalúo.
 * DISEÑO CORRECTO - Matching user screenshots
 */
import { construirTextoConfianza } from './confidenceHelper';
import { NOTA_DISCLAIMER } from './constants';
import { renderConfianzaBlockHtml } from './renderers/confianzaBlock';
import { mapearEstadoSinPrecio } from './utils';

export const generateAvaluoEmailHtml = ({ data, codigoAvaluo, valorEstimadoFinal, rangoMin, rangoMax, confianzaInfo }) => {
  const formatCurrency = (val) => val ? '$ ' + Math.round(val).toLocaleString('es-CO') : '—';
  const formatNumber = (val) => val ? Math.round(val).toLocaleString('es-CO') : '—';

  // Helper: Convertir texto a Title Case (Primera Letra Mayúscula)
  const toTitleCase = (str) => {
    if (!str) return '';
    const smallWords = ['y', 'de', 'en', 'a', 'o', 'la', 'el', 'del', 'un', 'una', 'para', 'por', 'con', 'sin'];
    return str
      .toLowerCase()
      .split(' ')
      .map((word, index) => {
        // Primera palabra siempre en mayúscula, o si no es palabra pequeña
        if (index === 0 || !smallWords.includes(word)) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      })
      .join(' ');
  };

  const esLote = (data.tipo_inmueble || '').toLowerCase().includes('lote');
  const comparablesData = data.comparables_data || data.payload_json || data;

  // Fallback robusto para uso_lote
  const usoLote = data.uso_lote ||
    comparablesData.uso_lote ||
    (comparablesData.ficha_tecnica_defaults && comparablesData.ficha_tecnica_defaults.uso_lote) ||
    '-';

  const totalComparables = comparablesData.comparables_usados_en_calculo || comparablesData.total_comparables || (comparablesData.comparables ? comparablesData.comparables.length : 0);
  const totalEncontrados = comparablesData.comparables_totales_encontrados || 0;

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
        .data-grid td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: middle; }
        .data-label { color: #666; width: 40%; font-weight: bold; font-size: 11px; text-transform: uppercase; }
        .data-val { color: #333; font-weight: bold; text-align: right; }
        
        .comp-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        .comp-table th { text-align: left; background: #F0ECD9; padding: 8px; font-size: 11px; vertical-align: middle; }
        .comp-table td { border-bottom: 1px solid #eee; padding: 8px; vertical-align: middle; }
        
        .footer-dark { background-color: #2C3D37; padding: 30px 20px; text-align: center; color: #8FA396; font-size: 11px; }
        
        .cta-box { background: #2C3D37; padding: 25px; text-align: center; border-radius: 10px; margin: 30px 0; color: white; }
        .btn-download { background-color: #C9C19D; color: #2C3D37; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container" style="border-radius: 10px 10px 0 0;">
        <!-- CTA BUTTON - ACCESO RÁPIDO -->
        <div style="background-color: #e9e6da; padding: 18px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <a href="https://avaluos.quetzalhabitats.com/resultados/${data.id}" 
             style="background: #2C3D37; color: white; padding: 14px 35px; 
                    border-radius: 30px; text-decoration: none; font-weight: bold;
                    font-size: 15px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
            📊 Ver Tu Avalúo Completo
          </a>
        </div>

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
          <p>Aquí tienes el detalle de la valoración para tu inmueble ubicado en <strong>${toTitleCase(data.barrio && data.barrio !== '—' && data.barrio !== '-' ? `${data.barrio}, ` : '')}${toTitleCase(data.municipio || data.ciudad || '-')}</strong>. Este reporte refleja el comportamiento real del mercado local.</p>

          <!-- INFORMACIÓN DETALLADA -->
          <div class="section-title">Información Detallada</div>
          <table class="data-grid">
            <tr><td class="data-label">Tipo Inmueble</td><td class="data-val">${toTitleCase(data.tipo_inmueble || '—')}</td></tr>
            <tr><td class="data-label">Ubicación</td><td class="data-val">${toTitleCase(data.barrio && data.barrio !== '—' && data.barrio !== '-' ? `${data.barrio}, ` : '')}${toTitleCase(data.municipio || data.ciudad || '-')}</td></tr>
            <tr><td class="data-label">Área Construida</td><td class="data-val">${formatNumber(data.area_construida || comparablesData.area_construida)} m²</td></tr>
            ${!esLote ? `
            <tr><td class="data-label">Habitaciones</td><td class="data-val">${data.habitaciones || comparablesData.habitaciones || '-'}</td></tr>
            <tr><td class="data-label">Baños</td><td class="data-val">${data.banos || comparablesData.banos || '-'}</td></tr>
            <tr><td class="data-label">Estrato</td><td class="data-val">${data.estrato || comparablesData.estrato || 'No especificado'}</td></tr>
            <tr><td class="data-label">Estado</td><td class="data-val">${mapearEstadoSinPrecio(data.estado_inmueble || data.estado || comparablesData.estado_inmueble || comparablesData.estado)}</td></tr>
            ` : `
            <tr><td class="data-label">Uso del Lote</td><td class="data-val">${toTitleCase(usoLote)}</td></tr>
            `}
          </table>

          <!-- NOTA DISCLAIMER -->
          <div style="background: #FFF8E1; border: 1px solid #FCD34D; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; color: #92400e;">
              <strong>Nota importante:</strong> ${NOTA_DISCLAIMER}
            </p>
          </div>

          <!-- NIVEL DE CONFIANZA -->
          ${renderConfianzaBlockHtml(confianzaInfo)}


          <!-- RESUMEN MERCADO -->
          <div class="section-title">Resumen del Mercado</div>
           <p style="font-size: 13px; text-align: justify; color: #555; line-height: 1.5; margin-bottom: 15px;">
              ${(comparablesData.resumen_busqueda || 'Análisis basado en la oferta actual del mercado.').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
           </p>
           
           <div style="background-color: #FFFDF5; border: 1px solid #E6E0C7; padding: 15px; border-radius: 8px; font-size: 12px; color: #555;">
              <strong>💡 Tip:</strong> Descarga el reporte PDF completo desde la plataforma para ver el análisis técnico completo.
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
              ${(comparablesData.comparables || [])
      .filter(item => {
        const precio = item.precio_cop || item.precio || item.precio_publicado || 0;
        const area = item.area_m2 || item.area || 0;
        return precio > 0 && area > 0;
      }) // EMAIL ONLY: Filtrar sin precio/área válidos
      .slice(0, 5).map(item => `
              <tr>
                <td>
                  <strong style="color:#2C3D37;">${toTitleCase(item.titulo || 'Propiedad')}</strong><br>
                  <span style="color:#888; font-size:10px;">${toTitleCase(item.barrio || '')}</span>
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
