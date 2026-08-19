"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IdCard, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { logError, logSuccess } from "@/lib/log";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import {
  actualizarSocio,
  crearSocio,
  eliminarSocio,
  listenSocios,
} from "@/lib/firestore/socios";
import { listenHistorialDeSocio } from "@/lib/firestore/libros";
import type { HistorialPrestamo, Socio } from "@/types";

const FORM_INICIAL = { nombre: "", telefono: "", email: "", notas: "" };

export default function SociosPage() {
  const { bibliotecaActual } = useBiblioteca();
  const [socios, setSocios] = useState<Socio[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [historial, setHistorial] = useState<HistorialPrestamo[]>([]);

  useEffect(() => {
    if (!bibliotecaActual) {
      setSocios([]);
      return;
    }
    return listenSocios(bibliotecaActual.id, setSocios);
  }, [bibliotecaActual]);

  useEffect(() => {
    if (!detalleId) {
      setHistorial([]);
      return;
    }
    return listenHistorialDeSocio(detalleId, setHistorial);
  }, [detalleId]);

  const isbnsHistorial = useMemo(() => historial.map((h) => h.isbn), [historial]);
  const globalesHistorial = useLibrosGlobales(isbnsHistorial);
  const socioDetalle = socios.find((s) => s.id === detalleId) ?? null;

  function setCampo<K extends keyof typeof FORM_INICIAL>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function abrirNuevo() {
    setEditandoId(null);
    setForm(FORM_INICIAL);
    setFormOpen(true);
  }

  function abrirEditar(socio: Socio) {
    setEditandoId(socio.id);
    setForm({
      nombre: socio.nombre,
      telefono: socio.telefono ?? "",
      email: socio.email ?? "",
      notas: socio.notas ?? "",
    });
    setFormOpen(true);
  }

  async function handleGuardar() {
    if (!bibliotecaActual) return;
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    setGuardando(true);
    try {
      const datos = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || undefined,
        email: form.email.trim() || undefined,
        notas: form.notas.trim() || undefined,
      };
      if (editandoId) {
        await actualizarSocio(editandoId, datos);
        logSuccess("Socio actualizado.", datos);
        toast.success("Socio actualizado.");
      } else {
        await crearSocio(bibliotecaActual.id, datos);
        logSuccess("Socio agregado.", datos);
        toast.success("Socio agregado.");
      }
      setFormOpen(false);
    } catch (err) {
      logError("Error guardando el socio:", err);
      toast.error("No pudimos guardar el socio.");
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(socio: Socio) {
    if (!window.confirm(`¿Eliminar a "${socio.nombre}" de los socios?`)) return;
    try {
      await eliminarSocio(socio.id);
      if (detalleId === socio.id) setDetalleId(null);
    } catch (err) {
      logError("Error eliminando el socio:", err);
      toast.error("No pudimos eliminar el socio.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Socios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Base de socios para el modo de préstamos por socio.
          </p>
        </div>
        <Button onClick={abrirNuevo}>
          <Plus />
          Agregar socio
        </Button>
      </div>

      {!bibliotecaActual?.modoSocios && (
        <div className="mb-6 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          El modo socios está apagado. Podés cargar socios igual, pero los
          préstamos van a seguir anotando un nombre libre hasta que lo
          actives en Espacio compartido.
        </div>
      )}

      {socios.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Todavía no cargaste ningún socio.
        </div>
      )}

      <div className="flex flex-col divide-y overflow-hidden rounded-lg border">
        {socios.map((s) => (
          <button
            key={s.id}
            onClick={() => setDetalleId(s.id)}
            className="flex items-center justify-between gap-3 bg-card p-3.5 text-left hover:bg-accent/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted">
                <IdCard className="size-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-semibold">{s.nombre}</div>
                <div className="text-xs text-muted-foreground">
                  {[s.telefono, s.email].filter(Boolean).join(" · ") ||
                    "Sin datos de contacto"}
                </div>
              </div>
            </div>
            <div
              className="flex shrink-0 gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="icon"
                variant="outline"
                onClick={() => abrirEditar(s)}
                aria-label="Editar socio"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleEliminar(s)}
                aria-label="Eliminar socio"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar socio" : "Agregar socio"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Nombre
              </Label>
              <Input
                value={form.nombre}
                onChange={(e) => setCampo("nombre", e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Teléfono
              </Label>
              <Input
                value={form.telefono}
                onChange={(e) => setCampo("telefono", e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Email
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setCampo("email", e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Notas
              </Label>
              <Textarea
                rows={2}
                value={form.notas}
                onChange={(e) => setCampo("notas", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={guardando}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detalleId)} onOpenChange={(o) => !o && setDetalleId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{socioDetalle?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm">
            <div className="text-muted-foreground">
              {[socioDetalle?.telefono, socioDetalle?.email]
                .filter(Boolean)
                .join(" · ") || "Sin datos de contacto"}
            </div>
            {socioDetalle?.notas && (
              <p className="text-muted-foreground">{socioDetalle.notas}</p>
            )}

            <div className="mt-2 border-t pt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Historial de préstamos
            </div>
            {historial.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Todavía no le prestaste ningún libro.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {historial.map((h) => {
                const g = globalesHistorial[h.isbn];
                return (
                  <div key={h.id} className="rounded-lg border bg-muted/40 p-2.5 text-xs">
                    <div className="font-semibold">{g?.titulo ?? "Libro"}</div>
                    <div className="text-muted-foreground">
                      Prestado: {h.fechaPrestamo?.slice(0, 10)}
                      {h.fechaDevolucion
                        ? ` · Devuelto: ${h.fechaDevolucion.slice(0, 10)}`
                        : " · Todavía no devuelto"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
