import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Mapear estado_inmueble con rangos de precio (para prompt de Perplexity)
export function mapearEstadoConPrecio(estado) {
  const mapa = {
    'nuevo': 'Nuevo',
    'remodelado': 'Remodelado',
    'buen_estado': 'Buen Estado',
    'requiere_reformas_ligeras': 'Requiere Reformas Ligeras (≤ $5.000.000)',
    'requiere_reformas_moderadas': 'Requiere Reformas Moderadas ($5.000.000 - $15.000.000)',
    'requiere_reformas_amplias': 'Requiere Reformas Amplias ($15.000.000 - $25.000.000)',
    'requiere_reformas_superiores': 'Requiere Reformas Superiores (>$25.000.000)',
    'obra_gris': 'Obra Gris'
  };
  if (!estado) return 'No especificado';
  return mapa[estado] || estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Mapear estado_inmueble SIN precio (para UI, PDF, Email)
export function mapearEstadoSinPrecio(estado) {
  const mapa = {
    'nuevo': 'Nuevo',
    'remodelado': 'Remodelado',
    'buen_estado': 'Buen Estado',
    'requiere_reformas_ligeras': 'Reformas Ligeras',
    'requiere_reformas_moderadas': 'Reformas Moderadas',
    'requiere_reformas_amplias': 'Reformas Amplias',
    'requiere_reformas_superiores': 'Reformas Superiores',
    'obra_gris': 'Obra Gris'
  };
  if (!estado) return 'No especificado';
  return mapa[estado] || estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
} 