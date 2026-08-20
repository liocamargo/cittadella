"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";
import type { LibroEnBiblioteca, LibroGlobal } from "@/types";

interface LibroCardProps {
  copia: LibroEnBiblioteca;
  global?: LibroGlobal;
  onClick: () => void;
  onToggleFavorito: () => void;
}

export function LibroCard({
  copia,
  global,
  onClick,
  onToggleFavorito,
}: LibroCardProps) {
  const { t } = useLocale();
  const titulo = global?.titulo || t("common.cargando");
  const inicial = titulo.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col gap-2">
      <div onClick={onClick} className="relative cursor-pointer">
        {global?.portadaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={global.portadaUrl}
            alt={titulo}
            className="aspect-[3/4.2] w-full rounded-lg border object-cover"
          />
        ) : (
          <div className="flex aspect-[3/4.2] flex-col items-center justify-center rounded-lg border bg-[repeating-linear-gradient(135deg,var(--muted)_0,var(--muted)_10px,var(--background)_10px,var(--background)_20px)]">
            <div className="text-[26px] font-bold text-muted-foreground/60">
              {inicial}
            </div>
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorito();
          }}
          className={cn(
            "absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md bg-background/90 text-muted-foreground shadow-sm",
            copia.favorito && "text-amber-500"
          )}
        >
          <Star className="size-3.5" fill={copia.favorito ? "currentColor" : "none"} />
        </button>
      </div>
      <div onClick={onClick} className="cursor-pointer text-[13px] font-semibold leading-tight">
        {titulo}
      </div>
      <div className="line-clamp-2 text-xs text-muted-foreground" title={global?.autor}>
        {global?.autor}
      </div>
      <div className="font-mono text-[11px] text-muted-foreground">
        {copia.estante || t("libroCard.sinEstante")}
      </div>
      <Badge
        variant={copia.estado === "disponible" ? "secondary" : "outline"}
        className="w-fit text-[11px]"
      >
        {copia.estado === "disponible"
          ? t("libroDetail.disponible")
          : t("libroDetail.prestadoA", { nombre: copia.prestadoA ?? "" })}
      </Badge>
    </div>
  );
}
