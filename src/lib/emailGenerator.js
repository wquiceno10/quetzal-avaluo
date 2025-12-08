/**
 * Genera el HTML para el correo electrónico del reporte de avalúo.
 * @param {Object} params
 * @param {Object} params.data - Datos completos del avalúo (incluyendo form data y comparables_data)
 * @param {string} params.codigoAvaluo - Código único del avalúo
 * @param {number} params.valorEstimadoFinal - Valor final calculado o estimado
 * @param {number} params.rangoMin - Rango mínimo
 * @param {number} params.rangoMax - Rango máximo
 * @returns {string} - String con el HTML completo
 */
export const generateAvaluoEmailHtml = ({ data, codigoAvaluo, valorEstimadoFinal, rangoMin, rangoMax }) => {
    // Helper para formatear moneda
    const formatCurrency = (val) => val ? '$ ' + Math.round(val).toLocaleString('es-CO') : '—';

    // Helper para detectar si es lote
    const esLote = (data.tipo_inmueble || '').toLowerCase().includes('lote');

    // Datos de comparables (pueden venir anidados o planos)
    const comparablesData = data.comparables_data || data;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; line-height: 1.6; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; overflow: hidden; font-size: 14px; }
        .header { background-color: #2C3D37; padding: 40px 20px; text-align: center; color: white; }
        .header-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .header-code { font-size: 14px; opacity: 0.8; }
        
        .content { padding: 30px; }
        
        .value-box { background-color: #F9FAF9; border: 1px solid #E0E5E2; border-radius: 8px; padding: 25px; text-align: center; margin-bottom: 30px; }
        .value-label { color: #666; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
        .value-amount { color: #2C3D37; font-size: 36px; font-weight: bold; margin: 5px 0; }
        .value-range { color: #888; font-size: 12px; }
        
        .section-title { color: #2C3D37; font-size: 16px; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; margin-top: 30px; }
        
        .data-grid { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .data-grid td { padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 13px; }
        .data-label { color: #666; width: 40%; }
        .data-val { color: #333; font-weight: bold; text-align: right; }
        
        .cta-box { background-color: #E8ECE9; padding: 30px; text-align: center; margin-top: 30px; border-radius: 8px; }
        .cta-title { color: #2C3D37; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .cta-text { color: #4F5B55; font-size: 13px; margin-bottom: 20px; line-height: 1.5; }
        .cta-btn { background-color: #2C3D37; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; font-size: 14px; display: inline-block; }
        
        .alert-box { background-color: #FFFDF5; border-left: 4px solid #FBC02D; padding: 15px; margin-top: 30px; font-size: 12px; color: #555; text-align: justify; }
        
        .footer-contact { background-color: #E8ECE9; padding: 30px; text-align: center; margin-top: 20px; }
        .contact-title { font-size: 16px; font-weight: bold; color: #2C3D37; margin-bottom: 10px; }
        
        .footer-dark { background-color: #2C3D37; padding: 30px; text-align: center; color: #8FA396; font-size: 11px; }
        .footer-dark p { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- DARK HEADER -->
        <div class="header">
          <div class="header-title">Reporte de Avalúo</div>
          <div class="header-code">Código: ${codigoAvaluo}</div>
        </div>
        
        <div class="content">
          <p>Hola <strong>${data.contacto_nombre || data.nombre_contacto || 'Usuario'}</strong>,</p>
          <p>Adjunto encontrarás el detalle de la valoración para tu inmueble en <strong>${data.barrio}, ${data.municipio}</strong>.</p>
          
          <!-- VALUE BOX -->
          <div class="value-box">
            <div class="value-label">Valor Comercial Estimado</div>
            <div class="value-amount">${formatCurrency(valorEstimadoFinal)}</div>
            <div class="value-range">Rango sugerido: ${formatCurrency(rangoMin)} - ${formatCurrency(rangoMax)}</div>
          </div>

          <!-- FICHA TÉCNICA -->
          <div class="section-title">Ficha Técnica</div>
          <table class="data-grid">
            <tr><td class="data-label">Tipo Inmueble:</td><td class="data-val">${data.tipo_inmueble}</td></tr>
            <tr><td class="data-label">Ubicación:</td><td class="data-val">${data.barrio}, ${data.municipio}</td></tr>
            <tr><td class="data-label">Área:</td><td class="data-val">${data.area_construida} m²</td></tr>
            ${!esLote ? `
            <tr><td class="data-label">Habitaciones:</td><td class="data-val">${data.habitaciones || '-'}</td></tr>
            <tr><td class="data-label">Baños:</td><td class="data-val">${data.banos || '-'}</td></tr>
            ` : `
            <tr><td class="data-label">Uso:</td><td class="data-val">${data.uso_lote || '-'}</td></tr>
            `}
          </table>

          <!-- RESUMEN MERCADO -->
          <div class="section-title">Resumen del Mercado</div>
           <p style="font-size: 13px; text-align: justify; color: #555; line-height: 1.5;">
              ${comparablesData.resumen_busqueda || 'Análisis basado en la oferta actual del mercado.'}
           </p>
           <table class="data-grid" style="margin-top: 15px;">
              <tr><td class="data-label">Comparables:</td><td class="data-val">${comparablesData.total_comparables || 0} inmuebles</td></tr>
              ${!esLote ? `<tr><td class="data-label">Yield Estimado:</td><td class="data-val">${((comparablesData.yield_mensual_mercado || 0) * 100).toFixed(2)}% mensual</td></tr>` : ''}
           </table>

          <!-- AVISO LEGAL -->
          <div class="alert-box">
            <strong>⚠️ Aviso Legal:</strong><br>
            Este avalúo comercial es una estimación basada en el análisis de propiedades comparables en el mercado inmobiliario actual y no constituye un avalúo oficial o catastral. Los valores presentados son aproximados. Para transacciones legales o financieras, se recomienda obtener un avalúo oficial realizado por un perito avaluador certificado.
          </div>
          
          <!-- CTA COMPRA/VENTA -->
          <div class="cta-box">
            <div class="cta-title">¿Interesado en vender o comprar?</div>
            <div class="cta-text">En Quetzal Hábitats te ayudamos a encontrar el comprador ideal o la propiedad perfecta para ti. Contáctanos para una asesoría personalizada.</div>
            <a href="https://wa.me/573186383809" class="cta-btn">Contactar Asesor</a>
          </div>
        </div>

        <!-- FOOTER INFO -->
        <div class="footer-contact">
           <div class="contact-title">¿Necesitas más información?</div>
           <p style="font-size: 14px; margin: 5px 0;">📞 +57 318 638 3809</p>
           <p style="font-size: 14px; margin: 5px 0;">✉️ contacto@quetzalhabitats.com</p>
        </div>

        <!-- DARK FOOTER COPYRIGHT -->
        <div class="footer-dark">
           <img src="https://assets.zyrosite.com/YNqM51Nez6URyK5d/quetzal_4-Yan0WNJQLLHKrEom.png" alt="Quetzal" style="filter: brightness(0) invert(1); opacity: 0.5; height: 30px; margin-bottom: 10px;">
           <p>© 2025 Quetzal Hábitats - Todos los derechos reservados</p>
           <p>Código: ${codigoAvaluo}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
