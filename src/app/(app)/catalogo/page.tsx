"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookPlus, LayoutGrid, List, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { cn, normalizarBusqueda } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import { listenInventario, toggleFavorito } from "@/lib/firestore/libros";
import { logError } from "@/lib/log";
import {
  agregarEstante,
  eliminarEstante,
} from "@/lib/firestore/bibliotecas";
import { LibroCard } from "@/components/catalogo/libro-card";
import { LibroListItem } from "@/components/catalogo/libro-list-item";
import { LibroDetailSheet } from "@/components/catalogo/libro-detail-sheet";
import { ShareCatalogPopover } from "@/components/catalogo/share-catalog-popover";
import type { LibroEnBiblioteca } from "@/types";

type Filtro = "all" | "disponible";

const FILTROS: Filtro[] = ["all", "disponible"];

/** Primera letra para agrupar/indexar; todo lo que no sea A-Z cae en "#". */
function letraDe(titulo: string): string {
  const letra = normalizarBusqueda(titulo).trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(letra) ? letra : "#";
}

function idLetra(letra: string) {
  return `catalogo-letra-${letra === "#" ? "num" : letra}`;
}

function irALetra(letra: string) {
  document.getElementById(idLetra(letra))?.scrollIntoView({ block: "start" });
}

