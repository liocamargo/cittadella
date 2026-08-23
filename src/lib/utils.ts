import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Minúsculas y sin acentos, para que buscar "peron" encuentre "Perón". */
export function normalizarBusqueda(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

/**
 * Clave canónica para agrupar/autores/obras: minúsculas, sin acentos, sin
 * puntuación y espacios como guiones bajos. Ej: "J.R.R. Tolkien" → "jrr_tolkien".
 * Primero borra puntuación y DESPUÉS colapsa espacios, para que los puntos de
 * "J.R.R." desaparezcan en vez de convertirse en guiones bajos.
 */
export function normalizeString(text: string): string {
  return normalizarBusqueda(text)
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
}
