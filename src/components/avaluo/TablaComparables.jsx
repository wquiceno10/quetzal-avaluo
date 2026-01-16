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
import { Home, Globe } from 'lucide-react';

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
              Precio/m²
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

                    {/* Fuente del portal (con enlace si existe) + Badges en línea */}
                    {item.fuente && (
                      <div className="mt-1 text-xs font-medium text-gray-500 flex items-center gap-1.5 flex-wrap">
                        {item.url_fuente ? (
                          <a
                            href={item.url_fuente}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2C3D37] hover:text-[#C9C19D] hover:underline flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            {item.fuente}
                          </a>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {item.fuente}
                          </span>
                        )}

                        {/* Badges múltiples en línea */}
                        {(() => {
                          const badges = Array.isArray(item.fuente_validacion)
                            ? item.fuente_validacion
                            : [item.fuente_validacion];

                          return badges
                            .filter(badge => badge && badge !== 'verificado')
                            .map((badge, idx) => {
                              if (badge === 'coincidencia') {
                                return (
                                  <Badge key={idx} variant="outline" className="bg-green-100 text-green-700 border-green-200 text-[10px] px-2 py-0.5 ml-1">
                                    ✓ Coincidencia
                                  </Badge>
                                );
                              }
                              if (badge === 'zona_similar') {
                                return (
                                  <Badge key={idx} variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] px-2 py-0.5 ml-1">
                                    → Zona Similar
                                  </Badge>
                                );
                              }
                              if (badge === 'zona_extendida') {
                                return (
                                  <Badge key={idx} variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-2 py-0.5 ml-1">
                                    ≈ Zona Extendida
                                  </Badge>
                                );
                              }
                              return (
                                <Badge key={idx} variant="outline" className="bg-gray-100 text-gray-600 border-gray-200 text-[10px] px-2 py-0.5 ml-1">
                                  {toTitleCase(badge?.replace(/_/g, ' ') || 'Fuente Externa')}
                                </Badge>
                              );
                            });
                        })()}
                      </div>
                    )}

                    {/* Notas explicativas */}
                    {(() => {
                      const { fuente_validacion, nota_adicional } = item;

                      // Limpiar citaciones numéricas [1][2][3] del frontend
                      let formattedNote = nota_adicional ? nota_adicional.trim().replace(/\[\d+\]/g, '') : '';

                      // Normalizar: eliminar saltos de línea y espacios múltiples para mantener todo en una línea
                      formattedNote = formattedNote
                        .replace(/\r?\n/g, ' ')           // Convertir saltos de línea a espacios
                        .replace(/\s+/g, ' ')             // Eliminar espacios múltiples
                        .replace(/\*\*/g, '')             // Eliminar asteriscos de markdown (bold)
                        .replace(/^(Nota:?\s*)+/i, '')    // Eliminar prefijos duplicados "Nota:" al inicio
                        .replace(/^(Distancia:?\s*)/i, 'Distancia: ') // Normalizar "Distancia:"
                        .trim();

                      // Fallbacks si no hay nota de Perplexity
                      if (!formattedNote) {
                        if (fuente_validacion === 'coincidencia') formattedNote = 'Ubicación exacta validada.';

                        else if (fuente_validacion === 'zona_extendida') formattedNote = 'Similitud socioeconómica en otra zona.';
                        else if (fuente_validacion === 'zona_similar') formattedNote = 'Ubicación cercana con mercado comparable.';
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
                        <div className="text-[11px] text-left text-gray-500 mt-1 italic leading-tight">
                          <strong>Nota:</strong> {formattedNote}
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

              {/* Ubicación centrada con fallback cascada geográfica */}
              <TableCell className="align-middle py-3 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-sm text-[#4F5B55] font-medium leading-tight">
                    {/* Si no hay barrio, mostrar municipio; si no hay municipio, mostrar '—' */}
                    {item.barrio || item.fuente_zona || item.municipio || '—'}
                  </span>
                  <span className="text-[10px] text-[#A3B2AA] mt-0.5">
                    {/* Si no hay barrio, mostrar departamento; si hay barrio, mostrar municipio */}
                    {(item.barrio || item.fuente_zona) ? (item.municipio || '—') : (item.departamento || '—')}
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

      {/* Convenciones de Badges */}
      <div className="px-4 pt-3 pb-2 border-t border-[#E0E5E2] bg-[#FAFBFA]">
        <p className="text-xs font-medium text-[#4F5B55] mb-2">Convenciones:</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-gray-600">
          <span className="flex items-center gap-1">
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0">
              ✓ Coincidencia
            </Badge>
            <span>Mismo barrio o &lt;2 km</span>
          </span>
          <span className="flex items-center gap-1">
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0">
              → Zona Similar
            </Badge>
            <span>Barrio cercano similar (2-5 km)</span>
          </span>
          <span className="flex items-center gap-1">
            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0">
              ≈ Zona Extendida
            </Badge>
            <span>Mismo municipio, dinámica diferente (5-12 km)</span>
          </span>
        </div>
      </div>

      {!esLote && (
        <p className="text-xs text-gray-500 mt-2 px-4 pb-3">
          * Para arriendos, el "Precio Venta (Est)" es el valor estimado por
          capitalización usando el yield de mercado investigado.
        </p>
      )}
    </div>
  );
}
