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
      toast.error("No pudimos actualizar el link público.");
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
          Compartir
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Link público de solo lectura</div>
            <Switch
              checked={catalogoPublico}
              onCheckedChange={handleToggle}
              disabled={actualizando}
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Cualquiera con este link puede ver el catálogo de{" "}
            <strong>{nombre}</strong>, sin poder editarlo.
          </p>
          {catalogoPublico && (
            <div className="flex gap-1.5">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={handleCopiar}>
                {copiado ? <Check /> : <Copy />}
                {copiado ? "Copiado" : "Copiar"}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
