"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import { devolverLibro, listenInventario } from "@/lib/firestore/libros";
import type { LibroEnBiblioteca } from "@/types";

export default function PrestamosPage() {
  const { bibliotecaActual } = useBiblioteca();
  const [copias, setCopias] = useState<LibroEnBiblioteca[]>([]);

  useEffect(() => {
    if (!bibliotecaActual) {
      setCopias([]);
      return;
    }
    return listenInventario(bibliotecaActual.id, setCopias);
  }, [bibliotecaActual]);

  const prestados = useMemo(
    () => copias.filter((c) => c.estado === "prestado"),
    [copias]
  );
  const isbns = useMemo(() => prestados.map((c) => c.isbn), [prestados]);
  const globales = useLibrosGlobales(isbns);

  async function handleDevolver(id: string) {
    try {
      await devolverLibro(id);
      toast.success("Marcado como devuelto.");
    } catch {
      toast.error("No pudimos actualizar el préstamo.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Préstamos</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        {prestados.length} libro(s) actualmente prestado(s)
      </p>

      {prestados.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No hay libros prestados ahora mismo.
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
        {prestados.map((copia) => {
          const global = globales[copia.isbn];
          const inicial = (global?.titulo ?? "?").trim().charAt(0).toUpperCase();
          return (
            <div key={copia.id} className="flex flex-col gap-2">
              <div className="flex aspect-[3/4.2] items-center justify-center rounded-lg border bg-muted">
                <span className="text-[26px] font-bold text-muted-foreground/60">
                  {inicial}
                </span>
              </div>
              <div className="text-[13px] font-semibold leading-tight">
                {global?.titulo}
              </div>
              <div className="text-xs text-muted-foreground">{global?.autor}</div>
              <Badge variant="outline" className="w-fit text-[11px]">
                Prestado a {copia.prestadoA}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDevolver(copia.id)}
              >
                Marcar como devuelto
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
