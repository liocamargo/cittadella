"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCALES, LOCALE_INFO, type Locale } from "@/i18n/config";

interface LocaleSelectProps {
  value: Locale;
  onValueChange: (value: Locale) => void;
}

export function LocaleSelect({ value, onValueChange }: LocaleSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as Locale)}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((l) => (
          <SelectItem key={l} value={l}>
            {LOCALE_INFO[l].bandera} {LOCALE_INFO[l].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
