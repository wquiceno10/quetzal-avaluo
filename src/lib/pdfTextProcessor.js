/**
 * Procesa el texto de análisis de Perplexity para que sea compatible con PDF
 * Convierte el formato markdown/HTML a HTML simple con estilos inline
 */

export function procesarTextoParaPDF(text) {
  if (!text) return '';

  // --- FILTRAR PREÁMBULO TÉCNICO ---
  // Empezamos el reporte desde el primer título de sección real (## 1 o **1. o 1. DESCRIPCIÓN)
  // Se busca un 1 precedido por marcadores de título (# o **) para evitar falsos positivos con listas de comparables.
  let filteredContent = text;
  const startMarkerIndex = text.search(/(?:\n|^)\s*(?:#{1,3}\s*|\*\*?\s*)1[.\s]/i);
  if (startMarkerIndex !== -1) {
    filteredContent = text.substring(startMarkerIndex).trim();
  } else {
    // Fallback: Buscar "1" seguido de "DESCR" en caso de que no tenga marcadores de título
    const fallbackIdx = text.search(/(?:\n|^)\s*1[.\s]\s*DESCR/i);
    if (fallbackIdx !== -1) {
      filteredContent = text.substring(fallbackIdx).trim();
    }
  }

  let cleanText = filteredContent
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

  // --- PROCESAR BADGES (fuente_validacion) - Convertir a HTML styled ---
  const getStyledBadge = (validation) => {
    const val = validation.trim().toLowerCase();
    if (val === 'coincidencia' || val.includes('coincidencia')) {
      return '<span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500;">✓ Coincidencia</span>';
    }

    if (val === 'zona_similar' || val.includes('zona_similar') || val.includes('zona similar')) {
      return '<span style="background: #dbeafe; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500;">→ Zona Similar</span>';
    }
    if (val === 'zona_extendida' || val.includes('zona_extendida') || val.includes('zona extendida')) {
      return '<span style="background: #ffedd5; color: #c2410c; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500;">≈ Zona Extendida</span>';
    }
    return validation.trim();
  };

  // Formato: fuente_validacion: valor
  cleanText = cleanText.replace(/fuente_validacion:\s*([^\r\n<]+)/gi, (match, validation) => {
    return getStyledBadge(validation);
  });

  // Etiquetas sueltas (sin paréntesis)
  cleanText = cleanText.replace(/(?<!\()(?:\[)?(?:I\s*)?(✓\s*Coincidencia[l]?|→\s*Zona\s*Similar|≈\s*Zona\s*Extendida|coincidencia|zona_extendida|zona_similar)(?:\])?/gi, (match, tag) => {
    return getStyledBadge(tag);
  });


  // --- PROCESAR NOTAS (Solo la línea de nota, no bloques enteros) ---
  // El formato de nota es: **Nota:** texto hasta el final de línea o próxima viñeta
  cleanText = cleanText.replace(/(?:<strong>)?(?:\*\*)?Nota:(?:\*\*)?(?:<\/strong>)?\s*([^\n]+)/gi, (match, noteText) => {
    let formattedNote = noteText.trim().replace(/\*+$/, '');

    // Procesar badges dentro de la nota: (I✓ Coincidencial) o similar
    formattedNote = formattedNote
      .replace(/\(I\s*✓\s*Coincidencia[l]?\)/gi, '<span style="background: #dcfce7; color: #15803d; padding: 1px 4px; border-radius: 3px; font-size: 9px;">✓ Coincidencia</span>')
      .replace(/\(\s*→\s*Zona\s*Similar\s*\)/gi, '<span style="background: #dbeafe; color: #1d4ed8; padding: 1px 4px; border-radius: 3px; font-size: 9px;">→ Zona Similar</span>')
      .replace(/\(\s*≈\s*Zona\s*Extendida\s*\)/gi, '<span style="background: #ffedd5; color: #c2410c; padding: 1px 4px; border-radius: 3px; font-size: 9px;">≈ Zona Extendida</span>');

    return `<em style="font-size: 10px; color: #666; display: block; margin-top: 2px;"><strong>Nota:</strong> ${formattedNote}</em>`;
  });


  // --- UNIFICAR TABLAS ROTAS ---
  // Eliminar \n\n entre líneas que empiezan por |
  let previousText = cleanText;
  do {
    previousText = cleanText;
    cleanText = cleanText.replace(/(^\s*\|[^\n]*)\n{2,}(\s*\|)/gm, '$1\n$2');
  } while (cleanText !== previousText);

  // --- SPLIT EN PÁRRAFOS Y PROCESAR BLOQUES ---
  // Split por párrafos (doble salto de línea)
  // Pero NO splitear si el siguiente párrafo empieza por viñeta o número para mantener listas agrupadas
  const blocks = cleanText.split(/\n\n(?![a-z0-9]+[\.\)])/i).filter(b => b.trim());
  let htmlOutput = '';

  // Contador global para listas numeradas (persiste entre bloques)
  let numberedListCounter = 0;
  let wasLastBlockNumberedItem = false;

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
          const isNumberedList = remainingContent.match(/^\d+[\.\)]\s/);

          for (const line of remainingContent.split('\n')) {
            if (line.match(/^[-*•]\s/) || line.match(/^\d+[\.\)]\s/)) {
              if (currentItem) items.push(currentItem);
              currentItem = line.replace(/^(?:[-*•]|\d+[\.\)])\s*/, '');
            } else if (line.trim()) {
              currentItem += '\n' + line.trim();
            }
          }
          if (currentItem) items.push(currentItem);

          if (isNumberedList) {
            htmlOutput += '<ol style="margin: 4px 0; padding-left: 20px;">\n';
            items.forEach(item => {
              htmlOutput += `  <li style="margin-bottom: 3px; line-height: 1.5;">${item}</li>\n`;
            });
            htmlOutput += '</ol>\n';
          } else {
            htmlOutput += '<ul style="margin: 4px 0; padding-left: 0; list-style: none;">\n';
            items.forEach(item => {
              htmlOutput += `  <li style="margin-bottom: 3px; line-height: 1.5;">• ${item}</li>\n`;
            });
            htmlOutput += '</ul>\n';
          }
        } else {
          // Procesar como párrafo normal
          const paragraphHTML = remainingContent.replace(/\n/g, '<br>');
          htmlOutput += `<p style="margin-bottom: 10px; line-height: 1.6; text-align: left; font-size: 12px;">${paragraphHTML}</p>\n`;
        }
      }
      return;
    }

    // Detectar títulos (números seguidos de texto): "1. Título" o "2.1. Subtítulo"
    const firstLine = trimmed.split('\n')[0];
    const numberedTitleMatch = firstLine.match(/^(\d+(?:\.\d+)?\.?)\s+([^:\n]{3,130})/);

    // EXCLUIR: Items de lista con precios ($), flechas (→) o formato de comparables (ej: "1. Casa $")
    const looksLikeListItem = firstLine.includes('$') || firstLine.includes('→') || /^\d+\.\s+\$/.test(firstLine) || /^\d+\.\s+Casa\s/i.test(firstLine);

    if (numberedTitleMatch && firstLine.length < 130 && !looksLikeListItem) {
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
          const isNumberedList = remainingContent.match(/^\d+[\.\)]\s/);

          for (const line of remainingContent.split('\n')) {
            if (line.match(/^[-*•]\s/) || line.match(/^\d+[\.\)]\s/)) {
              if (currentItem) items.push(currentItem);
              currentItem = line.replace(/^(?:[-*•]|\d+[\.\)])\s*/, '');
            } else if (line.trim()) {
              currentItem += '\n' + line.trim();
            }
          }
          if (currentItem) items.push(currentItem);

          if (isNumberedList) {
            htmlOutput += '<ol style="margin: 4px 0; padding-left: 20px;">\n';
            items.forEach(item => {
              htmlOutput += `  <li style="margin-bottom: 3px; line-height: 1.5;">${item}</li>\n`;
            });
            htmlOutput += '</ol>\n';
          } else {
            htmlOutput += '<ul style="margin: 4px 0; padding-left: 0; list-style: none;">\n';
            items.forEach(item => {
              htmlOutput += `  <li style="margin-bottom: 3px; line-height: 1.5;">• ${item}</li>\n`;
            });
            htmlOutput += '</ul>\n';
          }
        } else {
          // Procesar como párrafo normal
          const paragraphHTML = remainingContent.replace(/\n/g, '<br>');
          htmlOutput += `<p style="margin-bottom: 10px; line-height: 1.6; text-align: left; font-size: 12px;">${paragraphHTML}</p>\n`;
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
            tableHTML += `<p style="margin-bottom: 6px; text-align: left; font-style: italic; color: #4F5B55; font-size: 11px; line-height: 1.4;">${content}</p>\n`;
          }
        });
        tableHTML += '</div>\n';
      }

      htmlOutput += tableHTML;
      return;
    }

    // Detectar si es un item numerado individual (ej: "1. " o "**1. ")
    // --- DETECCIÓN DE LISTAS (Motor de alta fidelidad - Igual a Web) ---
    const looksLikeList = trimmed.match(/^[-*•]\s/) || (trimmed.match(/^\d+[.\)]\s/) && !trimmed.match(/^\d+\.\d+/));

    if (looksLikeList) {
      const lines = trimmed.split('\n');
      const items = [];
      let currentItem = '';
      const isNumbered = trimmed.match(/^\d+[.\)]\s/);

      for (const line of lines) {
        if ((line.match(/^[-*•]\s/) || line.match(/^\d+[.\)]\s/)) && !line.match(/^\d+\.\d+/)) {
          if (currentItem) items.push(currentItem);
          currentItem = line.replace(/^(?:[-*•]|\d+[.\)])\s*/, '');
        } else if (line.trim()) {
          currentItem += '\n' + line;
        }
      }
      if (currentItem) items.push(currentItem);

      if (isNumbered) {
        if (!wasLastBlockNumberedItem) {
          htmlOutput += '<ol style="margin: 4px 0; padding-left: 12px; text-align: left; list-style: none; break-inside: auto; page-break-inside: auto;">\n';
        }
        items.forEach(item => {
          numberedListCounter++;

          // Detectar si es un item de comparable (contiene $ y características de propiedad)
          const isComparableItem = item.includes('$') &&
            (item.toLowerCase().includes('apartamento') ||
              item.toLowerCase().includes('casa') ||
              item.toLowerCase().includes('venta') ||
              item.toLowerCase().includes('arriendo') ||
              item.toLowerCase().includes('área'));

          if (isComparableItem) {
            // Formatear como tarjeta de comparable
            const itemLines = item.split('\n').map(l => l.trim()).filter(l => l);
            let formattedHtml = '';

            // Primera línea: título del comparable
            if (itemLines[0]) {
              // Extraer título (antes de "Apartamento" o primer separador)
              const titulo = itemLines[0].split(/(?:Apartamento|Casa|Venta|Arriendo)/i)[0].trim() || itemLines[0];
              formattedHtml += `<strong style="font-size: 13px; color: #2C3D37; display: block; margin-bottom: 4px;">${numberedListCounter}. ${titulo}</strong>`;
            }

            // Resto de líneas como detalles
            itemLines.forEach((line, idx) => {
              if (idx === 0) return; // Ya procesamos el título

              // Detectar si es Nota:
              if (line.toLowerCase().startsWith('nota:')) {
                formattedHtml += `<em style="font-size: 10px; color: #888; display: block; margin-top: 4px;">${line}</em>`;
              } else {
                formattedHtml += `<span style="font-size: 11px; color: #4F5B55; display: block; line-height: 1.4;">${line}</span>`;
              }
            });

            // Envolver todo el item - sin break-inside inline para permitir CSS controlar
            const itemHtml = formattedHtml || item.replace(/\n/g, '<br>');
            htmlOutput += `  <li style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; text-align: left; font-family: 'Raleway', sans-serif;">${itemHtml}</li>\n`;
          } else {
            // Item normal - convertir \n a <br>
            const itemHtml = item.replace(/\n/g, '<br>');
            htmlOutput += `  <li style="margin-bottom: 12px; line-height: 1.3; text-align: left; font-family: 'Raleway', sans-serif;"><span style="font-weight: 600;">${numberedListCounter}.</span> ${itemHtml}</li>\n`;
          }
        });
        wasLastBlockNumberedItem = true;
      } else {
        if (wasLastBlockNumberedItem) {
          htmlOutput += '</ol>\n';
          wasLastBlockNumberedItem = false;
          numberedListCounter = 0;
        }
        htmlOutput += '<ul style="margin: 4px 0; padding-left: 0; list-style: none; text-align: left;">\n';
        items.forEach(item => {
          const itemHtml = item.replace(/\n/g, '<br>');

          htmlOutput += `  <li style="margin-bottom: 8px; line-height: 1.3; text-align: left; font-family: 'Raleway', sans-serif;">• ${itemHtml}</li>\n`;
        });
        htmlOutput += '</ul>\n';
      }
      return;
    }

    // Si no es lista, resetear estado de lista numerada
    if (wasLastBlockNumberedItem) {
      htmlOutput += '</ol>\n';
      wasLastBlockNumberedItem = false;
      numberedListCounter = 0;
    }



    // Párrafo normal
    const paragraphHTML = trimmed.replace(/\n/g, '<br>');
    htmlOutput += `<p style="margin-bottom: 10px; line-height: 1.6; text-align: left; font-size: 12px;">${paragraphHTML}</p>\n`;
  });

  // Cerrar lista numerada pendiente al finalizar
  if (wasLastBlockNumberedItem) {
    htmlOutput += '</ol>\n';
  }

  return htmlOutput;
}
