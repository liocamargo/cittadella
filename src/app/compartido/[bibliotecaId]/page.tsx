"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Library, Loader2, Mail, MessageCircle } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, normalizarBusqueda } from "@/lib/utils";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import type { CatalogoPublicoResponse, LibroCatalogoPublico } from "@/app/api/catalogo/[bibliotecaId]/route";

const PAGE_SIZE = 16;
type Filtro = "all" | "disponible" | "prestado";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "disponible", label: "Disponibles" },
  { key: "prestado", label: "Prestados" },
];

export default function CatalogoPublicoPage() {
  const params = useParams<{ bibliotecaId: string }>();
  const bibliotecaId = params.bibliotecaId;

  const [catalogo, setCatalogo] = useState<CatalogoPublicoResponse | null | undefined>(
    undefined
  );
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("all");
  const [page, setPage] = useState(1);
  const [seleccionada, setSeleccionada] = useState<LibroCatalogoPublico | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/catalogo/${bibliotecaId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CatalogoPublicoResponse | null) => {
        if (!cancelado) setCatalogo(data);
      })
      .catch(() => {
        if (!cancelado) setCatalogo(null);
      });
    return () => {
      cancelado = true;
    };
  }, [bibliotecaId]);

  const copias = catalogo?.libros ?? [];
  const isbns = copias.map((c) => c.isbn);
  const globales = useLibrosGlobales(isbns);

  if (catalogo === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!catalogo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Este catálogo no está disponible o el link ya no es público.
        </p>
      </div>
    );
  }

  const conteos = {
    all: copias.length,
    disponible: copias.filter((c) => c.estado === "disponible").length,
    prestado: copias.filter((c) => c.estado === "prestado").length,
  };

  const term = normalizarBusqueda(search.trim());
  const filtrados = copias.filter((c) => {
    if (filtro === "disponible" && c.estado !== "disponible") return false;
    if (filtro === "prestado" && c.estado !== "prestado") return false;
    if (!term) return true;
    const g = globales[c.isbn];
    return normalizarBusqueda(
      `${g?.titulo ?? ""} ${g?.autor ?? ""} ${g?.genero ?? ""}`
    ).includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const detalle = seleccionada ? globales[seleccionada.isbn] : undefined;

  const nombreDueño = catalogo.bibliotecarioNombre;
  const whatsappDueño = catalogo.bibliotecarioWhatsapp;
  const emailDueño = catalogo.bibliotecarioEmail;

  const mensajePedido = `Hola! Vi "${detalle?.titulo ?? "un libro"}" en el catálogo de ${catalogo.nombre} y quería consultar si está disponible para pedir.`;
  const linkWhatsapp = whatsappDueño
    ? `https://wa.me/${whatsappDueño.replace(/\D/g, "")}?text=${encodeURIComponent(mensajePedido)}`
    : null;
  const linkEmail = emailDueño
    ? `mailto:${emailDueño}?subject=${encodeURIComponent(
        `Consulta por "${detalle?.titulo ?? "un libro"}"`
      )}&body=${encodeURIComponent(mensajePedido)}`
    : null;

  return (
    <div className="min-h-screen bg-background px-6 py-10 md:px-12">
      <div>
        <div className="mb-1 flex items-center gap-2 text-muted-foreground">
          <Library className="size-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Catálogo público · solo lectura
          </span>
        </div>
        <h1 className="mb-1 text-2xl font-bold">{catalogo.nombre}</h1>
        {nombreDueño && (
          <p className="mb-6 text-sm text-muted-foreground">
            Bibliotecario: {nombreDueño}
          </p>
        )}

        <SearchInput
          placeholder="Buscar por título, autor o género"
          value={search}
          onValueChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          className="mb-4 max-w-xs"
        />

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
        </div>

        {filtrados.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {copias.length === 0
              ? "Esta biblioteca todavía no tiene libros cargados."
              : "Sin resultados para esta búsqueda."}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {pageItems.map((copia) => {
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
                <div className="line-clamp-2 text-xs text-muted-foreground" title={g?.autor}>
                  {g?.autor}
                </div>
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

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex size-8 items-center justify-center rounded-md border text-xs font-medium disabled:opacity-40"
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
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
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex size-8 items-center justify-center rounded-md border text-xs font-medium disabled:opacity-40"
              aria-label="Página siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
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
              {detalle?.volumen && (
                <div>
                  <strong>Volumen:</strong> {detalle.volumen}
                </div>
              )}
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

            {(linkWhatsapp || linkEmail) && (
              <Button asChild className="mt-1">
                <a href={linkWhatsapp ?? linkEmail ?? "#"} target="_blank" rel="noopener noreferrer">
                  {linkWhatsapp ? <MessageCircle /> : <Mail />}
                  Pedir por {linkWhatsapp ? "WhatsApp" : "email"}
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
