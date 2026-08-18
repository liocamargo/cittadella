"use client";

import { cn } from "@/lib/utils";
import { GENEROS, type Genero } from "@/lib/generos";

interface GeneroMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  /** Texto alternativo por género (ej: frases divertidas en el onboarding). El valor guardado sigue siendo el nombre real. */
  labels?: Partial<Record<Genero, string>>;
}

export function GeneroMultiSelect({ value, onChange, labels }: GeneroMultiSelectProps) {
  function toggle(genero: string) {
    if (value.includes(genero)) {
      onChange(value.filter((g) => g !== genero));
    } else {
      onChange([...value, genero]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {GENEROS.map((g) => {
        const activo = value.includes(g);
        return (
          <button
            key={g}
            type="button"
            onClick={() => toggle(g)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              activo
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground"
            )}
          >
            {labels?.[g] ?? g}
          </button>
        );
      })}
    </div>
  );
}
