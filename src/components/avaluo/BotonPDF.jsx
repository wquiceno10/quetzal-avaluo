import React, { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { construirTextoConfianza } from '@/lib/confidenceHelper';
import { mapearEstadoSinPrecio } from '@/lib/utils';

const BotonPDF = forwardRef(({ formData, confianzaInfo, className, size }, ref) => {
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

      // Helpers para badges de fuente_validacion
      // Helpers para badges de fuente_validacion
      const getBadgeClass = (validation) => {
        const val = (validation || '').toLowerCase();
        // coincidencia -> success (Verde)
        // verificado -> success (Verde/Emerald)
        // zona_similar -> info (Azul)
        // zona_extendida -> warning (Naranja/Amarillo)

        if (val === 'coincidencia') return 'success';
        if (val === 'verificado') return 'success';
        if (val === 'zona_similar') return 'info';
        if (val === 'zona_extendida') return 'warning';

        return 'secondary';
      };

      const getFuenteLabel = (validation) => {
        const val = (validation || '').toLowerCase();
        if (val === 'coincidencia') return '✓ Coincidencia';
        if (val === 'verificado') return '✓ Verificado';
        if (val === 'zona_similar') return '→ Zona Similar';
        if (val === 'zona_extendida') return '≈ Zona Extendida';

        return 'Dato';
      };

      // Helper: Convertir texto a Title Case (Primera Letra Mayúscula)
      const toTitleCase = (str) => {
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

      // Helper para generar tablas HTML con estilos
      const generateTableHtml = (rows) => {
        if (!rows.length) return '';
        const htmlRows = rows.map((row, i) => {
          const cells = row.split('|').filter(c => c.trim() !== '');
          if (cells.length === 0) return '';
          const tag = i === 0 ? 'th' : 'td';

          const inner = cells.map((c, cIdx) => {
            let align = 'center';
            if (cIdx === 0) align = 'left';
            else if (cIdx === cells.length - 1) align = 'right';

            let style = `padding:8px; border-bottom:1px solid #f0f0f0; color:#4F5B55; vertical-align:middle; text-align:${align};`;
            if (i === 0) {
              // Header: Menos padding vertical
              style = `background:#F0ECD9; font-weight:600; padding:4px 8px; border-bottom:1px solid #ddd; color:#2C3D37; vertical-align:middle; text-align:${align};`;
            }

            return `<${tag} style="${style}">${c.trim()}</${tag}>`;
          }).join('');
          return `<tr>${inner}</tr>`;
        }).join('');
        return `
          <div style="overflow-x:auto; margin:15px 0; border:1px solid #E0E5E2; border-radius:8px; background:#fff;">
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              <tbody>${htmlRows}</tbody>
            </table>
          </div>
        `;
      };

      const formatText = (text) => {
        if (!text) return '';

        // 1. Limpieza Inicial (Artefactos y LaTeX) - Sincronizado con Step3Results
        let cleanText = text
          // Eliminar líneas horizontales MD (reforzado)
          .replace(/^-{3,}\s*$/gm, '')
          .replace(/^[ \t]*[-_]{2,}[ \t]*$/gm, '')
          // Eliminar saltos de línea excesivos
          .replace(/\n{3,}/g, '\n\n')
          // INJECT DEFAULT NOTES IF MISSING (Fallback) - Sincronizado con Step3Results
          // Detecta si falta nota (considerando variantes como *Nota:, Nota:, **NOTA:**, *TextoItalico*)
          // CRÍTICO: Soporta CRLF (Windows) y LF (Unix) line endings
          .replace(/(fuente_validacion:\s*(?:coincidencia|zona_extendida|zona_similar))(?!\s*[\r\n]+\s*(?:(?:\*+)?NOTA:(?:\*+)?|(?:\*+)?Nota:(?:\*+)?|\*(?!\s)))/gi, (match, prefix) => {
            let note = "";
            let p = prefix.toLowerCase();
            if (p.includes("zona_extendida")) note = "Similitud socioeconómica en otra zona.";
            else if (p.includes("coincidencia")) note = "Anuncio de listado en la misma zona.";
            else if (p.includes("zona_similar")) note = "Ubicación cercana con mercado comparable.";
            return `${prefix}\n**NOTA:** ${note}`;
          })
          // LaTeX spacing commands (NEW)
          .replace(/\\quad/g, '<br>')        // \quad → line break
          .replace(/\\qquad/g, '<br>')       // \qquad → line break
          .replace(/\\,/g, ' ')              // thin space
          .replace(/\\:/g, ' ')              // medium space
          .replace(/\\;/g, ' ')              // thick space
          .replace(/\\!/g, '')               // negative thin space
          .replace(/\\enspace/g, ' ')
          .replace(/\\hspace\{[^}]*\}/g, ' ')
          // End LaTeX spacing commands
          // Limpiar LaTeX básico
          .replace(/\\\(/g, '')
          .replace(/\\\)/g, '')
          .replace(/\\\[/g, '')
          .replace(/\\\]/g, '')
          .replace(/\\text\{([^}]+)\}/g, '$1')
          // LaTeX \frac con soporte de espacios
          .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1 / $2')
          .replace(/\\sum/g, '∑')
          .replace(/\\approx/g, '≈')
          // Limpiar unidades duplicadas
          .replace(/\s+COP\/m²/g, ' COP/m²')
          // Convertir markdown bold a HTML
          // CRÍTICO: Asegurar que esto es lo ÚLTIMO que se hace antes de retornar o que no se escape después
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          // Eliminar citaciones numéricas [1][2][3]...
          .replace(/\[\d+\]/g, '');


        // Normalizar "Promedio precio..."
        cleanText = cleanText.replace(
          /Promedio precio por m²\s*=\s*(?:\\frac\{[^{}]+\}\{[^{}]+\}|[^\n≈]+)\s*≈\s*([\d\.\,]+)\s*COP\/m²/gi,
          'Promedio precio por m² ≈ $1 COP/m²'
        );

        // NO eliminar números de títulos - necesarios para detectar secciones principales
        // cleanText = cleanText.replace(/^[\d\.]+\s+(?=[A-Z])/gm, '');

        // 2. Detectar y Formatear Tablas Markdown
        const lines = cleanText.split('\n');
        let newLines = [];
        let inTable = false;
        let tableRows = [];

        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('|')) {
            if (!inTable) inTable = true;
            if (!trimmed.includes('---')) {
              tableRows.push(trimmed);
            }
          } else {
            if (inTable) {
              newLines.push(generateTableHtml(tableRows));
              tableRows = [];
              inTable = false;
            }
            newLines.push(line);
          }
        });
        if (inTable) {
          newLines.push(generateTableHtml(tableRows));
        }

        cleanText = newLines.join('\n');

        // Limpiar notación científica: 3.18 × 10^6 → 3.180.000
        cleanText = cleanText.replace(/(\d+(?:[.,]\d+)?)\s*[×x]\s*10\^(\d+)/gi, (match, coefficient, exponent) => {
          const num = parseFloat(coefficient.replace(',', '.'));
          const power = parseInt(exponent);
          const result = num * Math.pow(10, power);
          return Math.round(result).toLocaleString('es-CO');
        });

        // 3. Convertir markdown a HTML con estilos mejorados
        cleanText = cleanText
          // Limpiar HTML entities escapados (IGUAL QUE WEB - antes del procesamiento)
          .replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>')
          // Negritas (asegurar que cierra) - REFUERZO
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // --- POST-PROCESAMIENTO: DESTACAR PALABRAS CLAVE (IGUAL QUE WEB) ---
        const keyPhrasePatterns = [
          // Análisis de métodos
          /\b(Promedio de precios de venta de \d+ comparables):/gi,
          /\b(Precio por m² promedio):/gi,
          /\b(Precio\/m² ajustado):/gi,
          /\b(Canon mensual estimado):/gi,
          /\b(Yield promedio mercado):/gi,
          /\b(Valor total):/gi,
          /\b(Valor estimado):/gi,
          /\b(Factor total):/gi,

          // Ajustes
          /^(Justificación):/gim,
          /^(Porcentaje aplicado):/gim,
          /\b(Ajuste por antigüedad):/gi,
          /\b(Ajuste por estado):/gi,
          /\b(Ajuste por ubicación):/gi,
          /\b(Ajuste por reformas):/gi,

          // Pasos metodológicos
          /\b(PASO \d+):/gi,

          // Resultados
          /\b(Valor Recomendado de Venta):/gi,
          /\b(Rango sugerido):/gi,
          /\b(Precio m² final):/gi,
        ];

        keyPhrasePatterns.forEach(pattern => {
          cleanText = cleanText.replace(pattern, (match, group1) => {
            // Si ya está en <strong>, no duplicar
            if (cleanText.includes(`<strong>${group1}</strong>`)) return match;
            return `<strong>${group1}</strong>:`;
          });
        });

        return cleanText
          // Limpiar ## inline que no están al inicio de línea
          .replace(/\s+##\s+/g, ' - ')
          // 1. URLs Markdown: **[Portal](URL)** o [Portal](URL) -> <a href...> (VERDE CORPORATIVO)
          .replace(/(?:\*\*)?\[([^\]]+)\]\(([^)]+)\)(?:\*\*)?/g, (match, text, url) => {
            return `<strong><a href="${url}" target="_blank" style="color:#2C3D37; text-decoration:none;">${text}</a></strong>`;
          })
          // Limpiar símbolos extraños y SEPARADORES antes de etiquetas (═══, --)
          .replace(/[═]+/g, '')
          .replace(/\s+--\s+/g, ' ')
          // 2. Bold Markdown normal
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          // Títulos con ### markdown (ej: "### 2.1. Método..." o "## 2. Análisis...")
          // Primero convertir a formato de título con salto de línea ANTES de eliminar #
          .replace(/^(#{1,3})\s*(\d+(?:\.\d+)?\.?\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñÑ ()²\-,]+)/gm, (_match, hashes, title) => {
            const level = hashes.length;
            const formattedTitle = toTitleCase(title.trim());
            if (level <= 2 || !title.includes('.')) {
              // Títulos principales (## o solo un dígito sin punto decimal)
              return `<h4 style="font-size:14px; margin:16px 0 8px 0; color:#2C3D37; font-weight:700; border-bottom:1px solid #C9C19D; padding-bottom:4px;">${formattedTitle}</h4>`;
            } else {
              // Subsecciones (### o dígitos con decimal como 2.1, 3.2)
              return `<h5 style="font-size:13px; margin:12px 0 6px 0; color:#2C3D37; font-weight:700;">${formattedTitle}</h5>`;
            }
          })
          // Títulos principales SIN # (solo 1 dígito: "5. LIMITACIONES", "6. RESUMEN EJECUTIVO")
          .replace(/^(\d{1}\.?\s+[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑA-Z a-zÁÉÍÓÚáéíóúñÑ]{3,})$/gm, (_match, title) => {
            const formattedTitle = toTitleCase(title.trim());
            return `<h4 style="font-size:14px; margin:16px 0 8px 0; color:#2C3D37; font-weight:700; border-bottom:1px solid #C9C19D; padding-bottom:4px;">${formattedTitle}</h4>`;
          })
          // Subsecciones SIN # (ej: "3.1. Método", "3.4. VALOR TOTAL") → <h5> sin borde
          .replace(/^(\d+\.\d+\.?\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñÑ ()²\-,]{3,})$/gm, (_match, title) => {
            const formattedTitle = toTitleCase(title.trim());
            return `<h5 style="font-size:13px; margin:12px 0 6px 0; color:#2C3D37; font-weight:700;">${formattedTitle}</h5>`;
          })
          // PROCESAR BADGES - MÚLTIPLES FORMATOS
          // 1. Formato con fuente_validacion: prefijo
          .replace(/(<\/strong>|<\/a>)\s*fuente_validacion:\s*([^\r\n<]+)/gi, (match, tagEnd, validation) => {
            const val = validation.trim().toLowerCase();
            let badgeStyle = '';
            let badgeText = validation.trim();

            if (val === 'coincidencia') {
              badgeStyle = 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;';
              badgeText = '✓ Coincidencia';
            } else if (val === 'verificado') {
              badgeStyle = 'background:#ecfdf5; color:#047857; border:1px solid #6ee7b7;';
              badgeText = '✓ Verificado';
            } else if (val === 'zona_similar') {
              badgeStyle = 'background:#dbeafe; color:#1e40af; border:1px solid #93c5fd;';
              badgeText = '→ Zona Similar';
            } else if (val === 'zona_extendida') {
              badgeStyle = 'background:#fef3c7; color:#92400e; border:1px solid #fcd34d;';
              badgeText = '≈ Zona Extendida';
            } else {
              badgeStyle = 'background:#f3f4f6; color:#6b7280; border:1px solid #d1d5db;';
            }

            return `${tagEnd} <span style="display:inline-block; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:500; margin-left:4px; vertical-align:middle; ${badgeStyle}">${badgeText}</span>`;
          })
          // 2. Formato legacy: fuente_validacion: al inicio
          .replace(/^fuente_validacion:\s*([^\r\n<]+)/gim, (match, validation) => {
            const val = validation.trim().toLowerCase();
            let badgeStyle = '';
            let badgeText = validation.trim();

            if (val === 'verificado') {
              badgeStyle = 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;';
              badgeText = '✓ Coincidencia';
            } else {
              badgeStyle = 'background:#f3f4f6; color:#6b7280; border:1px solid #d1d5db;';
            }
            return `<span style="display:inline-block; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:500; ${badgeStyle}">${badgeText}</span>`;
          })
          // 3. CRÍTICO: Etiquetas sueltas (sin fuente_validacion:) 
          // FIX: EVITAR DUPLICADOS SI ESTÁ ENTRE PARÉNTESIS (ej. "(zona_similar, ...)")
          .replace(/(\()?\b(coincidencia|verificado|zona_similar|zona_extendida)\b/gi, (match, parenthesis, tag) => {
            if (parenthesis) return match; // Si hay paréntesis antes, ignorar

            const val = tag.trim().toLowerCase();
            let badgeStyle = '';
            let badgeText = tag.trim();

            if (val === 'coincidencia') {
              badgeStyle = 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;';
              badgeText = '✓ Coincidencia';
            } else if (val === 'verificado') {
              badgeStyle = 'background:#ecfdf5; color:#047857; border:1px solid #6ee7b7;';
              badgeText = '✓ Verificado';
            } else if (val === 'zona_similar') {
              badgeStyle = 'background:#dbeafe; color:#1e40af; border:1px solid #93c5fd;';
              badgeText = '→ Zona Similar';
            } else if (val === 'zona_extendida') {
              badgeStyle = 'background:#fef3c7; color:#92400e; border:1px solid #fcd34d;';
              badgeText = '≈ Zona Extendida';
            } else {
              badgeStyle = 'background:#f3f4f6; color:#6b7280; border:1px solid #d1d5db;';
            }
            return `<span style="display:inline-block; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:500; ${badgeStyle}">${badgeText}</span>`;
          })
          // NOTA con formato mejorado (tamaño 10px y NOTA: en negrita)
          // Regex flexible Sincronizado con Step3Results
          .replace(/(?:<strong>)?(?:\*)?Nota:(?:\*)?(?:<\/strong>)?\s*([^\n]+)/gi, (match, noteText) => {
            let formattedNote = noteText.trim()
              // Limpiar asteriscos finales
              .replace(/\*+$/, '');

            // Patrón: "Ciudad está a X km de Objetivo, [con/condiciones] características..."
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

            return `<span style="display:block; font-size:10px; color:#6B7280; font-style:italic; margin-top:4px; margin-bottom:12px; line-height:1.3; text-align:left;"><strong>NOTA:</strong> ${formattedNote}</span>`;
          })
          // Formatear notas "huerfanas" en itálicas (sin prefijo Nota:)
          .replace(/(?:^|\n)\s*\*([^*]{10,})\*\s*(?:\n|$)/g, (match, noteText) => {
            let formattedNote = noteText.trim();

            // Misma lógica de limpieza de distancia
            const pattern1 = /(.+?)\s+está\s+a\s+(\d+)\s*km\s+de\s+[^,]+,?\s*(.+)/i;
            const match1 = formattedNote.match(pattern1);
            if (match1) {
              const distance = match1[2];
              let characteristics = match1[3];
              characteristics = characteristics.replace(/^con\s+/i, 'tiene ').replace(/^condiciones\s+/i, 'tiene condiciones ');
              formattedNote = `A ${distance} km de distancia, ${characteristics}`;
            }

            return `<span style="display:block; font-size:10px; color:#6B7280; font-style:italic; margin-top:4px; margin-bottom:12px; line-height:1.3; text-align:left;"><strong>NOTA:</strong> ${formattedNote}</span>`;
          })

          // Listas
          .replace(
            /^\s*[-*•]\s+(.*?)$/gm,
            '<li style="margin-left:18px; font-size:14px; margin-bottom:4px; color:#4F5B55; line-height:1.25;">$1</li>'
          )
          // Párrafos (líneas sueltas que no son tags HTML)
          .replace(
            /^(?!<(h4|li|table|div|strong|span|p))(.+)$/gm,
            '<p style="font-size:14px; line-height:1.25; margin:6px 0; text-align:justify; color:#4F5B55;">$2</p>'
          );
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

            /* CONFIGURACIÓN DE PÁGINA: Sin headers/footers */
            body {
              font-family: 'Outfit', sans-serif;
              font-size: 13px;
              margin: 0;
              padding: 0;
              background: white;
              color: #2C3D37;
            }


            .container {
              max-width: 960px;
              margin: 0 auto;
              padding: 0;
            }


            /* --- ESTILOS ORIGINALES CONSERVADOS --- */
            
            h1 { font-size: 24px; font-weight: 700; margin-bottom: 5px; }
            h2 { font-size: 18px; font-weight: 600; margin: 12px 0 4px; }
            h3 { font-size: 16px; font-weight: 600; margin: 10px 0 6px; }
            h5 { font-size: 13px; font-weight: 700; margin: 12px 0 6px 0; color: #2C3D37; }
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
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .info-section {
              background: #F9FAF9;
              border: 1px solid #E0E5E2;
              border-radius: 12px;
              padding: 20px;
              margin: 25px 0;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
            }
            .info-item {
              display: flex;
              align-items: baseline;
              gap: 8px;
              padding: 2px 0;
              border-bottom: 1px solid #eee;
            }
            .info-item:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 600;
              color: #7A8C85;
              font-size: 12px;
              text-transform: uppercase;
              min-width: 120px;
              font-family: 'Outfit', sans-serif;
            }
            .info-value {
              font-weight: 600;
              color: #2C3D37;
              border-bottom: 1px solid #ddd;
              font-size: 11px;
              line-height: 1.2;
              white-space: normal;
              word-wrap: break-word;
              overflow: visible;
              font-family: 'Outfit', sans-serif;
              vertical-align: middle;
              text-align: center;
            }
            td strong {
              display: block;
              margin-bottom: 2px;
            }
            th { background: #F0ECD9; font-weight: 600; text-align: left; }
            td { vertical-align: top; }
            td.text-center { text-align: center; }
            td.text-right { text-align: right; }
            .badge {
              padding: 3px 7px;
              border-radius: 6px;
              font-size: 10px;
              color: white;
            }
            .badge-venta { background: #4B7F52; }
            .badge-arriendo { background: #2C3D37; }
            .badge-success { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
            .badge-info { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
            .badge-warning { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
            .badge-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
            .note { font-size: 9px; color: #6b7280; font-style: italic; margin-top: 2px; display: block; }
            .sub-text {
              font-size: 9px;
              color: #888;
              font-family: 'Raleway', sans-serif;
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
              page-break-inside: avoid;
              break-inside: avoid;
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
              font-size: 12px;
              line-height: 1.2;
              opacity: 0.9;
              margin-bottom: 8px;
              margin-top: 0px;
              max-width: 90%; 
              font-weight: 300;
              font-family: 'Raleway', sans-serif;
              text-align: justify;
            }
            .analysis-content {
              font-size: 13px;
              line-height: 1.2;
              text-align: justify;
              color: #4F5B55;
              font-family: 'Raleway', sans-serif;
              /* Doble columna - igual que en la página web */
              column-count: 2;
              column-gap: 30px;
            }
             .analysis-content h4 {
              /* NO column-span para que fluya continuamente en columnas */
              margin: 16px 0 8px 0;
              font-size: 14px;
              color: #2C3D37;
              font-weight: 700;
              font-family: 'Outfit', sans-serif;
              break-inside: avoid;
              page-break-inside: avoid;
            }
             .analysis-content li {
              margin-left: 18px;
              margin-bottom: 6px;
              color: #4F5B55;
              font-family: 'Raleway', sans-serif;
              font-size: 14px;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .analysis-content p {
              margin-bottom: 12px;
              color: #4F5B55;
              font-family: 'Raleway', sans-serif;
              font-size: 14px;
              break-inside: avoid;
              page-break-inside: avoid;
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
              font-size: 28px;
              font-weight: 700;
              font-family: 'Outfit', sans-serif;
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
              padding: 14px 18px;
              min-width: 200px;
              max-width: 280px;
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
              line-height: 1.2;
              margin-top: 16px;
              position: relative;
              z-index: 1;
            }

            /* Print Styles */
            @media print {
              @page {
                margin: 15mm 15mm;
                size: letter;
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                padding: 0 !important;
              }

              h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
                break-after: avoid;
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
                width: 100%;
              }
              thead {
                display: table-header-group;
              }
              tr {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
            
            /* Analysis Styles */
            .analysis-section {
              /*margin-top: 30px;*/
              /*border-top: 2px solid #E0E5E2;*/
              padding-top: 0px;
              page-break-inside: auto;
              break-inside: auto;
            }
            .analysis-content h4 {
              color: #2C3D37;
              font-size: 14px;
              margin: 15px 0 8px 0;
            }
             .analysis-content li {
              margin-bottom: 5px;
              font-size: 14px;
              color: #4F5B55;
              font-family: 'Raleway', sans-serif;
            }
            .analysis-content p {
              margin-bottom: 10px;
              font-size: 14px;
              text-align: justify;
              color: #4F5B55;
              font-family: 'Raleway', sans-serif;
            }
            /* Calculation sections (after h5 subsections) use left-align */
            .analysis-content h5 ~ p {
              text-align: left;
            }
            
            /* Two-column layout for analysis content with balanced fill */
            .analysis-content {
              column-count: 2;
              column-gap: 30px;
              column-fill: balance;
            }
            
            /* Centrar cajas de metodología y alertas */
            .analysis-content > div[style*="background"],
            .analysis-content div[style*="background"] {
              margin-left: auto !important;
              margin-right: auto !important;
              max-width: 500px;
            }

            /* Hero Layout Update */
            .hero-content-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 30px;
              margin: 20px 0;
              position: relative;
              z-index: 1;
            }
            .hero-left-col {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .hero-value-block {
              margin-top: auto;
            }
          </style>
        </head>

        <body>


          <div class="container">
            <div class="hero-header">
              <div class="hero-decoration"></div>
              
              <div class="hero-top" style="margin-bottom: 10px;">
                <div class="hero-icon-title">
                  <div class="hero-icon">🏠</div>
                  <h1 class="hero-title">Valor Comercial Estimado</h1>
                </div>
                <div class="hero-badge">⚡ Estimación IA</div>
              </div>
              
              <!-- Property Summary Row -->
              ${!esLote ? `
              <div style="display: flex; gap: 20px; padding: 10px 0; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); position: relative; z-index: 1;">
                <span style="font-size: 14px; color: #D3DDD6;">
                  🏠 ${toTitleCase(formData.tipo_inmueble || 'Inmueble')}
                </span>
                <span style="font-size: 14px; color: #D3DDD6;">
                  📐 ${formatNumber(area)} m²
                </span>
                <span style="font-size: 14px; color: #D3DDD6;">
                  🛏️ ${formData.habitaciones || comparablesData.habitaciones || defaults.habitaciones || '—'} hab
                </span>
                <span style="font-size: 14px; color: #D3DDD6;">
                  🚿 ${formData.banos || comparablesData.banos || defaults.banos || '—'} baños
                </span>
              </div>
              ` : `
              <div style="display: flex; gap: 20px; padding: 10px 0; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); position: relative; z-index: 1;">
                <span style="font-size: 14px; color: #D3DDD6;">
                  🏠 ${toTitleCase(formData.tipo_inmueble || 'Lote')}
                </span>
                <span style="font-size: 14px; color: #D3DDD6;">
                  📐 ${formatNumber(area)} m²
                </span>
                <span style="font-size: 14px; color: #D3DDD6;">
                  📍 ${toTitleCase(formData.uso_lote || comparablesData.uso_lote || defaults.uso_lote || 'Uso no especificado')}
                </span>
              </div>
              `}

              <div class="hero-content-row">
                <div class="hero-left-col">
                  <p class="hero-description" style="max-width: 90%;">
                    ${esLote
          ? 'Valor obtenido a partir del análisis de mercado y método residual, sin aplicar enfoque de rentabilidad.'
          : 'Determinación del valor comercial basada en un análisis técnico ponderado que integra el comportamiento real del mercado local y la validación experta de nuestra inteligencia artificial.'}
                  </p>
                  
                  <div class="hero-value-block">
                    <div class="hero-amount">${formatCurrency(valorEstimadoFinal)}</div>
                    <div class="hero-currency">COP (Pesos Colombianos)</div>
                  </div>
                </div>

                <div class="hero-details-box">
                  <div class="hero-detail-row" style="align-items: flex-start;">
                    <span class="hero-detail-label" style="align-self: center;">Rango Sugerido</span>
                    <div style="text-align: right; line-height: 1.4;">
                      <div class="hero-detail-value">${formatCurrency(rangoMin)}</div>
                      <div class="hero-detail-value">${formatCurrency(rangoMax)}</div>
                    </div>
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

            <div class="grid-2">
              <div class="box">
                <h3>${esLote ? 'Valor Estimado por Mercado' : 'Enfoque de Mercado'}</h3>
                <p style="font-size: 22px; font-weight: 700;">
                  ${formatCurrency(valorVentaDirecta)}
                </p>
                <p style="font-size: 11px; margin-top: 8px;">
                  ${esLote
          ? 'Calculado a partir de la mediana de precio por m² de lotes comparables y ajuste residual.'
          : 'Basado en mediana de precio por m² × área construida.'}
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

            <div class="info-section">
              <h3 style="margin-top: 0; color: #2C3D37; border-bottom: 2px solid #C9C19D; padding-bottom: 8px;">Información Detallada</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Tipo de Inmueble:</span>
                  <span class="info-value">${toTitleCase(formData.tipo_inmueble || '—')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Ubicación:</span>
                  <span class="info-value">${toTitleCase((formData.barrio && formData.barrio !== '—' ? `${formData.barrio}, ` : '') + (formData.municipio || formData.ciudad || '—'))}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Área Construida:</span>
                  <span class="info-value">${formatNumber(area)} m²</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Precio por m²:</span>
                  <span class="info-value">${formatCurrency(precioM2)}/m²</span>
                </div>
                ${!esLote ? `
                <div class="info-item">
                  <span class="info-label">Habitaciones:</span>
                  <span class="info-value">${formData.habitaciones || comparablesData.habitaciones || defaults.habitaciones || '—'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Baños:</span>
                  <span class="info-value">${formData.banos || comparablesData.banos || defaults.banos || '—'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Estrato:</span>
                  <span class="info-value">${formData.estrato || comparablesData.estrato || defaults.estrato || 'No especificado'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Estado:</span>
                  <span class="info-value" style="text-transform: capitalize;">
                    ${(() => {
            const estado = formData.estado_inmueble || formData.estado ||
              comparablesData.estado_inmueble || comparablesData.estado ||
              defaults.estado_inmueble || defaults.estado;
            return mapearEstadoSinPrecio(estado);
          })()}
                  </span>
                </div>
                ` : `
                <div class="info-item">
                  <span class="info-label">Uso del Lote:</span>
                  <span class="info-value">${toTitleCase(formData.uso_lote || comparablesData.uso_lote || defaults.uso_lote || '—')}</span>
                </div>
                `}
                <div class="info-item">
                  <span class="info-label">Comparables:</span>
                  <span class="info-value">${totalComparables} inmuebles</span>
                </div>
                ${!esLote && yieldMensual ? `
                <div class="info-item">
                  <span class="info-label">Yield Mensual:</span>
                  <span class="info-value">${(yieldMensual * 100).toFixed(2)}%</span>
                </div>
                ` : ''}
              </div>
            </div>
            
<!-- SOLIDEZ DEL ANÁLISIS (Caja Visual) -->
            ${confianzaInfo ? `
            <div style="background: ${confianzaInfo.nivel === 'ALTO' ? '#f0fdf4' : confianzaInfo.nivel === 'MEDIO' ? '#eff6ff' : '#fff7ed'}; 
                        border: 1px solid ${confianzaInfo.nivel === 'ALTO' ? '#bbf7d0' : confianzaInfo.nivel === 'MEDIO' ? '#bfdbfe' : '#fed7aa'};
                        border-radius: 8px; 
                        padding: 16px; 
                        margin: 20px 0;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 18px;">ℹ️</span>
                  <h4 style="margin: 0; color: ${confianzaInfo.nivel === 'ALTO' ? '#166534' : confianzaInfo.nivel === 'MEDIO' ? '#1e40af' : '#92400e'}; 
                             font-size: 13px; font-weight: 700; font-family: 'Outfit', sans-serif;">
                    Solidez del Análisis: ${confianzaInfo.label}
                  </h4>
                </div>
                <span style="font-size: 10px; font-weight: 500; color: #6b7280; font-family: 'Outfit', sans-serif;">
                  ${confianzaInfo.nivel === 'ALTO' ? '90%' : confianzaInfo.nivel === 'MEDIO' ? '60%' : '30%'}
                </span>
              </div>
              
              <!-- Progress Bar -->
              <div style="height: 6px; width: 100%; background: #e5e7eb; border-radius: 999px; overflow: hidden; margin-bottom: 12px;">
                <div style="height: 100%; width: ${confianzaInfo?.nivel === 'ALTO' ? '90%' : confianzaInfo?.nivel === 'MEDIO' ? '60%' : '30%'}; background: ${confianzaInfo?.nivel === 'ALTO' ? '#10b981' : confianzaInfo?.nivel === 'MEDIO' ? '#3b82f6' : '#f97316'}; border-radius: 999px;"></div>
              </div>
              
              <!-- Razones -->
              <div style="font-size: 10px; line-height: 1.6; font-family: 'Raleway', sans-serif;">
                ${confianzaInfo?.razones.map((razon, idx) => `
                  <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                    <div style="width: 4px; height: 4px; border-radius: 50%; background: ${confianzaInfo?.nivel === 'ALTO' ? '#10b981' : confianzaInfo?.nivel === 'MEDIO' ? '#3b82f6' : '#f97316'}; margin-top: 6px; flex-shrink: 0;"></div>
                    <p style="margin: 0; line-height: 1.6; font-family: 'Raleway', sans-serif;">${razon}</p>
                  </div>
                `).join('')}
              </div>
            </div>
            ` : ''}

            <!-- ANÁLISIS DETALLADO DEL MODELO -->
            ${comparablesData.perplexity_full_text ? `
            <div class="analysis-section">
              <h3 style="color: #2C3D37; border-bottom: 2px solid #C9C19D; padding-bottom: 8px;">Análisis Detallado del Modelo</h3>
              <div class="analysis-content">
                ${formatText(comparablesData.perplexity_full_text)}
              </div>
            </div>
            ` : ''}

            <!-- Tabla de comparables -->
            <h2 style="margin-top: 30px;">Propiedades Comparables</h2>

            <table style="width: 100%; max-width: 900px; margin: 20px auto;">
              <thead>
                <tr>
                  <th style="text-align:center; vertical-align:middle; min-width: 180px;">Inmueble</th>
                  <th style="text-align:center; vertical-align:middle;">Tipo</th>
                  <th style="text-align:center; vertical-align:middle;">Área</th>
                  ${!esLote ? `<th style="text-align:center; vertical-align:middle; max-width: 50px;">Hab/<br>Baños</th>` : ''}
                  <th style="text-align:center; vertical-align:middle; min-width: 135px;">Precio Publicado</th>
                  ${!esLote ? `<th style="text-align:center; vertical-align:middle; min-width: 135px;">Precio de Venta</th>` : ''}
                  <th style="text-align:center; vertical-align:middle; min-width: 130px;">Precio m²</th>
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
                      <td style="text-align:left; vertical-align:middle;">
                        <strong style="display:block; margin-bottom:2px;">${item.titulo || 'Inmueble'}</strong>
                        <span class="sub-text">${item.barrio || ''}, ${item.municipio || ''}</span>
                        <br>
                        ${(() => {
                const badges = Array.isArray(item.fuente_validacion)
                  ? item.fuente_validacion
                  : [item.fuente_validacion || 'zona_extendida'];

                return badges.map(badge => {
                  const badgeClass = getBadgeClass(badge);
                  const badgeLabel = getFuenteLabel(badge);
                  return `<span class="badge badge-${badgeClass}" style="margin-right:4px;">${badgeLabel}</span>`;
                }).join('');
              })()}
                        ${item.nota_adicional ? `<br><span class="note">${item.nota_adicional.replace(/\[\d+\]/g, '')}</span>` : ''}
                      </td>
                      <td style="text-align:center; vertical-align:middle;"><span class="badge ${badgeClass}">${tipoLabel}</span></td>
                      <td style="text-align:center; vertical-align:middle;">${formatNumber(item.area_m2)} m²</td>
                      ${!esLote ? `<td style="text-align:center; white-space: nowrap; vertical-align:middle;">
                        ${item.habitaciones || '—'} / ${item.banos || '—'}
                      </td>` : ''}
                      <td style="text-align:right; vertical-align:middle;">${formatCurrency(item.precio_publicado)}${esArriendo ? ' <span class="sub-text">/mes</span>' : ''}</td>
                      ${!esLote ? `<td style="text-align:right; vertical-align:middle;">
                        <strong>${formatCurrency(item.precio_cop)}</strong>
                        ${notaArriendo}
                      </td>` : ''}
                      <td style="text-align:right; white-space: nowrap; vertical-align:middle;"><strong>${formatCurrency(item.precio_m2)}</strong></td>
                    </tr>
                  `;
          }).join('')}
              </tbody>
            </table>

            ${!esLote ? `
            <p style="font-size: 10px; color: #666; margin-top: 15px; font-style: italic;">
              Yield mensual utilizado: ${yieldMensual ? (yieldMensual * 100).toFixed(2) + '%' : '0.5%'}.
              Este yield corresponde al promedio observado en arriendos residenciales del mercado local.
            </p>
            ` : ''}

            ${esLote ? `
              <p style="font-size: 10px; color: #888; margin-top: 15px; font-style: italic; text-align: justify;">
                Nota: Ante la escasez de oferta comercial idéntica, se han utilizado lotes campestres y urbanos como referencia base, ajustando sus valores por factores de localización, escala y uso comercial. Se aplicó ajuste por factor de comercialización.
              </p>
            ` : ''}

          </div>
        </body>
        </html>
      `;

      // Abrir PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.document.title = 'Reporte de Avalúo - Quetzal Hábitats';

        // Esperar a que las fuentes se carguen antes de imprimir
        setTimeout(() => {
          printWindow.print();
        }, 1500); // Aumentado de 800ms a 1500ms para asegurar carga de Google Fonts
      }

      return { success: true };
    }
  });

  return (
    <Button
      ref={ref}
      onClick={() => generatePDFMutation.mutate(formData)}
      disabled={generatePDFMutation.isPending}
      className={className || "w-full bg-[#E8E4D0] hover:bg-[#DDD8C4] text-[#2C3D37] rounded-full py-6 text-lg font-medium"}
      size={size}
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
});

BotonPDF.displayName = 'BotonPDF';

export default BotonPDF;