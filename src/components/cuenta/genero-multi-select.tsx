"use client";

import { cn } from "@/lib/utils";
import { GENEROS } from "@/lib/generos";

interface GeneroMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function GeneroMultiSelect({ value, onChange }: GeneroMultiSelectProps) {
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
            {g}
          </button>
        );
      })}
    </div>
  );
}
