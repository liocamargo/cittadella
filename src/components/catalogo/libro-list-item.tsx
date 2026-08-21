"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";
import type { LibroEnBiblioteca, LibroGlobal } from "@/types";

interface LibroListItemProps {
  copia: LibroEnBiblioteca;
  global?: LibroGlobal;
  onClick: () => void;
  onToggleFavorito: () => void;
}

export function LibroListItem({
  copia,
  global,
  onClick,
  onToggleFavorito,
}: LibroListItemProps) {
  const { t } = useLocale();
  const titulo = global?.titulo || t("common.cargando");
  const inicial = titulo.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-2.5 hover:bg-accent/40"
    >
      {global?.portadaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={global.portadaUrl}
          alt={titulo}
          className="h-16 w-11 shrink-0 rounded-md border object-cover"
        />
      ) : (
        <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded-md border bg-muted">
          <span className="text-sm font-bold text-muted-foreground/60">{inicial}</span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold leading-tight">{titulo}</div>
        <div className="truncate text-xs text-muted-foreground">{global?.autor}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">
            {copia.estante || t("libroListItem.sinEstante")}
          </span>
          <Badge
            variant={copia.estado === "disponible" ? "secondary" : "outline"}
            className="text-[11px]"
          >
            {copia.estado === "disponible"
              ? t("libroDetail.disponible")
              : t("libroDetail.prestadoA", { nombre: copia.prestadoA ?? "" })}
          </Badge>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorito();
        }}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground",
          copia.favorito && "text-rose-500"
        )}
      >
        <Heart className="size-4" fill={copia.favorito ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
