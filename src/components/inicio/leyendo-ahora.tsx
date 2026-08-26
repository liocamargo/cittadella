"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/hooks/use-locale";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import { listenProgresoKosync } from "@/lib/firestore/kosync-progreso";
import { listenEbooksDeBiblioteca, vincularDigestKosync } from "@/lib/firestore/ebooks";
import { logError } from "@/lib/log";
import type { Ebook, KosyncProgreso } from "@/types";

interface LeyendoAhoraProps {
  uid: string;
  bibliotecaId: string;
}

/** El protocolo KOSync manda el porcentaje como fracción (0-1), no como 0-100. */
function porcentajeDe(progreso: KosyncProgreso): number {
  return Math.round(progreso.percentage <= 1 ? progreso.percentage * 100 : progreso.percentage);
}

/**
 * Progreso de lectura reportado por KOReader (protocolo KOSync). KOReader
 * identifica cada archivo con un digest propio que no calculamos acá, así
 * que un progreso nuevo aparece "sin vincular" hasta que el usuario elige
 * una sola vez a qué ebook corresponde; a partir de ahí resuelve solo.
 */
export function LeyendoAhora({ uid, bibliotecaId }: LeyendoAhoraProps) {
  const { t } = useLocale();
  const [progresos, setProgresos] = useState<KosyncProgreso[]>([]);
  const [ebooks, setEbooks] = useState<Ebook[]>([]);

  useEffect(() => listenProgresoKosync(uid, setProgresos), [uid]);
  useEffect(() => listenEbooksDeBiblioteca(bibliotecaId, setEbooks), [bibliotecaId]);

  const porDigest = useMemo(() => {
    const mapa = new Map<string, Ebook>();
    for (const e of ebooks) {
      if (e.koreaderDigest) mapa.set(e.koreaderDigest, e);
    }
    return mapa;
  }, [ebooks]);

  const isbns = useMemo(() => ebooks.map((e) => e.isbn), [ebooks]);
  const globales = useLibrosGlobales(isbns);

  const resueltos = progresos
    .map((progreso) => ({ progreso, ebook: porDigest.get(progreso.document) }))
    .filter((r): r is { progreso: KosyncProgreso; ebook: Ebook } => Boolean(r.ebook));
  const sinResolver = progresos.filter((p) => !porDigest.has(p.document));
  const ebooksSinVincular = ebooks.filter((e) => !e.koreaderDigest);

  async function handleVincular(document: string, ebookId: string) {
    try {
      await vincularDigestKosync(ebookId, document);
    } catch (err) {
      logError("Error vinculando el progreso de KOReader:", err);
      toast.error(t("inicio.errorVinculandoProgreso"));
    }
  }

  if (progresos.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="mb-1 text-lg font-bold">{t("inicio.leyendoAhoraTitulo")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {t("inicio.leyendoAhoraDescripcion")}
      </p>
      <div className="flex flex-col gap-3">
        {resueltos.map(({ progreso, ebook }) => {
          const libro = globales[ebook.isbn];
          const porcentaje = porcentajeDe(progreso);
          return (
            <div key={progreso.id} className="flex items-center gap-3 rounded-xl border p-3">
              {libro?.portadaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={libro.portadaUrl}
                  alt={libro.titulo}
                  className="h-14 w-10 shrink-0 rounded-sm border object-cover"
                />
              ) : (
                <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-sm border bg-muted">
                  <BookOpen className="size-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {libro?.titulo ?? ebook.isbn}
                </div>
                <Progress value={porcentaje} className="mt-1.5 h-1.5" />
              </div>
              <div className="shrink-0 text-sm font-semibold text-muted-foreground">
                {porcentaje}%
              </div>
            </div>
          );
        })}

        {sinResolver.map((progreso) => (
          <div
            key={progreso.id}
            className="flex flex-col gap-2 rounded-xl border border-dashed p-3 text-sm"
          >
            <div className="text-muted-foreground">
              {t("inicio.progresoSinVincular", { porcentaje: porcentajeDe(progreso) })}
            </div>
            {ebooksSinVincular.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("inicio.sinEbooksParaVincular")}
              </p>
            ) : (
              <Select onValueChange={(ebookId) => handleVincular(progreso.document, ebookId)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("inicio.queLibroEs")} />
                </SelectTrigger>
                <SelectContent>
                  {ebooksSinVincular.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {globales[e.isbn]?.titulo ?? e.isbn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
