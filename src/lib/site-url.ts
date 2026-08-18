/**
 * NEXT_PUBLIC_SITE_URL a veces se configura sin protocolo (ej. en Vercel,
 * "cittadella-iota.vercel.app"), lo que rompe `new URL(...)`. Normalizamos
 * agregando "https://" si falta.
 */
export function normalizarSiteUrl(raw: string): string {
  return /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
}

export function getSiteUrl(): string {
  return normalizarSiteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}
