"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import { listenInventario } from "@/lib/firestore/libros";
import { listenLecturas, type Lectura } from "@/lib/firestore/lecturas";
import { LibroDetailSheet } from "@/components/catalogo/libro-detail-sheet";
import { LecturaDetailDialog } from "@/components/leidos/lectura-detail-dialog";
import type { LibroEnBiblioteca } from "@/types";

export default function LeidosPage() {
  const { user } = useAuth();
  const { bibliotecaActual } = useBiblioteca();
  const [copias, setCopias] = useState<LibroEnBiblioteca[]>([]);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [seleccionCopiaId, setSeleccionCopiaId] = useState<string | null>(null);
  const [seleccionIsbnSuelto, setSeleccionIsbnSuelto] = useState<string | null>(null);

  useEffect(() => {
    if (!bibliotecaActual) {
      setCopias([]);
      return;
    }
    return listenInventario(bibliotecaActual.id, setCopias);
  }, [bibliotecaActual]);

  useEffect(() => {
    if (!user) return;
    return listenLecturas(user.uid, setLecturas);
  }, [user]);

  const copiasLeidas = useMemo(() => copias.filter((c) => c.leido), [copias]);
  const isbnsPropiosLeidos = new Set(copiasLeidas.map((c) => c.isbn));
  const lecturasSueltas = useMemo(
    () => lecturas.filter((l) => !isbnsPropiosLeidos.has(l.isbn)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lecturas, copias]
  );

  const isbns = [
    ...copiasLeidas.map((c) => c.isbn),
    ...lecturasSueltas.map((l) => l.isbn),
  ];
  const globales = useLibrosGlobales(isbns);

  const copiaSeleccionada = copias.find((c) => c.id === seleccionCopiaId) ?? null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leídos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {copiasLeidas.length + lecturasSueltas.length} libro(s) leído(s) en
            total.
          </p>
        </div>
        <Button asChild>
          <Link href="/leidos/agregar">
            <Plus />
            Agregar a leídos
          </Link>
        </Button>
      </div>

      {copiasLeidas.length + lecturasSueltas.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Todavía no marcaste ningún libro como leído.
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
        {copiasLeidas.map((copia) => {
          const g = globales[copia.isbn];
          const inicial = (g?.titulo ?? "?").trim().charAt(0).toUpperCase();
          return (
            <button
              key={copia.id}
              onClick={() => setSeleccionCopiaId(copia.id)}
              className="flex flex-col gap-2 text-left"
            >
              {g?.portadaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={g.portadaUrl}
                  alt={g.titulo}
                  className="aspect-[3/4.2] w-full rounded-lg border object-cover"
                />
              ) : (
                <div className="flex aspect-[3/4.2] items-center justify-center rounded-lg border bg-muted">
                  <span className="text-2xl font-bold text-muted-foreground/60">
                    {inicial}
                  </span>
                </div>
              )}
              <div className="text-[13px] font-semibold leading-tight">{g?.titulo}</div>
              <div className="line-clamp-2 text-xs text-muted-foreground" title={g?.autor}>
                {g?.autor}
              </div>
              <Badge variant="secondary" className="w-fit text-[11px]">
                En tu biblioteca · {copia.estante || "sin estante"}
              </Badge>
            </button>
          );
        })}

        {lecturasSueltas.map((lectura) => {
          const g = globales[lectura.isbn];
          const inicial = (g?.titulo ?? "?").trim().charAt(0).toUpperCase();
          return (
            <button
              key={lectura.id}
              onClick={() => setSeleccionIsbnSuelto(lectura.isbn)}
              className="flex flex-col gap-2 text-left"
            >
              {g?.portadaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={g.portadaUrl}
                  alt={g.titulo}
                  className="aspect-[3/4.2] w-full rounded-lg border object-cover"
                />
              ) : (
                <div className="flex aspect-[3/4.2] items-center justify-center rounded-lg border bg-muted">
                  <span className="text-2xl font-bold text-muted-foreground/60">
                    {inicial}
                  </span>
                </div>
              )}
              <div className="text-[13px] font-semibold leading-tight">{g?.titulo}</div>
              <div className="line-clamp-2 text-xs text-muted-foreground" title={g?.autor}>
                {g?.autor}
              </div>
              <Badge variant="outline" className="w-fit text-[11px]">
                No está en tu biblioteca
              </Badge>
            </button>
          );
        })}
      </div>

      <LibroDetailSheet
        copia={copiaSeleccionada}
        global={copiaSeleccionada ? globales[copiaSeleccionada.isbn] : undefined}
        onClose={() => setSeleccionCopiaId(null)}
      />

      <LecturaDetailDialog
        isbn={seleccionIsbnSuelto}
        global={seleccionIsbnSuelto ? globales[seleccionIsbnSuelto] : undefined}
        onClose={() => setSeleccionIsbnSuelto(null)}
      />
    </div>
  );
}
