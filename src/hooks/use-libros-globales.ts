"use client";

import { useEffect, useRef, useState } from "react";
import { listenLibroGlobal } from "@/lib/firestore/libros";
import type { LibroGlobal } from "@/types";

/**
 * Escucha en tiempo real los datos comunitarios (Libros_Globales) de un set
 * de ISBNs: un listener por ISBN único, se actualiza solo ante cualquier
 * cambio (portada, edición de datos, rating, etc.) sin necesitar recargar.
 */
export function useLibrosGlobales(isbns: string[]) {
  const [mapa, setMapa] = useState<Record<string, LibroGlobal>>({});
  const listenersRef = useRef<Record<string, () => void>>({});
  const key = Array.from(new Set(isbns)).filter(Boolean).sort().join(",");

  useEffect(() => {
    const isbnsUnicos = Array.from(new Set(isbns)).filter(Boolean);
    const actuales = new Set(isbnsUnicos);

    for (const isbn of Object.keys(listenersRef.current)) {
      if (!actuales.has(isbn)) {
        listenersRef.current[isbn]();
        delete listenersRef.current[isbn];
        setMapa((m) => {
          if (!(isbn in m)) return m;
          const resto = { ...m };
          delete resto[isbn];
          return resto;
        });
      }
    }

    for (const isbn of isbnsUnicos) {
      if (listenersRef.current[isbn]) continue;
      listenersRef.current[isbn] = listenLibroGlobal(isbn, (libro) => {
        setMapa((m) => {
          if (!libro) {
            if (!(isbn in m)) return m;
            const resto = { ...m };
            delete resto[isbn];
            return resto;
          }
          return { ...m, [isbn]: libro };
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    return () => {
      Object.values(listenersRef.current).forEach((unsub) => unsub());
      listenersRef.current = {};
    };
  }, []);

  return mapa;
}