export default function CatalogoPage() {
  const { t } = useLocale();
  const { bibliotecaActual } = useBiblioteca();
  const [copias, setCopias] = useState<LibroEnBiblioteca[]>([]);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("all");
  const [shelfFilter, setShelfFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newShelf, setNewShelf] = useState("");
  const [shelfCreateOpen, setShelfCreateOpen] = useState(false);
  const [vista, setVista] = useState<"grilla" | "lista">("grilla");

  useEffect(() => {
    const guardada = localStorage.getItem("catalogo-vista");
    if (guardada === "grilla" || guardada === "lista") setVista(guardada);
  }, []);

  function cambiarVista(v: "grilla" | "lista") {
    setVista(v);
    localStorage.setItem("catalogo-vista", v);
  }

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
    const term = normalizarBusqueda(search.trim());
    return copias.filter((c) => {
      const g = globales[c.isbn];
      if (filtro === "disponible" && c.estado !== "disponible") return false;
      if (shelfFilter !== "all" && c.estante !== shelfFilter) return false;
      if (term) {
        const haystack = normalizarBusqueda(
          `${g?.titulo ?? ""} ${g?.autor ?? ""} ${g?.genero ?? ""}`
        );
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [copias, globales, search, filtro, shelfFilter]);

  const ordenados = useMemo(() => {
    const collator = new Intl.Collator("es", { sensitivity: "base" });
    return [...filtrados].sort((a, b) => {
      const ta = globales[a.isbn]?.titulo ?? "";
      const tb = globales[b.isbn]?.titulo ?? "";
      return collator.compare(ta, tb);
    });
  }, [filtrados, globales]);

  const grupos = useMemo(() => {
    const acumulado: { letra: string; items: LibroEnBiblioteca[] }[] = [];
    for (const copia of ordenados) {
      const letra = letraDe(globales[copia.isbn]?.titulo ?? "");
      const ultimo = acumulado[acumulado.length - 1];
      if (ultimo?.letra === letra) {
        ultimo.items.push(copia);
      } else {
        acumulado.push({ letra, items: [copia] });
      }
    }
    return acumulado;
  }, [ordenados, globales]);

  const letrasDisponibles = useMemo(
    () => grupos.map((g) => g.letra),
    [grupos]
  );

  const selected = copias.find((c) => c.id === selectedId) ?? null;

  const filtroLabel: Record<Filtro, string> = {
    all: t("catalogo.filtroTodos"),
    disponible: t("catalogo.filtroDisponibles"),
  };

  async function handleCreateShelf() {
    if (!bibliotecaActual || !newShelf.trim()) return;
    try {
      await agregarEstante(bibliotecaActual.id, newShelf.trim());
      setNewShelf("");
      setShelfCreateOpen(false);
    } catch (err) {
      logError("Error creando estante:", err);
      toast.error(t("catalogo.errorCrearEstante"));
    }
  }

  async function handleDeleteShelf(nombre: string) {
    if (!bibliotecaActual) return;
    if (!window.confirm(t("catalogo.confirmarEliminarEstante", { nombre }))) return;
    try {
      await eliminarEstante(bibliotecaActual.id, nombre);
      setShelfFilter("all");
    } catch (err) {
      logError("Error eliminando estante:", err);
      toast.error(t("catalogo.errorEliminarEstante"));
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("catalogo.titulo")}</h1>
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput
            placeholder={t("catalogo.buscarPlaceholder")}
            value={search}
            onValueChange={setSearch}
            className="w-[220px]"
          />
          {bibliotecaActual && (
            <ShareCatalogPopover
              bibliotecaId={bibliotecaActual.id}
              nombre={bibliotecaActual.nombre}
              catalogoPublico={bibliotecaActual.catalogoPublico}
            />
          )}
          <div className="flex items-center gap-0.5 rounded-md border p-0.5">
            <button
              onClick={() => cambiarVista("grilla")}
              className={cn(
                "flex size-7 items-center justify-center rounded text-muted-foreground",
                vista === "grilla" && "bg-accent text-foreground"
              )}
              aria-label={t("catalogo.vistaGrilla")}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => cambiarVista("lista")}
              className={cn(
                "flex size-7 items-center justify-center rounded text-muted-foreground",
                vista === "lista" && "bg-accent text-foreground"
              )}
              aria-label={t("catalogo.vistaLista")}
            >
              <List className="size-4" />
            </button>
          </div>
          <Button asChild className="hidden md:inline-flex">
            <Link href="/catalogo/agregar">
              <Plus />
              {t("catalogo.agregarLibro")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile: FAB flotante para agregar */}
      <Link
        href="/catalogo/agregar"
        className="fixed right-4 bottom-20 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
        aria-label={t("catalogo.agregarLibro")}
      >
        <BookPlus className="size-6" />
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground",
              filtro === f && "border-foreground bg-foreground text-background"
            )}
          >
            {filtroLabel[f]} ({conteos[f]})
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-border" />
        <span className="text-xs text-muted-foreground">{t("catalogo.estanteLabel")}</span>
        <button
          onClick={() => setShelfFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground",
            shelfFilter === "all" && "border-foreground bg-foreground text-background"
          )}
        >
          {t("catalogo.estanteTodos")} ({copias.length})
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
            {t("catalogo.eliminarEstante")}
          </button>
        )}
        {shelfCreateOpen ? (
          <div className="flex gap-1.5">
            <Input
              autoFocus
              value={newShelf}
              onChange={(e) => setNewShelf(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateShelf()}
              placeholder={t("catalogo.nombreEstantePlaceholder")}
              className="h-8 w-40 text-xs"
            />
            <Button size="sm" className="h-8" onClick={handleCreateShelf}>
              {t("catalogo.crear")}
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShelfCreateOpen(true)}
            className="rounded-full border border-dashed px-3 py-1.5 text-xs text-muted-foreground"
          >
            {t("catalogo.crearEstante")}
          </button>
        )}
      </div>

      {filtrados.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {copias.length === 0
            ? t("catalogo.vacioSinLibros")
            : t("catalogo.vacioSinResultados")}
        </div>
      )}

      <div
        className={cn(
          "relative mb-16 md:mb-0",
          letrasDisponibles.length > 3 && "pr-8"
        )}
      >
        {grupos.map((grupo) => (
          <div key={grupo.letra} className="mb-6">
            <div
              id={idLetra(grupo.letra)}
              className="sticky top-0 z-10 -mx-1 bg-background px-1 py-1.5 text-xs font-bold text-muted-foreground"
            >
              {grupo.letra}
            </div>
            {vista === "grilla" ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-5">
                {grupo.items.map((copia) => (
                  <LibroCard
                    key={copia.id}
                    copia={copia}
                    global={globales[copia.isbn]}
                    onClick={() => setSelectedId(copia.id)}
                    onToggleFavorito={() =>
                      toggleFavorito(copia.id, !copia.favorito).catch((err) => {
                        logError("Error actualizando favorito:", err);
                        toast.error(t("catalogo.errorActualizarFavorito"));
                      })
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {grupo.items.map((copia) => (
                  <LibroListItem
                    key={copia.id}
                    copia={copia}
                    global={globales[copia.isbn]}
                    onClick={() => setSelectedId(copia.id)}
                    onToggleFavorito={() =>
                      toggleFavorito(copia.id, !copia.favorito).catch((err) => {
                        logError("Error actualizando favorito:", err);
                        toast.error(t("catalogo.errorActualizarFavorito"));
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {letrasDisponibles.length > 3 && (
          <div className="fixed right-1 top-1/2 z-30 flex max-h-[55vh] -translate-y-1/2 flex-col overflow-y-auto rounded-full bg-background/80 px-0.5 py-1 backdrop-blur-sm">
            {letrasDisponibles.map((letra) => (
              <button
                key={letra}
                onClick={() => irALetra(letra)}
                className="px-1 text-[10px] font-semibold leading-[1.4] text-muted-foreground hover:text-foreground"
              >
                {letra}
              </button>
            ))}
          </div>
        )}
      </div>

      <LibroDetailSheet
        copia={selected}
        global={selected ? globales[selected.isbn] : undefined}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
