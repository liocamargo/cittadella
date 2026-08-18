"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENEROS } from "@/lib/generos";

interface GeneroSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function GeneroSelect({
  value,
  onValueChange,
  placeholder = "Elegí un género",
}: GeneroSelectProps) {
  const esConocido = !value || (GENEROS as readonly string[]).includes(value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {!esConocido && <SelectItem value={value}>{value}</SelectItem>}
        {GENEROS.map((g) => (
          <SelectItem key={g} value={g}>
            {g}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
