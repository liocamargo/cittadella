"use client";

import { useEffect, useState } from "react";
import { obtenerSugerenciasComunidad } from "@/lib/firestore/libros";

/** Autores/editoriales ya cargados en la comunidad, para sugerir en <datalist>. */
export function useSugerenciasComunidad() {
  const [autores, setAutores] = useState<string[]>([]);
  const [editoriales, setEditoriales] = useState<string[]>([]);

  useEffect(() => {
    let cancelado = false;
    obtenerSugerenciasComunidad()
      .then((r) => {
        if (cancelado) return;
        setAutores(r.autores);
        setEditoriales(r.editoriales);
      })
      .catch((err) => console.error("Error cargando sugerencias:", err));
    return () => {
      cancelado = true;
    };
  }, []);

  return { autores, editoriales };
}
