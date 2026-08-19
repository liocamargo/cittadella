"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSeleccionSemanal } from "@/lib/firestore/libros";
import type { LibroGlobal } from "@/types";

interface SeleccionSemanalProps {
  isbnsPropios: string[];
}

export function SeleccionSemanal({ isbnsPropios }: SeleccionSemanalProps) {
  const [libros, setLibros] = useState<LibroGlobal[] | null>(null);
  const [seleccionado, setSeleccionado] = useState<LibroGlobal | null>(null);
  const key = Array.from(new Set(isbnsPropios)).sort().join(",");

  useEffect(() => {
    let cancelado = false;
    getSeleccionSemanal(isbnsPropios).then((r) => {
      if (!cancelado) setLibros(r);
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (libros !== null && libros.length === 0) return null;

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold">Selección de la semana</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Libros que otras bibliotecas de la comunidad tienen y vos todavía no.
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
        {(libros ?? Array.from({ length: 8 })).map((libro, i) =>
          libro ? (
            <button
              key={libro.isbn}
              onClick={() => setSeleccionado(libro)}
              className="flex flex-col gap-2 text-left"
            >
              {libro.portadaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={libro.portadaUrl}
                  alt={libro.titulo}
                  className="aspect-[3/4.2] w-full rounded-lg border object-cover"
                />
              ) : (
                <div className="flex aspect-[3/4.2] items-center justify-center rounded-lg border bg-muted">
                  <span className="text-xl font-bold text-muted-foreground/60">
                    {libro.titulo.trim().charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="text-xs font-semibold leading-tight">{libro.titulo}</div>
              <div className="line-clamp-2 text-[11px] text-muted-foreground" title={libro.autor}>
                {libro.autor}
              </div>
            </button>
          ) : (
            <div
              key={i}
              className="aspect-[3/4.2] animate-pulse rounded-lg border bg-muted"
            />
          )
        )}
      </div>

      <Dialog
        open={Boolean(seleccionado)}
        onOpenChange={(o) => !o && setSeleccionado(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{seleccionado?.titulo}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm">
            <div className="text-muted-foreground">{seleccionado?.autor}</div>
            {seleccionado?.sinopsis && (
              <p className="leading-relaxed">{seleccionado.sinopsis}</p>
            )}
            <div className="flex gap-5 border-t pt-3">
              <div>
                <strong>★ {seleccionado?.ratingPromedio ?? 0}</strong>
                <span className="ml-1 text-muted-foreground">
                  ({seleccionado?.totalResenas ?? 0} reseña(s))
                </span>
              </div>
              <div className="text-muted-foreground">
                {seleccionado?.propietarios ?? 0} biblioteca(s) lo tienen
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
