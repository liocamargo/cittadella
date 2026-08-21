"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import { listenInventario } from "@/lib/firestore/libros";
import { listenDeseos, type Deseo } from "@/lib/firestore/deseos";
import { LibroDetailSheet } from "@/components/catalogo/libro-detail-sheet";
import { DeseoDetailDialog } from "@/components/deseos/deseo-detail-dialog";
import type { LibroEnBiblioteca } from "@/types";

export default function DeseosPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { bibliotecaActual } = useBiblioteca();
  const [copias, setCopias] = useState<LibroEnBiblioteca[]>([]);
  const [deseos, setDeseos] = useState<Deseo[]>([]);
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
    return listenDeseos(user.uid, setDeseos);
  }, [user]);

  const copiasDeseadas = useMemo(() => copias.filter((c) => c.favorito), [copias]);
  const isbnsPropios = new Set(copias.map((c) => c.isbn));
  const deseosSueltos = useMemo(
    () => deseos.filter((d) => !isbnsPropios.has(d.isbn)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deseos, copias]
  );

  const isbns = [
    ...copiasDeseadas.map((c) => c.isbn),
    ...deseosSueltos.map((d) => d.isbn),
  ];
  const globales = useLibrosGlobales(isbns);

  const copiaSeleccionada = copias.find((c) => c.id === seleccionCopiaId) ?? null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("deseos.titulo")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("deseos.totalDeseos", {
              cantidad: copiasDeseadas.length + deseosSueltos.length,
            })}
          </p>
        </div>
        <Button asChild>
          <Link href="/deseos/agregar">
            <Plus />
            {t("deseos.agregar")}
          </Link>
        </Button>
      </div>

      {copiasDeseadas.length + deseosSueltos.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {t("deseos.vacio")}
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
        {copiasDeseadas.map((copia) => {
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
                {t("deseos.enBiblioteca", {
                  estante: copia.estante || t("deseos.sinEstante"),
                })}
              </Badge>
            </button>
          );
        })}

        {deseosSueltos.map((deseo) => {
          const g = globales[deseo.isbn];
          const inicial = (g?.titulo ?? "?").trim().charAt(0).toUpperCase();
          return (
            <button
              key={deseo.id}
              onClick={() => setSeleccionIsbnSuelto(deseo.isbn)}
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
                {t("deseos.noEnBiblioteca")}
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

      <DeseoDetailDialog
        isbn={seleccionIsbnSuelto}
        global={seleccionIsbnSuelto ? globales[seleccionIsbnSuelto] : undefined}
        onClose={() => setSeleccionIsbnSuelto(null)}
      />
    </div>
  );
}
