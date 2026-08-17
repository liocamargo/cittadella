"use client";

import { Frown, Meh, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

const OPCIONES = [
  { valor: 1, Icono: Frown, color: "text-red-500", activo: "border-red-500 bg-red-50 dark:bg-red-500/15" },
  { valor: 3, Icono: Meh, color: "text-orange-500", activo: "border-orange-500 bg-orange-50 dark:bg-orange-500/15" },
  { valor: 5, Icono: Smile, color: "text-green-500", activo: "border-green-500 bg-green-50 dark:bg-green-500/15" },
] as const;

function opcionParaEstrellas(estrellas: number) {
  if (estrellas <= 2) return OPCIONES[0];
  if (estrellas === 3) return OPCIONES[1];
  return OPCIONES[2];
}

/** Selector de reseña con 3 caras (mala/neutral/buena) en vez de estrellas. */
export function RatingCaraPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (valor: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {OPCIONES.map(({ valor, Icono, color, activo }) => (
        <button
          key={valor}
          type="button"
          onClick={() => onChange(valor)}
          className={cn(
            "flex size-9 items-center justify-center rounded-full border text-muted-foreground transition-colors",
            value === valor && cn(color, activo)
          )}
        >
          <Icono className="size-5" />
        </button>
      ))}
    </div>
  );
}

/** Muestra una reseña ya publicada como una única cara de color. */
export function RatingCara({
  estrellas,
  className,
}: {
  estrellas: number;
  className?: string;
}) {
  const { Icono, color } = opcionParaEstrellas(estrellas);
  return <Icono className={cn("size-4", color, className)} />;
}
