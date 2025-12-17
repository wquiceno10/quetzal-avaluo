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
        <div className="overflow-x-auto mb-4 break-inside-avoid shadow-sm rounded-lg border border-[#E0E5E2] bg-white">
            <table className="w-full text-xs border-collapse">
                <tbody>
                    {rows.map((row, rIdx) => {
                        const cells = row.split('|').filter(c => c.trim() !== '');
                        if (cells.length === 0) return null;

                        const isHeader = rIdx === 0;
                        const isLastRow = rIdx === rows.length - 1;

                        // Detectar fila Total (tiene celdas vacías en medio)
                        const hasTotal = cells.some(c => c.toLowerCase().includes('total'));
                        const nonEmptyCells = cells.filter(c => c.trim() !== '');
                        const isColspanRow = isLastRow && hasTotal && nonEmptyCells.length <= 2;

                        if (isColspanRow) {
                            // Fila Total con colspan
                            const totalLabel = cells.find(c => c.toLowerCase().includes('total'))?.trim() || 'Total';
                            const totalValue = nonEmptyCells.filter(c => !c.toLowerCase().includes('total')).pop()?.trim() || '';
                            return (
                                <tr key={rIdx} className="bg-[#F8F6EF] border-t-2 border-[#d4c8a8] font-bold text-[#2C3D37]">
                                    <td className="p-2 text-left" dangerouslySetInnerHTML={{ __html: totalLabel }} />
                                    <td
                                        colSpan={3}
                                        className="p-2 text-right"
                                        dangerouslySetInnerHTML={{ __html: totalValue }}
                                    />
                                </tr>
                            );
                        }

                        return (
                            <tr key={rIdx} className={isHeader ? "bg-[#F0ECD9] text-[#2C3D37] font-bold" : "text-[#4F5B55] hover:bg-[#fafaf8]"}>
                                {cells.map((cell, cIdx) => {
                                    const align = cIdx === 0 ? 'text-left' : 'text-center';
                                    // ESTILOS EXACTOS DEL PDF
                                    // Padding: 8px (p-2)
                                    // Font: 11px
                                    // Border: solo bottom
                                    return (
                                        <td
                                            key={cIdx}
                                            className={`p-2 border-b ${isHeader ? 'border-[#ddd]' : 'border-[#f0f0f0]'} ${align} align-middle whitespace-normal`}
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
    );
};
