"use client";

import { useEffect, useRef, useState } from "react";
import { getLibroGlobal } from "@/lib/firestore/libros";
import type { LibroGlobal } from "@/types";

/** Trae y cachea los datos comunitarios (Libros_Globales) para un set de ISBNs. */
export function useLibrosGlobales(isbns: string[]) {
  const [mapa, setMapa] = useState<Record<string, LibroGlobal>>({});
  const cache = useRef<Record<string, LibroGlobal>>({});
  const key = Array.from(new Set(isbns)).sort().join(",");

  useEffect(() => {
    const faltantes = Array.from(new Set(isbns)).filter(
      (isbn) => isbn && !cache.current[isbn]
    );
    if (faltantes.length === 0) return;

    let cancelado = false;
    Promise.all(
      faltantes.map(async (isbn) => {
        const libro = await getLibroGlobal(isbn);
        if (libro) cache.current[isbn] = libro;
      })
    ).then(() => {
      if (!cancelado) setMapa({ ...cache.current });
    });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return mapa;
}
