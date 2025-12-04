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

export default function TablaComparables({ comparables }) {
  
  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'Por consultar';
    return '$ ' + Math.round(value).toLocaleString('es-CO');
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '—';
    return num.toLocaleString('es-CO');
  };

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[#E0E5E2]">
      <Table>
        <TableHeader className="bg-[#F9FAF9]">
          <TableRow>
            <TableHead className="w-[220px] text-[#2C3D37] font-semibold text-sm py-4">Propiedad</TableHead>
            <TableHead className="text-[#2C3D37] font-semibold text-sm">Tipo</TableHead>
            <TableHead className="text-[#2C3D37] font-semibold text-sm">Ubicación</TableHead>
            <TableHead className="text-[#2C3D37] font-semibold text-sm text-center">Área</TableHead>
            {/* CORRECCIÓN: Columna estrecha con salto de línea */}
            <TableHead className="text-[#2C3D37] font-semibold text-sm text-center w-[80px] leading-tight">
              Hab<br/><span className="text-xs font-normal">Baños</span>
            </TableHead>
            <TableHead className="text-[#2C3D37] font-semibold text-sm text-right">Precio Publicado</TableHead>
            <TableHead className="text-[#2C3D37] font-semibold text-sm text-right">Precio Venta (Est)</TableHead>
            {/* CORRECCIÓN: Columna ancha para que quepa en una línea */}
            <TableHead className="text-[#2C3D37] font-semibold text-sm text-right w-[120px]">$/m²</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comparables.map((item, index) => (
            <TableRow key={index} className="hover:bg-[#F5F7F6] transition-colors border-b border-[#E0E5E2]">
              
              <TableCell className="font-medium text-[#2C3D37] align-top py-3">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 bg-white border border-[#E0E5E2] rounded-md mt-0.5 shrink-0">
                    <Home className="w-3 h-3 text-[#C9C19D]" />
                  </div>
                  <span className="text-sm line-clamp-2 leading-snug" title={item.titulo}>
                    {item.titulo || 'Propiedad Comparable'}
                  </span>
                </div>
              </TableCell>

              <TableCell className="align-top py-3">
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

              <TableCell className="align-top py-3">
                <div className="flex flex-col">
                  <span className="text-sm text-[#4F5B55] font-medium leading-tight">
                    {item.barrio || item.fuente_zona || '—'}
                  </span>
                  <span className="text-[10px] text-[#A3B2AA] mt-0.5">
                    {item.municipio || 'Pereira'}
                  </span>
                </div>
              </TableCell>

              <TableCell className="text-sm text-[#4F5B55] text-center align-top py-3">
                {formatNumber(item.area_m2)} m²
              </TableCell>

              {/* CORRECCIÓN: Datos en dos líneas centrados */}
              <TableCell className="text-sm text-[#4F5B55] text-center align-top py-3">
                <div className="flex flex-col items-center leading-tight">
                  <span>{item.habitaciones || '-'}</span>
                  <span className="text-[#E0E5E2] -my-1">__</span>
                  <span>{item.banos || '-'}</span>
                </div>
              </TableCell>

              <TableCell className="align-top py-3 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-sm text-[#4F5B55] font-medium">
                    {formatCurrency(item.precio_publicado)}
                  </span>
                  {item.tipo_origen === 'arriendo' && (
                    <span className="text-[10px] text-[#A3B2AA]">/mes</span>
                  )}
                </div>
              </TableCell>

              <TableCell className="align-top py-3 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-[#2C3D37]">
                    {formatCurrency(item.precio_cop)}
                  </span>
                  
                  {item.tipo_origen === 'arriendo' && (
                    <span className="text-[9px] text-[#A3B2AA] leading-tight max-w-[100px]">
                      Estimado por rentabilidad
                    </span>
                  )}
                </div>
              </TableCell>

              {/* PRECIO M2 - Ahora tendrá espacio suficiente */}
              <TableCell className="text-right align-top py-3 whitespace-nowrap">
                <span className="text-sm font-medium text-[#2C3D37]">
                  {formatCurrency(item.precio_m2)}
                </span>
              </TableCell>

            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}