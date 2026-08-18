import type { Locale } from "../config";
import es, { type Dictionary } from "./es";
import en from "./en";
import pt from "./pt";
import it from "./it";

export const DICCIONARIOS: Record<Locale, Dictionary> = { es, en, pt, it };
export type { Dictionary };
