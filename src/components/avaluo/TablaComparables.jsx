import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Home } from 'lucide-react';

export default function TablaComparables({ comparables, esLote = false }) {

  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'Por consultar';
    return '$ ' + Math.round(value).toLocaleString('es-CO');
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '—';
    return num.toLocaleString('es-CO');
  };

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[#E0E5E2] mx-auto max-w-fit">
      <Table>
        <TableHeader className="bg-[#F9FAF9]">
          <TableRow>
            {/* Propiedad más ancha */}
            <TableHead className="min-w-[270px] text-[#2C3D37] font-semibold text-sm py-4 text-center">
              Propiedad
            </TableHead>
            <TableHead className="text-[#2C3D37] font-semibold text-sm text-center">
              Tipo
            </TableHead>
            <TableHead className="text-[#2C3D37] font-semibold text-sm text-center">
              Ubicación
            </TableHead>
            <TableHead className="text-[#2C3D37] font-semibold text-sm text-center">
              Área
            </TableHead>
            {!esLote && (
              <TableHead className="text-[#2C3D37] font-semibold text-sm text-center w-[80px] leading-tight">
                Hab<br /><span className="text-xs font-normal">Baños</span>
              </TableHead>
            )}
            {/* Encabezados de precios centrados, celdas seguirán centradas */}
            <TableHead className="min-w-[140px] !text-center text-[#2C3D37] font-semibold text-sm">
              Precio Publicado
            </TableHead>
            {!esLote && (
              <TableHead className="min-w-[140px] !text-center text-[#2C3D37] font-semibold text-sm">
                Precio de Venta
              </TableHead>
            )}
            <TableHead className="text-[#2C3D37] font-semibold text-sm text-center">
              $/m²
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {comparables.map((item, index) => (
            <TableRow
              key={index}
              className="hover:bg-[#F5F7F6] transition-colors border-b border-[#E0E5E2]"
            >
              {/* Propiedad (texto a la izquierda para legibilidad) */}
              <TableCell className="font-medium text-[#2C3D37] align-middle py-3">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 bg-white border border-[#E0E5E2] rounded-md mt-0.5 shrink-0">
                    <Home className="w-3 h-3 text-[#C9C19D]" />
                  </div>
                  <div className="flex flex-col">
                    <span
                      className="text-sm line-clamp-2 leading-snug"
                      title={item.titulo}
                    >
                      {item.titulo || 'Propiedad Comparable'}
                    </span>

                    {/* Badge de fuente (condicional) */}
                    {(() => {
                      const { fuente_validacion, nota_adicional } = item;

                      if (fuente_validacion === 'portal_verificado') {
                        return (
                          <Badge
                            variant="outline"
                            className="mt-1.5 w-fit bg-green-50 text-green-700 border-green-200 text-[10px] px-2 py-0.5"
                          >
                            ✓ Coincidencia
                          </Badge>
                        );
                      }

                      if (fuente_validacion === 'zona_similar') {
                        return (
                          <Badge
                            variant="outline"
                            className="mt-1.5 w-fit bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-2 py-0.5"
                          >
                            → Zona Similar
                          </Badge>
                        );
                      }

                      if (fuente_validacion === 'estimacion_zona') {
                        return (
                          <Badge
                            variant="outline"
                            className="mt-1.5 w-fit bg-orange-50 text-orange-700 border-orange-200 text-[10px] px-2 py-0.5"
                          >
                            ≈ Estimación
                          </Badge>
                        );
                      }

                      if (fuente_validacion === 'promedio_municipal') {
                        return (
                          <Badge
                            variant="outline"
                            className="mt-1.5 w-fit bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-2 py-0.5"
                          >
                            ≈ Estimación
                          </Badge>
                        );
                      }

                      return null;
                    })()}

                    {/* Notas explicativas */}
                    {(() => {
                      const { fuente_validacion, nota_adicional } = item;

                      // Limpiar citaciones numéricas [1][2][3] del frontend
                      let formattedNote = nota_adicional ? nota_adicional.trim().replace(/\[\d+\]/g, '') : '';

                      // Fallbacks si no hay nota de Perplexity
                      if (!formattedNote) {
                        if (fuente_validacion === 'estimacion_zona') formattedNote = 'Basado en datos de propiedades similares en la zona.';
                        else if (fuente_validacion === 'promedio_municipal') formattedNote = 'Basado en datos de propiedades similares en ciudad/municipio.';
                        else if (fuente_validacion === 'portal_verificado') formattedNote = 'Anuncio de listado en la misma zona.';
                        else if (fuente_validacion === 'zona_similar') formattedNote = 'Propiedad en zona con características similares.';
                      }

                      if (!formattedNote) return null;

                      // Patrón: "Ciudad está a X km de Objetivo, [con/condiciones] características..."
                      const pattern1 = /(.+?)\s+está\s+a\s+(\d+)\s*km\s+de\s+[^,]+,?\s*(.+)/i;
                      const match1 = formattedNote.match(pattern1);

                      if (match1) {
                        const distance = match1[2];
                        let characteristics = match1[3];

                        // Normalizar
                        characteristics = characteristics
                          .replace(/^con\s+/i, 'tiene ')
                          .replace(/^condiciones\s+/i, 'tiene condiciones ');

                        formattedNote = `A ${distance} km de distancia, ${characteristics}`;
                      }

                      return (
                        <div className="text-[10px] text-left text-gray-600 mt-1.5 italic border-l-2 border-blue-300 pl-2 leading-snug">
                          <strong>NOTA:</strong> {formattedNote}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </TableCell>

              {/* Tipo centrado (Venta/Arriendo) */}
              <TableCell className="align-middle py-3 text-center">
                <Badge
                  variant="outline"
                  className={`
                    capitalize font-normal text-[10px] px-2 py-0.5 border-0
                    ${item.tipo_origen === 'arriendo'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-[#E8F5E9] text-[#2E7D32]'}
                  `}
                >
                  {item.tipo_origen || 'Venta'}
                </Badge>
              </TableCell>

              {/* Ubicación centrada (Villas / Mosquera) */}
              <TableCell className="align-middle py-3 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-sm text-[#4F5B55] font-medium leading-tight">
                    {item.barrio || item.fuente_zona || '—'}
                  </span>
                  <span className="text-[10px] text-[#A3B2AA] mt-0.5">
                    {item.municipio || 'Pereira'}
                  </span>
                </div>
              </TableCell>

              {/* Área centrada */}
              <TableCell className="text-sm text-[#4F5B55] text-center align-middle py-3">
                {formatNumber(item.area_m2)} m²
              </TableCell>

              {/* Hab / Baños centrados (ya lo estaban) */}
              {!esLote && (
                <TableCell className="text-sm text-[#4F5B55] text-center align-middle py-3">
                  <div className="flex flex-col items-center leading-tight">
                    <span>{item.habitaciones || '-'}</span>
                    <span className="text-[#E0E5E2] -my-1">__</span>
                    <span>{item.banos || '-'}</span>
                  </div>
                </TableCell>
              )}

              {/* Precio Publicado centrado */}
              <TableCell className="align-middle py-3 text-center">
                <div className="flex flex-row items-baseline justify-center gap-1">
                  <span className="text-sm text-[#4F5B55] font-medium whitespace-nowrap">
                    {formatCurrency(item.precio_publicado)}
                  </span>
                  {item.tipo_origen === 'arriendo' && (
                    <span className="text-[10px] text-[#A3B2AA] whitespace-nowrap">
                      /mes
                    </span>
                  )}
                </div>
              </TableCell>

              {!esLote && (
                <TableCell className="align-middle py-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold text-[#2C3D37]">
                      {formatCurrency(item.precio_cop)}
                    </span>

                    {item.tipo_origen === 'arriendo' && (
                      <span className="text-[9px] text-[#A3B2AA] leading-tight max-w-[100px]">
                        Est. por rentabilidad
                        {item.yield_mensual
                          ? ` (Yield ${(item.yield_mensual * 100).toFixed(2)}% /mercado)`
                          : ''}
                      </span>
                    )}
                  </div>
                </TableCell>
              )}

              {/* $/m² centrado */}
              <TableCell className="text-center align-middle py-3 whitespace-nowrap">
                <span className="text-sm font-medium text-[#2C3D37]">
                  {formatCurrency(item.precio_m2)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!esLote && (
        <p className="text-xs text-gray-500 mt-3 px-4 pb-3">
          * Para arriendos, el "Precio Venta (Est)" es el valor estimado por
          capitalización usando el yield de mercado investigado.
        </p>
      )}
    </div>
  );
}
