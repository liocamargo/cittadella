"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { listenPerfil, guardarPerfil } from "@/lib/firestore/perfiles";
import { DICCIONARIOS } from "@/i18n/dictionaries";
import {
  LOCALES,
  LOCALE_POR_DEFECTO,
  localeDesdeNavegador,
  localeDesdePais,
  type Locale,
} from "@/i18n/config";

const STORAGE_KEY = "cittadella:idiomaUI";

interface LocaleContextValue {
  locale: Locale;
  localeLectura: Locale[];
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  setLocaleLectura: (locales: Locale[]) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function esLocaleValido(valor: string | null): valor is Locale {
  return valor !== null && (LOCALES as readonly string[]).includes(valor);
}

/** País (Vercel geo) o, si no hay, idioma del navegador. Solo para primera vez. */
async function detectarLocalePorDefecto(): Promise<Locale> {
  try {
    const res = await fetch("/api/geo");
    const { pais } = (await res.json()) as { pais: string | null };
    const porPais = localeDesdePais(pais);
    if (porPais) return porPais;
  } catch {
    // Sin geo disponible (dev local u otro host): seguimos al navegador.
  }
  return (
    localeDesdeNavegador(typeof navigator !== "undefined" ? navigator.language : null) ??
    LOCALE_POR_DEFECTO
  );
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [locale, setLocaleState] = useState<Locale>(LOCALE_POR_DEFECTO);
  const [localeLectura, setLocaleLecturaState] = useState<Locale[]>([LOCALE_POR_DEFECTO]);
  const creandoPerfilRef = useRef(false);

  // Sin sesión (ej. /login): preferencia guardada en este navegador, si existe.
  useEffect(() => {
    if (user) return;
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (esLocaleValido(guardado)) {
      setLocaleState(guardado);
      setLocaleLecturaState([guardado]);
    } else {
      detectarLocalePorDefecto().then((detectado) => {
        setLocaleState(detectado);
        setLocaleLecturaState([detectado]);
      });
    }
  }, [user]);

  // Con sesión: Perfiles/{uid} en Firestore es la fuente de verdad.
  useEffect(() => {
    if (!user) return;
    creandoPerfilRef.current = false;
    return listenPerfil(user.uid, (perfil) => {
      if (perfil) {
        setLocaleState(perfil.idiomaUI);
        setLocaleLecturaState(perfil.idiomaLectura);
        return;
      }
      if (creandoPerfilRef.current) return;
      creandoPerfilRef.current = true;

      const guardadoLocal = localStorage.getItem(STORAGE_KEY);
      const promesa = esLocaleValido(guardadoLocal)
        ? Promise.resolve(guardadoLocal)
        : detectarLocalePorDefecto();

      promesa.then((detectado) => {
        setLocaleState(detectado);
        setLocaleLecturaState([detectado]);
        guardarPerfil(user.uid, {
          idiomaUI: detectado,
          idiomaLectura: [detectado],
        }).catch((err) => console.error("Error creando el perfil:", err));
      });
    });
  }, [user]);

  const value = useMemo<LocaleContextValue>(() => {
    const dict = DICCIONARIOS[locale];

    function t(key: string, vars?: Record<string, string | number>): string {
      let actual: unknown = dict;
      for (const parte of key.split(".")) {
        if (typeof actual !== "object" || actual === null) {
          actual = undefined;
          break;
        }
        actual = (actual as Record<string, unknown>)[parte];
      }
      let texto = typeof actual === "string" ? actual : key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          texto = texto.replace(`{${k}}`, String(v));
        }
      }
      return texto;
    }

    return {
      locale,
      localeLectura,
      t,
      setLocale(nuevo: Locale) {
        setLocaleState(nuevo);
        if (user) {
          guardarPerfil(user.uid, { idiomaUI: nuevo }).catch((err) =>
            console.error("Error guardando el idioma:", err)
          );
        } else {
          localStorage.setItem(STORAGE_KEY, nuevo);
        }
      },
      setLocaleLectura(nuevos: Locale[]) {
        if (nuevos.length === 0) return;
        setLocaleLecturaState(nuevos);
        if (user) {
          guardarPerfil(user.uid, { idiomaLectura: nuevos }).catch((err) =>
            console.error("Error guardando el idioma de lectura:", err)
          );
        }
      },
    };
  }, [locale, localeLectura, user]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale debe usarse dentro de LocaleProvider");
  return ctx;
}
