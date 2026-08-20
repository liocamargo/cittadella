"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENEROS } from "@/lib/generos";
import { useLocale } from "@/hooks/use-locale";

interface GeneroSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function GeneroSelect({
  value,
  onValueChange,
  placeholder,
}: GeneroSelectProps) {
  const { t } = useLocale();
  const esConocido = !value || (GENEROS as readonly string[]).includes(value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder ?? t("generoSelect.placeholder")} />
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
