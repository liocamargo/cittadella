export const LOCALES = ["es", "en", "pt", "it"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_INFO: Record<Locale, { label: string; bandera: string }> = {
  es: { label: "Español", bandera: "🇪🇸" },
  en: { label: "English", bandera: "🇬🇧" },
  pt: { label: "Português", bandera: "🇵🇹" },
  it: { label: "Italiano", bandera: "🇮🇹" },
};

export const LOCALE_POR_DEFECTO: Locale = "es";

function esLocale(valor: string): valor is Locale {
  return (LOCALES as readonly string[]).includes(valor);
}

/** país (ISO 3166-1 alpha-2) -> idioma por defecto más probable. */
const PAIS_A_LOCALE: Record<string, Locale> = {
  // Habla hispana
  AR: "es", ES: "es", MX: "es", CL: "es", CO: "es", PE: "es", UY: "es",
  PY: "es", BO: "es", EC: "es", VE: "es", CR: "es", PA: "es", GT: "es",
  HN: "es", SV: "es", NI: "es", DO: "es", CU: "es", PR: "es", GQ: "es",
  // Portugués
  BR: "pt", PT: "pt", AO: "pt", MZ: "pt", CV: "pt", GW: "pt", ST: "pt", TL: "pt",
  // Italiano
  IT: "it", SM: "it", VA: "it",
};

/** Devuelve el locale sugerido para un código de país (ISO alpha-2), o null si no hay match. */
export function localeDesdePais(pais: string | null | undefined): Locale | null {
  if (!pais) return null;
  return PAIS_A_LOCALE[pais.toUpperCase()] ?? null;
}

/** Devuelve el locale sugerido a partir de un idioma de navegador (ej: "pt-BR", "en-US"). */
export function localeDesdeNavegador(idiomaNavegador: string | null | undefined): Locale | null {
  if (!idiomaNavegador) return null;
  const prefijo = idiomaNavegador.slice(0, 2).toLowerCase();
  return esLocale(prefijo) ? prefijo : null;
}
