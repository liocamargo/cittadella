"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/hooks/use-locale";

const IDIOMAS_INFO = [
  { value: "es", bandera: "🇪🇸", key: "idiomaSelect.espanol" },
  { value: "en", bandera: "🇺🇸", key: "idiomaSelect.ingles" },
  { value: "pt", bandera: "🇧🇷", key: "idiomaSelect.portugues" },
  { value: "fr", bandera: "🇫🇷", key: "idiomaSelect.frances" },
  { value: "it", bandera: "🇮🇹", key: "idiomaSelect.italiano" },
  { value: "de", bandera: "🇩🇪", key: "idiomaSelect.aleman" },
  { value: "otro", bandera: "🌐", key: "idiomaSelect.otro" },
];

interface IdiomaSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function IdiomaSelect({ value, onValueChange }: IdiomaSelectProps) {
  const { t } = useLocale();
  const valorActual = value || "es";
  const esConocido = IDIOMAS_INFO.some((i) => i.value === valorActual);

  return (
    <Select value={valorActual} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t("idiomaSelect.placeholder")} />
      </SelectTrigger>
      <SelectContent>
        {!esConocido && <SelectItem value={valorActual}>{valorActual}</SelectItem>}
        {IDIOMAS_INFO.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.bandera} {t(i.key)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
