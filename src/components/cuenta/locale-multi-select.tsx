"use client";

import { cn } from "@/lib/utils";
import { LOCALES, LOCALE_INFO, type Locale } from "@/i18n/config";

interface LocaleMultiSelectProps {
  value: Locale[];
  onChange: (value: Locale[]) => void;
}

export function LocaleMultiSelect({ value, onChange }: LocaleMultiSelectProps) {
  function toggle(locale: Locale) {
    if (value.includes(locale)) {
      if (value.length === 1) return; // siempre tiene que quedar al menos uno
      onChange(value.filter((l) => l !== locale));
    } else {
      onChange([...value, locale]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {LOCALES.map((l) => {
        const activo = value.includes(l);
        return (
          <button
            key={l}
            type="button"
            onClick={() => toggle(l)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              activo
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground"
            )}
          >
            <span>{LOCALE_INFO[l].bandera}</span>
            {LOCALE_INFO[l].label}
          </button>
        );
      })}
    </div>
  );
}
