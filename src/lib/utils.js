import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Mapear estado_inmueble a etiqueta legible (unificado)
export function mapearEstado(estado) {
  const mapa = {
    'nuevo': 'Nuevo',
    'remodelado': 'Remodelado',
    'buen_estado': 'Buen Estado',
    'requiere_reformas_ligeras': 'Requiere Reformas Ligeras',
    'requiere_reformas_moderadas': 'Requiere Reformas Moderadas',
    'requiere_reformas_amplias': 'Requiere Reformas Amplias',
    'requiere_reformas_superiores': 'Requiere Reformas Superiores',
    'obra_gris': 'Obra Gris'
  };
  if (!estado) return 'No especificado';
  return mapa[estado] || estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Alias para compatibilidad (deprecated, usar mapearEstado)
export const mapearEstadoSinPrecio = mapearEstado;