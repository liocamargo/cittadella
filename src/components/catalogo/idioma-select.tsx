"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const IDIOMAS = [
  { value: "es", label: "🇪🇸 Español" },
  { value: "en", label: "🇺🇸 Inglés" },
  { value: "pt", label: "🇧🇷 Portugués" },
  { value: "fr", label: "🇫🇷 Francés" },
  { value: "it", label: "🇮🇹 Italiano" },
  { value: "de", label: "🇩🇪 Alemán" },
  { value: "otro", label: "🌐 Otro" },
];

interface IdiomaSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function IdiomaSelect({ value, onValueChange }: IdiomaSelectProps) {
  const valorActual = value || "es";
  const esConocido = IDIOMAS.some((i) => i.value === valorActual);

  return (
    <Select value={valorActual} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Idioma" />
      </SelectTrigger>
      <SelectContent>
        {!esConocido && <SelectItem value={valorActual}>{valorActual}</SelectItem>}
        {IDIOMAS.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
