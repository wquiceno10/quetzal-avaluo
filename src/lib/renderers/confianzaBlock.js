
/**
 * Normaliza el nivel de confianza a un set cerrado: ALTO | MEDIO | BAJO
 * Maneja mayúsculas/minúsculas, trim y prefijos comunes.
 */
export function normalizeNivelConfianza(raw) {
    if (!raw) return 'BAJO';

    const normalized = String(raw).toUpperCase().trim();

    if (normalized.startsWith('ALTO')) return 'ALTO';
    if (normalized.startsWith('MEDIO')) return 'MEDIO'; // Cubre MEDIO-BAJO, Medio-Alto
    if (normalized.startsWith('BAJO')) return 'BAJO';

    return 'BAJO'; // Default fallback
}

/**
 * Genera el HTML inline-styled unificado para el bloque de Solidez del Análisis.
 * Usado tanto en PDFs como en Emails para garantizar consistencia visual idéntica.
 * @param {Object} confianzaInfo - Objeto con { nivel, label, razones }
 * @param {string} format - 'pdf' | 'email' (Default: 'email') - Controla las fuentes específicas
 */
export function renderConfianzaBlockHtml(confianzaInfo, format = 'email') {
    if (!confianzaInfo) return '';

    const nivel = normalizeNivelConfianza(confianzaInfo.nivel);
    const label = confianzaInfo.label || 'Nivel desconocido';
    const razones = confianzaInfo.razones || [];

    // Paleta de colores COINCIDENTE con Step3Results.jsx (Ahora todo es AZUL para MEDIO)
    const colors = {
        'ALTO': {
            bg: '#f0fdf4', border: '#bbf7d0',
            textTitle: '#166534', textBody: '#166534',
            barBg: '#dcfce7', barFill: '#22c55e', percentage: 90
        },
        'MEDIO': {
            bg: '#eff6ff', border: '#bfdbfe',
            textTitle: '#1e40af', textBody: '#1e40af',
            barBg: '#dbeafe', barFill: '#3b82f6', percentage: 60
        },
        'BAJO': {
            bg: '#fff7ed', border: '#fed7aa',
            textTitle: '#9a3412', textBody: '#9a3412',
            barBg: '#ffedd5', barFill: '#f97316', percentage: 30
        }
    };

    const styles = colors[nivel] || colors['BAJO'];
    const fontTitle = format === 'pdf' ? "'Outfit', sans-serif" : "inherit";
    const fontBody = format === 'pdf' ? "'Raleway', sans-serif" : "inherit";

    // ESTRUCTURA TABLE-BASED PARA MÁXIMA COMPATIBILIDAD (EMAIL & PDF)
    // Evitamos flexbox en la cabecera porque rompe en Outlook.
    return `
    <div style="background: ${styles.bg}; border: 1px solid ${styles.border}; border-radius: 8px; padding: 16px; margin: 20px 0; font-family: ${fontBody}; color: ${styles.textBody}; page-break-inside: avoid; break-inside: avoid; width: 100%; box-sizing: border-box;">
        
        <!-- Header con Tabla -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse: collapse; margin-bottom: 12px;">
            <tr>
                <!-- Icono -->
                <td style="width: 24px; vertical-align: middle; padding-right: 8px;">
                     <div style="background-color: ${styles.textTitle}; color: white; width: 20px; height: 20px; border-radius: 4px; text-align: center; line-height: 20px; font-weight: bold; font-family: sans-serif; font-size: 14px; display:inline-block;">i</div>
                </td>
                
                <!-- Título -->
                <td style="vertical-align: middle;">
                    <h4 style="margin: 0; color: ${styles.textTitle}; font-size: 14px; font-weight: 700; line-height: 1.4; font-family: ${fontTitle};">
                        Solidez del Análisis: ${label}
                    </h4>
                </td>

                <!-- Porcentaje (Alineado Derecha) -->
                <td style="vertical-align: middle; text-align: right; width: 40px;">
                    <span style="font-size: 12px; font-weight: 600; color: #7A8C85; font-family: ${fontBody}; white-space: nowrap;">
                        ${styles.percentage}%
                    </span>
                </td>
            </tr>
        </table>

        <!-- Barra de Progreso -->
        <div style="background-color: ${styles.barBg}; height: 8px; width: 100%; border-radius: 9999px; margin-bottom: 16px; overflow: hidden; line-height: 0; font-size: 0;">
            <div style="background-color: ${styles.barFill}; width: ${styles.percentage}%; height: 8px; border-radius: 9999px; line-height: 0; font-size: 0;">&nbsp;</div>
        </div>

        <!-- Lista de Razones -->
        <div style="font-size: 12px; line-height: 1.4; margin: 0; color: ${styles.textBody}; font-family: ${fontBody};">
            ${razones.map(r => `<div style="margin-bottom: 6px; display: block;">• ${r}</div>`).join('')}
        </div>
    </div>
    `;
}
