import React from 'react';

export const MarkdownTable = ({ content }) => {
    if (!content || !content.startsWith('|')) return null;

    // Lógica estricta de parsing (idéntica a BotonPDF)
    const rawRows = content.split('\n');
    const rows = rawRows.filter(r => {
        const clean = r.trim();
        // Ignorar separadores md
        if (clean.match(/^\|?[\s\-:]+\|?[\s\-:]*\|?$/)) return false;
        if (clean.includes('---')) return false;
        if (!clean) return false;
        // Verificar contenido
        const cells = clean.split('|').filter(c => c.trim() !== '');
        return cells.length > 0;
    });

    if (rows.length === 0) return null;

    return (
        <div className="mb-4 break-inside-avoid shadow-sm rounded-lg border border-[#E0E5E2] bg-white overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <tbody>
                        {rows.map((row, rIdx) => {
                            // Detectar si es footer (texto largo o total) PARA SALTARLO AQUI
                            const cleanRow = row.trim().replace(/^\|+|\|+$/g, '');
                            let cells = cleanRow.split('|');
                            const validCells = cells.filter(c => c.trim() !== '');
                            const pipeCount = (row.match(/\|/g) || []).length;
                            const headerPipeCount = (rows[0].match(/\|/g) || []).length;
                            const numCols = rows[0].trim().replace(/^\|+|\|+$/g, '').split('|').length;

                            // Un footer debe tener pocos separadores O ser texto largo en una sola celda
                            const isFooterContent = (validCells.length === 1 && pipeCount < headerPipeCount && rIdx > 0) ||
                                row.toLowerCase().includes('ajuste total') ||
                                row.toLowerCase().includes('valor final');

                            if (isFooterContent && rIdx > 0) return null;

                            if (validCells.length === 0 && rIdx > 0) return null;

                            // ASEGURAR MISMO NÚMERO DE COLUMNAS QUE EL HEADER
                            while (cells.length < numCols) cells.push('');
                            if (cells.length > numCols) cells = cells.slice(0, numCols);

                            const isHeader = rIdx === 0;

                            return (
                                <tr key={rIdx} className={isHeader ? "bg-[#F0ECD9]" : ""}>
                                    {cells.map((cell, cIdx) => {
                                        const align = cIdx === 0 ? 'text-left' : 'text-center';
                                        return isHeader ? (
                                            <th
                                                key={cIdx}
                                                className={`p-2 border border-[#ddd] ${align} align-middle whitespace-normal font-bold text-[#2C3D37]`}
                                                style={{ fontSize: '11px', lineHeight: '1.4' }}
                                                dangerouslySetInnerHTML={{ __html: cell.trim() }}
                                            />
                                        ) : (
                                            <td
                                                key={cIdx}
                                                className={`p-2 border border-[#ddd] ${align} align-middle whitespace-normal text-[#4F5B55]`}
                                                style={{ fontSize: '11px', lineHeight: '1.4' }}
                                                dangerouslySetInnerHTML={{ __html: cell.trim() }}
                                            />
                                        );
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer Content separado */}
            {rows.filter((row, rIdx) => {
                const cleanRow = row.trim().replace(/^\||\|$/g, '');
                const cells = cleanRow.split('|');
                const validCells = cells.filter(c => c.trim() !== '');
                const pipeCount = (row.match(/\|/g) || []).length;
                const headerPipeCount = (rows[0].match(/\|/g) || []).length;

                return rIdx > 0 && ((validCells.length === 1 && pipeCount < headerPipeCount) ||
                    row.toLowerCase().includes('ajuste total') ||
                    row.toLowerCase().includes('valor final'));
            }).length > 0 && (
                    <div className="bg-[#F9FAF9] border-t border-[#E0E5E2] p-4 text-sm text-[#4F5B55]">
                        {rows.filter((row, rIdx) => {
                            const cleanRow = row.trim().replace(/^\||\|$/g, '');
                            const cells = cleanRow.split('|');
                            const validCells = cells.filter(c => c.trim() !== '');
                            const pipeCount = (row.match(/\|/g) || []).length;
                            const headerPipeCount = (rows[0].match(/\|/g) || []).length;

                            return rIdx > 0 && ((validCells.length === 1 && pipeCount < headerPipeCount) ||
                                row.toLowerCase().includes('ajuste total') ||
                                row.toLowerCase().includes('valor final'));
                        }).map((row, idx) => {
                            const content = row.trim().replace(/^\||\|$/g, '').trim();
                            if (row.toLowerCase().includes('ajuste total')) {
                                return (
                                    <div key={idx} className="mt-3 pt-3 border-t border-[#D4C8A8] bg-[#F8F6EF] -mx-4 -mb-4 p-4 text-center font-bold text-[#2C3D37] text-base" dangerouslySetInnerHTML={{ __html: content }} />
                                );
                            }
                            return (
                                <p key={idx} className="mb-2 last:mb-0 text-justify italic leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
                            );
                        })}
                    </div>
                )}
        </div>
    );
};
