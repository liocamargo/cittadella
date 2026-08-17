"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Library } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listenBiblioteca } from "@/lib/firestore/bibliotecas";
import { listenInventario } from "@/lib/firestore/libros";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import type { Biblioteca, LibroEnBiblioteca } from "@/types";

export default function CatalogoPublicoPage() {
  const params = useParams<{ bibliotecaId: string }>();
  const bibliotecaId = params.bibliotecaId;

  const [biblioteca, setBiblioteca] = useState<Biblioteca | null | undefined>(
    undefined
  );
  const [copias, setCopias] = useState<LibroEnBiblioteca[]>([]);
  const [search, setSearch] = useState("");
  const [seleccionada, setSeleccionada] = useState<LibroEnBiblioteca | null>(null);

  useEffect(() => {
    return listenBiblioteca(bibliotecaId, setBiblioteca);
  }, [bibliotecaId]);

  useEffect(() => {
    if (!biblioteca?.catalogoPublico) return;
    return listenInventario(bibliotecaId, setCopias);
  }, [biblioteca, bibliotecaId]);

  const isbns = copias.map((c) => c.isbn);
  const globales = useLibrosGlobales(isbns);

  if (biblioteca === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!biblioteca || !biblioteca.catalogoPublico) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Este catálogo no está disponible o el link ya no es público.
        </p>
      </div>
    );
  }

  const term = search.trim().toLowerCase();
  const filtrados = copias.filter((c) => {
    if (!term) return true;
    const g = globales[c.isbn];
    return `${g?.titulo ?? ""} ${g?.autor ?? ""} ${g?.genero ?? ""}`
      .toLowerCase()
      .includes(term);
  });

  const detalle = seleccionada ? globales[seleccionada.isbn] : undefined;

  return (
    <div className="min-h-screen bg-background px-6 py-10 md:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-1 flex items-center gap-2 text-muted-foreground">
          <Library className="size-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Catálogo público · solo lectura
          </span>
        </div>
        <h1 className="mb-6 text-2xl font-bold">{biblioteca.nombre}</h1>

        <SearchInput
          placeholder="Buscar por título, autor o género"
          value={search}
          onValueChange={setSearch}
          className="mb-6 max-w-xs"
        />

        {filtrados.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {copias.length === 0
              ? "Esta biblioteca todavía no tiene libros cargados."
              : "Sin resultados para esta búsqueda."}
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-5">
          {filtrados.map((copia) => {
            const g = globales[copia.isbn];
            const inicial = (g?.titulo ?? "?").trim().charAt(0).toUpperCase();
            return (
              <button
                key={copia.id}
                onClick={() => setSeleccionada(copia)}
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
                <div className="text-[13px] font-semibold leading-tight">
                  {g?.titulo}
                </div>
                <div className="text-xs text-muted-foreground">{g?.autor}</div>
                <Badge
                  variant={copia.estado === "disponible" ? "secondary" : "outline"}
                  className="w-fit text-[11px]"
                >
                  {copia.estado === "disponible" ? "Disponible" : "Prestado"}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={Boolean(seleccionada)} onOpenChange={(o) => !o && setSeleccionada(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{detalle?.titulo}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm">
            <div className="text-muted-foreground">{detalle?.autor}</div>
            {detalle?.sinopsis && <p className="leading-relaxed">{detalle.sinopsis}</p>}
            <div className="flex flex-col gap-1 border-t pt-3 text-sm">
              <div>
                <strong>ISBN:</strong> {seleccionada?.isbn || "—"}
              </div>
              <div>
                <strong>Editorial:</strong> {detalle?.editorial || "—"}
              </div>
              <div>
                <strong>Año:</strong> {detalle?.anio || "—"}
              </div>
              <div>
                <strong>Género:</strong> {detalle?.genero || "—"}
              </div>
              <div>
                <strong>Estante:</strong> {seleccionada?.estante || "—"}
              </div>
            </div>
            <div>
              <span className="text-xs font-semibold">★ {detalle?.ratingPromedio ?? 0}</span>{" "}
              <span className="text-xs text-muted-foreground">
                ({detalle?.totalResenas ?? 0} reseña(s) de la comunidad)
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
