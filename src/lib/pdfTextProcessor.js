/**
 * Procesa el texto de análisis de Perplexity para que sea compatible con PDF
 * Convierte el formato markdown/HTML a HTML simple con estilos inline
 */

export function procesarTextoParaPDF(text) {
  if (!text) return '';

  let cleanText = text
    // --- LIMPIEZA DE LATEX ---
    .replace(/\\quad/g, '\n')
    .replace(/\\qquad/g, '\n')
    .replace(/\\,/g, ' ')
    .replace(/\\:/g, ' ')
    .replace(/\\;/g, ' ')
    .replace(/\\!/g, '')
    .replace(/\\enspace/g, ' ')
    .replace(/\\hspace\{[^}]*\}/g, ' ')
    .replace(/\\\(/g, '')
    .replace(/\\\)/g, '')
    .replace(/\\\[/g, '')
    .replace(/\\\]/g, '')
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1 / $2)')
    .replace(/\\times/g, ' × ')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\sum/g, '∑')
    .replace(/\\approx/g, '≈')
    .replace(/\\cdot/g, '•')
    .replace(/\\{/g, '')
    .replace(/\\}/g, '')
    .replace(/\^2/g, '²')
    .replace(/\s+COP\/m²/g, ' COP/m²')
    .replace(/Promedio precio por m²\s*=\s*(?:\\frac\{[^{}]+\}\{[^{}]+\}|[^\n≈]+)\s*≈\s*([\d\.\,]+)\s*COP\/m²/gi, 'Promedio precio por m² ≈ $1 COP/m²')

    // --- LIMPIEZA DE HTML ENTITIES ---
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

    // --- CONVERTIR NOTACIÓN CIENTÍFICA ---
    .replace(/(\d+(?:[.,]\d+)?)\s*[×x]\s*10\^(\d+)/gi, (match, coefficient, exponent) => {
      const num = parseFloat(coefficient.replace(',', '.'));
      const power = parseInt(exponent);
      const result = num * Math.pow(10, power);
      return Math.round(result).toLocaleString('es-CO');
    })

    // --- LIMPIAR SEPARADORES ---
    .replace(/[═]+/g, '')
    .replace(/\s+--\s+/g, ' ')
    .replace(/\s*-{3,}\s*/g, '\n\n')

    // --- CONVERTIR MARKDOWN A HTML BÁSICO ---
    // URLs Markdown: [Texto](URL) → <a href...>
    .replace(/(?:\*\*)?\[([^\]]+)\]\(([^)]+)\)(?:\*\*)?/g, (match, text, url) => {
      return `<a href="${url}" style="color: #2C3D37; text-decoration: underline;">${text}</a>`;
    })

    // Negritas: **texto** → <strong>texto</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    // TABLAS: Separar tablas del contenido anterior/posterior con \n\n
    // Solo si hay una transición real (No-Tabla -> Tabla o viceversa)
    .replace(/^([^|\s].*)\n(\s*\|)/gm, '$1\n\n$2')
    .replace(/^(\s*\|.*)\n([^|\s])/gm, '$1\n\n$2')

    // Limpiar etiquetas [1], [2], etc.
    .replace(/\[\d+\]/g, '');

  // --- PROCESAR BADGES (fuente_validacion) ---
  const getBadgeText = (validation) => {
    const val = validation.trim().toLowerCase();
    if (val === 'coincidencia') return '✓ Coincidencia';
    if (val === 'verificado') return '✓ Verificado';
    if (val === 'zona_similar') return '→ Zona Similar';
    if (val === 'zona_extendida') return '≈ Zona Extendida';
    return validation.trim();
  };

  // Formato: fuente_validacion: valor
  cleanText = cleanText.replace(/fuente_validacion:\s*([^\r\n<]+)/gi, (match, validation) => {
    return `[${getBadgeText(validation)}]`;
  });

  // Etiquetas sueltas (sin paréntesis)
  cleanText = cleanText.replace(/(?<!\()\b(coincidencia|verificado|zona_extendida|zona_similar)\b/gi, (match, tag) => {
    return `[${getBadgeText(tag)}]`;
  });

  // --- PROCESAR NOTAS (Corregido para MULTILÍNEA con LÍNEAS EN BLANCO INTERNAS) ---
  cleanText = cleanText.replace(/(?:<strong>)?(?:\*)?Nota:(?:\*)?(?:<\/strong>)?\s*([\s\S]+?)(?=\n+\*\*[A-ZÁÉÍÓÚÑ]|\n+#{1,3}\s|\n+\||\n+\d+\.\s+[A-ZÁÉÍÓÚÑ]|$)/gi, (match, noteText) => {
    let formattedNote = noteText.trim().replace(/\*+$/, '');

    // Simplificar nota de distancia
    const pattern1 = /(.+?)\s+está\s+a\s+(\d+)\s*km\s+de\s+[^,]+,?\s*(.+)/i;
    const match1 = formattedNote.match(pattern1);

    if (match1) {
      const distance = match1[2];
      let characteristics = match1[3];
      characteristics = characteristics
        .replace(/^con\s+/i, 'tiene ')
        .replace(/^condiciones\s+/i, 'tiene condiciones ');
      formattedNote = `A ${distance} km de distancia, ${characteristics}`;
    }

    // Proteger saltos de línea internos para evitar que el split('\n\n') rompa el bloque
    formattedNote = formattedNote.replace(/\n+/g, '<br>');

    return `<em style="font-size: 11px; color: #666; display: block; margin-top: 4px;">NOTA: ${formattedNote}</em>`;
  });

  // --- UNIFICAR TABLAS ROTAS ---
  // Eliminar \n\n entre líneas que empiezan por |
  let previousText = cleanText;
  do {
    previousText = cleanText;
    cleanText = cleanText.replace(/(^\s*\|[^\n]*)\n{2,}(\s*\|)/gm, '$1\n$2');
  } while (cleanText !== previousText);

  // --- SPLIT EN PÁRRAFOS Y PROCESAR BLOQUES ---
  const blocks = cleanText.split('\n\n');
  let htmlOutput = '';

  blocks.forEach(block => {
    const trimmed = block.trim();
    if (!trimmed) return;

    // Detectar títulos con markdown (#, ##, ###) - debe detectar al inicio del bloque
    // AHORA: si hay contenido adicional después del título, procesarlo también
    const hashMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (hashMatch) {
      const level = hashMatch[1].length;
      // Separar título del resto del contenido (si existe)
      const lines = trimmed.split('\n');
      const titleText = lines[0].replace(/^#{1,3}\s+/, '').trim();
      const remainingContent = lines.slice(1).join('\n').trim();

      if (level === 1) {
        // # Título principal - más grande, con borde
        htmlOutput += `<h2 style="font-size: 14px; font-weight: bold; color: #2C3D37; margin-top: 16px; margin-bottom: 8px; border-bottom: 2px solid #C9C19D; padding-bottom: 6px;">${titleText}</h2>\n`;
      } else if (level === 2) {
        // ## Título secundario
        htmlOutput += `<h3 style="font-size: 13px; font-weight: bold; color: #2C3D37; margin-top: 12px; margin-bottom: 6px; border-bottom: 1px solid #C9C19D; padding-bottom: 4px;">${titleText}</h3>\n`;
      } else {
        // ### Subtítulo
        htmlOutput += `<h4 style="font-size: 12px; font-weight: bold; color: #2C3D37; margin-top: 10px; margin-bottom: 5px;">${titleText}</h4>\n`;
      }

      // Si hay contenido adicional después del título, procesarlo como párrafo/lista
      if (remainingContent) {
        // Detectar si es una lista (empieza con -, *, • o número)
        const listLines = remainingContent.split('\n').filter(line =>
          line.match(/^[-*•]\s/) || line.match(/^\d+[\.\)]\s/)
        );

        if (listLines.length >= 1 && remainingContent.match(/^[-*•\d]/)) {
          // Procesar como lista
          const items = [];
          let currentItem = '';

          for (const line of remainingContent.split('\n')) {
            if (line.match(/^[-*•]\s/) || line.match(/^\d+[\.\)]\s/)) {
              if (currentItem) items.push(currentItem);
              currentItem = line.replace(/^(?:[-*•]|\d+[\.\)])\s*/, '');
            } else if (line.trim()) {
              currentItem += ' ' + line.trim();
            }
          }
          if (currentItem) items.push(currentItem);

          htmlOutput += '<ul style="margin: 4px 0; padding-left: 0; list-style: none;">\n';
          items.forEach(item => {
            htmlOutput += `  <li style="margin-bottom: 3px; line-height: 1.5;">• ${item}</li>\n`;
          });
          htmlOutput += '</ul>\n';
        } else {
          // Procesar como párrafo normal
          const paragraphHTML = remainingContent.replace(/\n/g, '<br>');
          htmlOutput += `<p style="margin-bottom: 10px; line-height: 1.6; text-align: justify; font-size: 12px;">${paragraphHTML}</p>\n`;
        }
      }
      return;
    }

    // Detectar títulos (números seguidos de texto): "1. Título" o "2.1. Subtítulo"
    // AHORA: Detectar en la primera línea y procesar contenido adicional
    const firstLine = trimmed.split('\n')[0];
    const numberedTitleMatch = firstLine.match(/^(\d+(?:\.\d+)?\.?)\s+([^:\n]{3,120})/);

    if (numberedTitleMatch && firstLine.length < 120) {
      const titleText = numberedTitleMatch[2].trim();
      const lines = trimmed.split('\n');
      const remainingContent = lines.slice(1).join('\n').trim();

      // Renderizar título
      htmlOutput += `<h4 style="font-size: 13px; font-weight: bold; color: #2C3D37; margin-top: 14px; margin-bottom: 8px;">${titleText}</h4>\n`;

      // Si hay contenido adicional después del título, procesarlo
      if (remainingContent) {
        // Detectar si es una lista (empieza con -, *, • o número)
        const listLines = remainingContent.split('\n').filter(line =>
          line.match(/^[-*•]\s/) || line.match(/^\d+[\.\)]\s/)
        );

        if (listLines.length >= 1 && remainingContent.match(/^[-*•\d]/)) {
          // Procesar como lista
          const items = [];
          let currentItem = '';

          for (const line of remainingContent.split('\n')) {
            if (line.match(/^[-*•]\s/) || line.match(/^\d+[\.\)]\s/)) {
              if (currentItem) items.push(currentItem);
              currentItem = line.replace(/^(?:[-*•]|\d+[\.\)])\s*/, '');
            } else if (line.trim()) {
              currentItem += ' ' + line.trim();
            }
          }
          if (currentItem) items.push(currentItem);

          htmlOutput += '<ul style="margin: 4px 0; padding-left: 0; list-style: none;">\n';
          items.forEach(item => {
            htmlOutput += `  <li style="margin-bottom: 3px; line-height: 1.5;">• ${item}</li>\n`;
          });
          htmlOutput += '</ul>\n';
        } else {
          // Procesar como párrafo normal
          const paragraphHTML = remainingContent.replace(/\n/g, '<br>');
          htmlOutput += `<p style="margin-bottom: 10px; line-height: 1.6; text-align: justify; font-size: 12px;">${paragraphHTML}</p>\n`;
        }
      }
      return;
    }

    // Detectar tablas (comienzan con |)
    if (trimmed.startsWith('|')) {
      const allRows = trimmed.split('\n');

      // Filtramos líneas vacías y SEPARADORES de markdown (|---|)
      const tableRows = allRows.filter(r => {
        const clean = r.trim();
        if (!clean) return false;
        // Ignorar líneas que contienen solo -, :, |, espacios
        if (clean.match(/^[\|\s\-:]+$/)) return false;
        // Ignorar líneas como |-----| o |:---:|
        if (clean.includes('---') || clean.includes('--')) return false;
        // Verificar contenido válido (al menos una celda con texto alfanumérico)
        const cells = clean.split('|').filter(c => c.trim() !== '');
        const hasRealContent = cells.some(c => /[a-zA-Z0-9]/.test(c));
        return cells.length > 0 && hasRealContent;
      });

      if (tableRows.length === 0) return;

      let tableHTML = '<table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px;">\n';

      const dataRows = [];
      const footerRows = [];

      tableRows.forEach((row, idx) => {
        const cleanRow = row.trim().replace(/^\||\|$/g, '');
        const cells = cleanRow.split('|');
        const validCells = cells.filter(c => c.trim() !== '');
        const pipeCount = (row.match(/\|/g) || []).length;
        const headerPipeCount = (tableRows[0].match(/\|/g) || []).length;

        // Un footer debe tener pocos separadores O ser texto largo en una sola celda
        const isFooterContent = (validCells.length === 1 && pipeCount < headerPipeCount && idx > 0) ||
          row.toLowerCase().includes('ajuste total') ||
          row.toLowerCase().includes('valor final');

        if (isFooterContent && idx > 0) {
          footerRows.push({ row, isTotal: row.toLowerCase().includes('ajuste total') });
        } else {
          dataRows.push(row);
        }
      });

      // Calcular el número máximo de columnas basado en el header
      const headerRow = dataRows[0] ? dataRows[0].trim().replace(/^\||\|$/g, '') : '';
      const numCols = headerRow.split('|').length;

      // Generar tabla HTML
      dataRows.forEach((row, idx) => {
        const cleanRow = row.trim().replace(/^\||\|$/g, '');
        let cells = cleanRow.split('|').map(c => c.trim());
        const validContent = cells.filter(c => c.trim() !== '');

        // Saltar filas vacías (excepto header)
        if (validContent.length === 0 && idx > 0) return;

        // ASEGURAR MISMO NÚMERO DE COLUMNAS QUE EL HEADER
        while (cells.length < numCols) cells.push('');
        if (cells.length > numCols) cells = cells.slice(0, numCols);

        const isHeader = idx === 0;

        tableHTML += '  <tr>\n';
        cells.forEach((cell, cIdx) => {
          const align = cIdx === 0 ? 'left' : 'center';
          if (isHeader) {
            // Header: fondo beige, negrita, alineado como data
            tableHTML += `    <th style="background: #F0ECD9; padding: 6px; border: 1px solid #ddd; font-weight: bold; text-align: ${align};">${cell}</th>\n`;
          } else {
            // Data row: sin fondo, sin negrita, alineado consistente
            tableHTML += `    <td style="padding: 6px; border: 1px solid #ddd; text-align: ${align};">${cell}</td>\n`;
          }
        });
        tableHTML += '  </tr>\n';
      });

      tableHTML += '</table>\n';

      // Renderizar Footer (fuera de tabla)
      if (footerRows.length > 0) {
        tableHTML += '<div style="background-color: #F9FAF9; border-top: 1px solid #E0E5E2; padding: 10px; margin-top: -10px; margin-bottom: 15px; border-radius: 0 0 8px 8px;">\n';
        footerRows.forEach(item => {
          const content = item.row.trim().replace(/^\||\|$/g, '').trim();
          if (item.isTotal) {
            tableHTML += `<div style="margin-top: 8px; padding: 8px; background-color: #F8F6EF; border-top: 1px solid #D4C8A8; text-align: center; font-weight: bold; color: #2C3D37; font-size: 13px;">${content}</div>\n`;
          } else {
            tableHTML += `<p style="margin-bottom: 6px; text-align: justify; font-style: italic; color: #4F5B55; font-size: 11px; line-height: 1.4;">${content}</p>\n`;
          }
        });
        tableHTML += '</div>\n';
      }

      htmlOutput += tableHTML;
      return;
    }

    // Detectar listas (comienzan con -, *, • o números seguidos de texto corto)
    // IMPORTANTE: Solo detectar como lista si tiene MÚLTIPLES líneas que empiezan con viñetas/números
    const listLines = trimmed.split('\n').filter(line =>
      line.match(/^[-*•]\s/) || (line.match(/^\d+[\.\)]\s[^:]{0,50}$/) && !line.match(/^\d+\.\d+/))
    );

    // Solo procesar como lista si hay 2+ ítems
    if (listLines.length >= 2 && (trimmed.match(/^[-*•]\s/) || trimmed.match(/^\d+[\.\)]\s/))) {
      const lines = trimmed.split('\n');
      const items = [];
      let currentItem = '';

      for (const line of lines) {
        if ((line.match(/^[-*•]\s/) || line.match(/^\d+[\.\)]\s/)) && !line.match(/^\d+\.\d+/)) {
          if (currentItem) items.push(currentItem);
          currentItem = line.replace(/^(?:[-*•]|\d+[\.\)])\s*/, '');
        } else if (line.trim()) {
          currentItem += ' ' + line.trim();
        }
      }
      if (currentItem) items.push(currentItem);

      htmlOutput += '<ul style="margin: 4px 0; padding-left: 0; list-style: none;">\n';
      items.forEach(item => {
        htmlOutput += `  <li style="margin-bottom: 3px; line-height: 1.5;">• ${item}</li>\n`;
      });
      htmlOutput += '</ul>\n';
      return;
    }

    // Párrafo normal
    const paragraphHTML = trimmed.replace(/\n/g, '<br>');
    htmlOutput += `<p style="margin-bottom: 10px; line-height: 1.6; text-align: justify; font-size: 12px;">${paragraphHTML}</p>\n`;
  });

  return htmlOutput;
}
