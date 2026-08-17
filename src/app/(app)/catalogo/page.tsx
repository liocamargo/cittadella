"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import { listenInventario, toggleFavorito } from "@/lib/firestore/libros";
import {
  agregarEstante,
  eliminarEstante,
} from "@/lib/firestore/bibliotecas";
import { LibroCard } from "@/components/catalogo/libro-card";
import { LibroDetailSheet } from "@/components/catalogo/libro-detail-sheet";
import { ShareCatalogPopover } from "@/components/catalogo/share-catalog-popover";
import type { LibroEnBiblioteca } from "@/types";

const PAGE_SIZE = 14;
type Filtro = "all" | "disponible" | "prestado" | "favorito";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "disponible", label: "Disponibles" },
  { key: "prestado", label: "Prestados" },
  { key: "favorito", label: "★ Favoritos" },
];

export default function CatalogoPage() {
  const { bibliotecaActual } = useBiblioteca();
  const [copias, setCopias] = useState<LibroEnBiblioteca[]>([]);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("all");
  const [shelfFilter, setShelfFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newShelf, setNewShelf] = useState("");
  const [shelfCreateOpen, setShelfCreateOpen] = useState(false);

  useEffect(() => {
    if (!bibliotecaActual) {
      setCopias([]);
      return;
    }
    return listenInventario(bibliotecaActual.id, setCopias);
  }, [bibliotecaActual]);

  const isbns = useMemo(() => copias.map((c) => c.isbn), [copias]);
  const globales = useLibrosGlobales(isbns);

  const estantes = useMemo(() => {
    const declarados = bibliotecaActual?.estantes ?? [];
    const usados = Array.from(new Set(copias.map((c) => c.estante).filter(Boolean)));
    return Array.from(new Set([...declarados, ...usados]));
  }, [bibliotecaActual, copias]);

  const conteos = useMemo(
    () => ({
      all: copias.length,
      disponible: copias.filter((c) => c.estado === "disponible").length,
      prestado: copias.filter((c) => c.estado === "prestado").length,
      favorito: copias.filter((c) => c.favorito).length,
    }),
    [copias]
  );

  const conteoPorEstante = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const c of copias) {
      if (!c.estante) continue;
      mapa[c.estante] = (mapa[c.estante] ?? 0) + 1;
    }
    return mapa;
  }, [copias]);

  const filtrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    return copias.filter((c) => {
      const g = globales[c.isbn];
      if (filtro === "disponible" && c.estado !== "disponible") return false;
      if (filtro === "prestado" && c.estado !== "prestado") return false;
      if (filtro === "favorito" && !c.favorito) return false;
      if (shelfFilter !== "all" && c.estante !== shelfFilter) return false;
      if (term) {
        const haystack = `${g?.titulo ?? ""} ${g?.autor ?? ""} ${g?.genero ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [copias, globales, search, filtro, shelfFilter]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = copias.find((c) => c.id === selectedId) ?? null;

  async function handleCreateShelf() {
    if (!bibliotecaActual || !newShelf.trim()) return;
    try {
      await agregarEstante(bibliotecaActual.id, newShelf.trim());
      setNewShelf("");
      setShelfCreateOpen(false);
    } catch (err) {
      console.error("Error creando estante:", err);
      toast.error("No pudimos crear el estante.");
    }
  }

  async function handleDeleteShelf(nombre: string) {
    if (!bibliotecaActual) return;
    if (!window.confirm(`¿Eliminar el estante "${nombre}"?`)) return;
    try {
      await eliminarEstante(bibliotecaActual.id, nombre);
      setShelfFilter("all");
    } catch (err) {
      console.error("Error eliminando estante:", err);
      toast.error("No pudimos eliminar el estante.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">Catálogo</h1>
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput
            placeholder="Buscar por título, autor o género"
            value={search}
            onValueChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            className="w-[220px]"
          />
          {bibliotecaActual && (
            <ShareCatalogPopover
              bibliotecaId={bibliotecaActual.id}
              nombre={bibliotecaActual.nombre}
              catalogoPublico={bibliotecaActual.catalogoPublico}
            />
          )}
          <Button variant="outline" asChild>
            <Link href="/leidos">
              <BookCheck />
              Leídos
            </Link>
          </Button>
          <Button asChild>
            <Link href="/catalogo/agregar">
              <Plus />
              Agregar libro
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFiltro(f.key);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground",
              filtro === f.key && "border-foreground bg-foreground text-background"
            )}
          >
            {f.label} ({conteos[f.key]})
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-border" />
        <span className="text-xs text-muted-foreground">Estante:</span>
        <button
          onClick={() => setShelfFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground",
            shelfFilter === "all" && "border-foreground bg-foreground text-background"
          )}
        >
          Todos ({copias.length})
        </button>
        {estantes.map((e) => (
          <button
            key={e}
            onClick={() => setShelfFilter(e)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground",
              shelfFilter === e && "border-foreground bg-foreground text-background"
            )}
          >
            {e} ({conteoPorEstante[e] ?? 0})
          </button>
        ))}
        {shelfFilter !== "all" && (
          <button
            onClick={() => handleDeleteShelf(shelfFilter)}
            className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground"
          >
            Eliminar estante
          </button>
        )}
        {shelfCreateOpen ? (
          <div className="flex gap-1.5">
            <Input
              autoFocus
              value={newShelf}
              onChange={(e) => setNewShelf(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateShelf()}
              placeholder="Nombre del estante"
              className="h-8 w-40 text-xs"
            />
            <Button size="sm" className="h-8" onClick={handleCreateShelf}>
              Crear
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShelfCreateOpen(true)}
            className="rounded-full border border-dashed px-3 py-1.5 text-xs text-muted-foreground"
          >
            + Crear estante
          </button>
        )}
      </div>

      {filtrados.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {copias.length === 0
            ? "Todavía no agregaste ningún libro."
            : "Sin resultados para esta búsqueda."}
        </div>
      )}

      <div className="mb-6 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
        {pageItems.map((copia) => (
          <LibroCard
            key={copia.id}
            copia={copia}
            global={globales[copia.isbn]}
            onClick={() => setSelectedId(copia.id)}
            onToggleFavorito={() =>
              toggleFavorito(copia.id, !copia.favorito).catch((err) => {
                console.error("Error actualizando favorito:", err);
                toast.error("No pudimos actualizar el favorito.");
              })
            }
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={cn(
                "size-8 rounded-md border text-xs font-medium",
                n === page && "border-foreground bg-foreground text-background"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <LibroDetailSheet
        copia={selected}
        global={selected ? globales[selected.isbn] : undefined}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
