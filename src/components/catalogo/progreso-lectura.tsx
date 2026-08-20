"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/hooks/use-locale";

interface ProgresoLecturaProps {
  progreso?: number;
  onGuardar: (progreso: number) => Promise<void>;
}

export function ProgresoLectura({ progreso, onGuardar }: ProgresoLecturaProps) {
  const { t } = useLocale();
  const [valor, setValor] = useState(String(progreso ?? 0));
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setValor(String(progreso ?? 0));
  }, [progreso]);

  async function handleGuardar() {
    const numero = Math.max(0, Math.min(100, Math.round(Number(valor) || 0)));
    setGuardando(true);
    try {
      await onGuardar(numero);
      setValor(String(numero));
      toast.success(t("progresoLectura.actualizado"));
    } catch (err) {
      logError("Error actualizando el progreso de lectura:", err);
      toast.error(t("progresoLectura.errorActualizando"));
    } finally {
      setGuardando(false);
    }
  }

  const pct = Math.max(0, Math.min(100, progreso ?? 0));

  return (
    <div className="flex flex-col gap-1.5 border-t pt-3">
      <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {t("progresoLectura.titulo")}
      </Label>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={100}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGuardar()}
          className="w-20"
        />
        <span className="text-sm text-muted-foreground">%</span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleGuardar}
          disabled={guardando}
        >
          {t("progresoLectura.guardar")}
        </Button>
      </div>
    </div>
  );
}
