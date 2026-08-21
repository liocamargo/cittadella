"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BookOpen, Heart } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logError } from "@/lib/log";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { agregarDeseo, getSeleccionSemanal } from "@/lib/firestore/libros";
import { listenDeseos, quitarDeseo } from "@/lib/firestore/deseos";
import { listenPerfil } from "@/lib/firestore/perfiles";
import type { LibroGlobal } from "@/types";

function linkLecturaDe(libro: LibroGlobal | null) {
  if (!libro) return undefined;
  return (
    libro.previewLink ??
    `https://www.google.com/search?q=${encodeURIComponent(`${libro.titulo} ${libro.autor ?? ""} libro`)}`
  );
}

interface SeleccionSemanalProps {
  isbnsPropios: string[];
}

export function SeleccionSemanal({ isbnsPropios }: SeleccionSemanalProps) {
  const { user } = useAuth();
  const { t } = useLocale();
  const [libros, setLibros] = useState<LibroGlobal[] | null>(null);
  const [seleccionado, setSeleccionado] = useState<LibroGlobal | null>(null);
  const [generosFavoritos, setGenerosFavoritos] = useState<string[]>([]);
  const [isbnsDeseados, setIsbnsDeseados] = useState<Set<string>>(new Set());
  const key = Array.from(new Set(isbnsPropios)).sort().join(",");

  useEffect(() => {
    if (!user) return;
    return listenPerfil(user.uid, (perfil) => {
      if (perfil) setGenerosFavoritos(perfil.generosFavoritos);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return listenDeseos(user.uid, (deseos) => {
      setIsbnsDeseados(new Set(deseos.map((d) => d.isbn)));
    });
  }, [user]);

  useEffect(() => {
    let cancelado = false;
    getSeleccionSemanal(isbnsPropios, generosFavoritos).then((r) => {
      if (!cancelado) setLibros(r);
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, generosFavoritos]);

  if (libros !== null && libros.length === 0) return null;

  const linkLectura = linkLecturaDe(seleccionado);

  async function handleToggleDeseo(libro: LibroGlobal) {
    if (!user) return;
    try {
      if (isbnsDeseados.has(libro.isbn)) {
        await quitarDeseo(user.uid, libro.isbn);
      } else {
        await agregarDeseo(libro.isbn, user.uid, {
          titulo: libro.titulo,
          subtitulo: libro.subtitulo,
          autor: libro.autor,
          ilustrador: libro.ilustrador,
          editorial: libro.editorial,
          anio: libro.anio,
          paginas: libro.paginas,
          volumen: libro.volumen,
          idioma: libro.idioma,
          genero: libro.genero,
          sinopsis: libro.sinopsis,
          portadaUrl: libro.portadaUrl,
        });
      }
    } catch (err) {
      logError("Error actualizando la lista de deseos:", err);
      toast.error(t("seleccionSemanal.errorActualizandoDeseo"));
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold">{t("seleccionSemanal.titulo")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {generosFavoritos.length > 0
          ? t("seleccionSemanal.descripcionConGustos")
          : t("seleccionSemanal.descripcion")}{" "}
        <Link href="/cuenta" className="underline">
          {generosFavoritos.length > 0
            ? t("seleccionSemanal.editarGustos")
            : t("seleccionSemanal.elegirGustos")}
        </Link>
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
        {(libros ?? Array.from({ length: 8 })).map((libro, i) =>
          libro ? (
            <div key={libro.isbn} className="flex flex-col gap-2">
              <div
                onClick={() => setSeleccionado(libro)}
                className="relative cursor-pointer"
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleDeseo(libro);
                  }}
                  className={cn(
                    "absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md bg-background/90 text-muted-foreground shadow-sm",
                    isbnsDeseados.has(libro.isbn) && "text-rose-500"
                  )}
                >
                  <Heart
                    className="size-3.5"
                    fill={isbnsDeseados.has(libro.isbn) ? "currentColor" : "none"}
                  />
                </button>
              </div>
              <div
                onClick={() => setSeleccionado(libro)}
                className="cursor-pointer text-xs font-semibold leading-tight"
              >
                {libro.titulo}
              </div>
              <div className="line-clamp-2 text-[11px] text-muted-foreground" title={libro.autor}>
                {libro.autor}
              </div>
            </div>
          ) : (
            <div
              key={i}
              className="aspect-[3/4.2] animate-pulse rounded-lg border bg-muted"
            />
          )
        )}
      </div>

      <Sheet
        open={Boolean(seleccionado)}
        onOpenChange={(o) => !o && setSeleccionado(null)}
      >
        <SheetContent side="right" className="w-full gap-0 sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle>{seleccionado?.titulo}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-6 text-sm">
            <div className="text-muted-foreground">{seleccionado?.autor}</div>
            {seleccionado?.sinopsis && (
              <p className="leading-relaxed">{seleccionado.sinopsis}</p>
            )}
            <Button
              variant="outline"
              className={cn(
                "w-full",
                seleccionado &&
                  isbnsDeseados.has(seleccionado.isbn) &&
                  "border-rose-500 bg-rose-500 text-white hover:bg-rose-600 hover:text-white"
              )}
              onClick={() => seleccionado && handleToggleDeseo(seleccionado)}
            >
              <Heart
                className="size-4"
                fill={
                  seleccionado && isbnsDeseados.has(seleccionado.isbn)
                    ? "currentColor"
                    : "none"
                }
              />
              {seleccionado && isbnsDeseados.has(seleccionado.isbn)
                ? t("seleccionSemanal.quitarDeDeseos")
                : t("seleccionSemanal.agregarADeseos")}
            </Button>
            {linkLectura && (
              <Button asChild variant="outline" className="w-full">
                <a href={linkLectura} target="_blank" rel="noopener noreferrer">
                  <BookOpen className="size-4" />
                  {seleccionado?.previewLink
                    ? t("seleccionSemanal.leerOnline")
                    : t("seleccionSemanal.buscarlo")}
                </a>
              </Button>
            )}
            <div className="flex gap-5 border-t pt-3">
              <div>
                <strong>★ {seleccionado?.ratingPromedio ?? 0}</strong>
                <span className="ml-1 text-muted-foreground">
                  {t("seleccionSemanal.resenas", { cantidad: seleccionado?.totalResenas ?? 0 })}
                </span>
              </div>
              <div className="text-muted-foreground">
                {t("seleccionSemanal.bibliotecasLoTienen", {
                  cantidad: seleccionado?.propietarios ?? 0,
                })}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
