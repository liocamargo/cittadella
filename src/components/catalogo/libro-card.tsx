"use client";

import { BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  const titulo = global?.titulo || "Cargando…";
  const inicial = titulo.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col gap-2">
      <div onClick={onClick} className="relative cursor-pointer">
        <div className="flex aspect-[3/4.2] flex-col items-center justify-center rounded-lg border bg-[repeating-linear-gradient(135deg,var(--muted)_0,var(--muted)_10px,var(--background)_10px,var(--background)_20px)]">
          <div className="text-[26px] font-bold text-muted-foreground/60">
            {inicial}
          </div>
        </div>
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
          <BookMarked className="size-3.5" fill={copia.favorito ? "currentColor" : "none"} />
        </button>
      </div>
      <div onClick={onClick} className="cursor-pointer text-[13px] font-semibold leading-tight">
        {titulo}
      </div>
      <div className="text-xs text-muted-foreground">{global?.autor}</div>
      <div className="font-mono text-[11px] text-muted-foreground">
        {copia.estante || "Sin estante"}
      </div>
      <Badge
        variant={copia.estado === "disponible" ? "secondary" : "outline"}
        className="w-fit text-[11px]"
      >
        {copia.estado === "disponible" ? "Disponible" : `Prestado a ${copia.prestadoA}`}
      </Badge>
    </div>
  );
}
