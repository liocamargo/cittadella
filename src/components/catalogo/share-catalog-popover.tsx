"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { logError } from "@/lib/log";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { setCatalogoPublico } from "@/lib/firestore/bibliotecas";
import { useLocale } from "@/hooks/use-locale";

interface ShareCatalogPopoverProps {
  bibliotecaId: string;
  nombre: string;
  catalogoPublico: boolean;
}

export function ShareCatalogPopover({
  bibliotecaId,
  nombre,
  catalogoPublico,
}: ShareCatalogPopoverProps) {
  const { t } = useLocale();
  const [actualizando, setActualizando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/compartido/${bibliotecaId}`
      : "";

  async function handleToggle(activo: boolean) {
    setActualizando(true);
    try {
      await setCatalogoPublico(bibliotecaId, activo);
    } catch (err) {
      logError("Error actualizando catalogoPublico:", err);
      toast.error(t("shareCatalog.errorActualizandoLink"));
    } finally {
      setActualizando(false);
    }
  }

  async function handleCopiar() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Share2 />
          {t("shareCatalog.compartir")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">{t("shareCatalog.linkPublico")}</div>
            <Switch
              checked={catalogoPublico}
              onCheckedChange={handleToggle}
              disabled={actualizando}
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("shareCatalog.descripcionPre")} <strong>{nombre}</strong>
            {t("shareCatalog.descripcionPost")}
          </p>
          {catalogoPublico && (
            <div className="flex gap-1.5">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={handleCopiar}>
                {copiado ? <Check /> : <Copy />}
                {copiado ? t("shareCatalog.copiado") : t("shareCatalog.copiar")}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
