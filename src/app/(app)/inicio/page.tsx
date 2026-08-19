"use client";

import { useEffect, useState } from "react";
import { Library, ArrowLeftRight, BookCheck, Target, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { listenInventario } from "@/lib/firestore/libros";
import { getMetaLectura, setMetaLectura } from "@/lib/firestore/metas";
import { SeleccionSemanal } from "@/components/inicio/seleccion-semanal";
import type { LibroEnBiblioteca } from "@/types";
import { logError } from "@/lib/log";

export default function InicioPage() {
  const { user } = useAuth();
  const { bibliotecaActual } = useBiblioteca();
  const [copias, setCopias] = useState<LibroEnBiblioteca[]>([]);
  const [meta, setMeta] = useState(0);
  const [editando, setEditando] = useState(false);
  const [metaInput, setMetaInput] = useState("0");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!bibliotecaActual) {
      setCopias([]);
      return;
    }
    return listenInventario(bibliotecaActual.id, setCopias);
  }, [bibliotecaActual]);

  useEffect(() => {
    if (!user) return;
    getMetaLectura(user.uid).then((m) => {
      setMeta(m);
      setMetaInput(String(m));
    });
  }, [user]);

  const totalLibros = copias.length;
  const prestados = copias.filter((c) => c.estado === "prestado").length;
  const leidos = copias.filter((c) => c.leido).length;
  const progreso = meta > 0 ? Math.min(100, Math.round((leidos / meta) * 100)) : 0;

  async function handleGuardarMeta() {
    if (!user) return;
    const n = Math.max(0, parseInt(metaInput, 10) || 0);
    setGuardando(true);
    try {
      await setMetaLectura(user.uid, n);
      setMeta(n);
      setEditando(false);
    } catch (err) {
      logError("Error guardando el objetivo de lectura:", err);
      toast.error("No pudimos guardar tu objetivo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Inicio</h1>

      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex flex-col gap-2 rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Libros
            </span>
            <Library className="size-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">{totalLibros}</div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Prestados
            </span>
            <ArrowLeftRight className="size-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">{prestados}</div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Leídos
            </span>
            <BookCheck className="size-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">{leidos}</div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tu objetivo
            </span>
            <Target className="size-4 text-muted-foreground" />
          </div>
          {editando ? (
            <div className="flex gap-1.5">
              <Input
                type="number"
                min={0}
                value={metaInput}
                onChange={(e) => setMetaInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGuardarMeta()}
                className="h-8 text-sm"
                autoFocus
              />
              <Button
                size="sm"
                className="h-8"
                disabled={guardando}
                onClick={handleGuardarMeta}
              >
                <Check className="size-3.5" />
              </Button>
            </div>
          ) : (
            <button onClick={() => setEditando(true)} className="text-left">
              <div className="text-3xl font-bold">
                {leidos}
                <span className="text-base font-normal text-muted-foreground">
                  /{meta}
                </span>
              </div>
              {meta > 0 ? (
                <Progress value={progreso} className="mt-1.5 h-1.5" />
              ) : (
                <span className="text-xs text-muted-foreground underline">
                  Poné tu objetivo
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <SeleccionSemanal isbnsPropios={copias.map((c) => c.isbn)} />
    </div>
  );
}
