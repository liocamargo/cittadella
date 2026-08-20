"use client";

import { useEffect, useMemo, useState } from "react";
import { Handshake } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/hooks/use-locale";
import { logError } from "@/lib/log";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import { devolverLibro, listenInventario, prestarLibro } from "@/lib/firestore/libros";
import { listenSocios } from "@/lib/firestore/socios";
import type { LibroEnBiblioteca, Socio } from "@/types";

export default function PrestamosPage() {
  const { t } = useLocale();
  const { bibliotecaActual } = useBiblioteca();
  const [copias, setCopias] = useState<LibroEnBiblioteca[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [prestarOpen, setPrestarOpen] = useState(false);
  const [copiaAPrestar, setCopiaAPrestar] = useState("");
  const [nombrePrestamo, setNombrePrestamo] = useState("");
  const [socioIdPrestamo, setSocioIdPrestamo] = useState("");
  const [fechaPrestamo, setFechaPrestamo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [guardandoPrestamo, setGuardandoPrestamo] = useState(false);

  useEffect(() => {
    if (!bibliotecaActual) {
      setCopias([]);
      return;
    }
    return listenInventario(bibliotecaActual.id, setCopias);
  }, [bibliotecaActual]);

  useEffect(() => {
    if (!bibliotecaActual?.modoSocios) {
      setSocios([]);
      return;
    }
    return listenSocios(bibliotecaActual.id, setSocios);
  }, [bibliotecaActual]);

  const prestados = useMemo(
    () => copias.filter((c) => c.estado === "prestado"),
    [copias]
  );
  const disponibles = useMemo(
    () => copias.filter((c) => c.estado === "disponible"),
    [copias]
  );
  const isbns = useMemo(() => copias.map((c) => c.isbn), [copias]);
  const globales = useLibrosGlobales(isbns);

  async function handleDevolver(copia: LibroEnBiblioteca) {
    try {
      await devolverLibro(copia.id, copia.historialActivoId);
      toast.success(t("prestamos.devueltoOk"));
    } catch (err) {
      logError("Error marcando devolución:", err);
      toast.error(t("prestamos.errorActualizarPrestamo"));
    }
  }

  function abrirPrestar() {
    setCopiaAPrestar("");
    setNombrePrestamo("");
    setSocioIdPrestamo("");
    setFechaPrestamo(new Date().toISOString().slice(0, 10));
    setPrestarOpen(true);
  }

  async function handlePrestar() {
    const copia = copias.find((c) => c.id === copiaAPrestar);
    if (!copia) {
      toast.error(t("prestamos.errorElegirLibro"));
      return;
    }
    const modoSocios = Boolean(bibliotecaActual?.modoSocios);
    const nombreDestino = modoSocios
      ? socios.find((s) => s.id === socioIdPrestamo)?.nombre ?? ""
      : nombrePrestamo.trim();
    if (modoSocios && !socioIdPrestamo) {
      toast.error(t("prestamos.errorElegirSocio"));
      return;
    }
    if (!modoSocios && !nombreDestino) {
      toast.error(t("prestamos.errorIngresarNombre"));
      return;
    }
    setGuardandoPrestamo(true);
    try {
      await prestarLibro(
        copia,
        nombreDestino,
        fechaPrestamo,
        modoSocios ? socioIdPrestamo : undefined
      );
      toast.success(t("prestamos.prestamoRegistrado"));
      setPrestarOpen(false);
    } catch (err) {
      logError("Error registrando el préstamo:", err);
      toast.error(t("prestamos.errorRegistrarPrestamo"));
    } finally {
      setGuardandoPrestamo(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("prestamos.titulo")}</h1>
        <Button
          className="hidden md:inline-flex"
          onClick={abrirPrestar}
          disabled={disponibles.length === 0}
        >
          <Handshake />
          {t("prestamos.prestarLibro")}
        </Button>
      </div>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        {t("prestamos.subtitulo", { cantidad: prestados.length })}
      </p>

      {/* Mobile: FAB flotante para prestar, igual que en Catálogo */}
      <button
        onClick={abrirPrestar}
        disabled={disponibles.length === 0}
        className="fixed right-4 bottom-20 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg disabled:opacity-40 md:hidden"
        aria-label={t("prestamos.prestarLibro")}
      >
        <Handshake className="size-6" />
      </button>

      {prestados.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {t("prestamos.sinPrestamos")}
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
        {prestados.map((copia) => {
          const global = globales[copia.isbn];
          const inicial = (global?.titulo ?? "?").trim().charAt(0).toUpperCase();
          return (
            <div key={copia.id} className="flex flex-col gap-2">
              {global?.portadaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={global.portadaUrl}
                  alt={global.titulo}
                  className="aspect-[3/4.2] w-full rounded-lg border object-cover"
                />
              ) : (
                <div className="flex aspect-[3/4.2] items-center justify-center rounded-lg border bg-muted">
                  <span className="text-[26px] font-bold text-muted-foreground/60">
                    {inicial}
                  </span>
                </div>
              )}
              <div className="text-[13px] font-semibold leading-tight">
                {global?.titulo}
              </div>
              <div className="line-clamp-2 text-xs text-muted-foreground" title={global?.autor}>
                {global?.autor}
              </div>
              <Badge variant="outline" className="w-fit text-[11px]">
                {t("prestamos.prestadoA", { nombre: copia.prestadoA ?? "" })}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDevolver(copia)}
              >
                {t("prestamos.marcarDevuelto")}
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={prestarOpen} onOpenChange={setPrestarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("prestamos.prestarLibro")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                {t("prestamos.libro")}
              </Label>
              {disponibles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("prestamos.sinDisponibles")}
                </p>
              ) : (
                <Select value={copiaAPrestar} onValueChange={setCopiaAPrestar}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("prestamos.elegirLibro")} />
                  </SelectTrigger>
                  <SelectContent>
                    {disponibles.map((c) => {
                      const g = globales[c.isbn];
                      return (
                        <SelectItem key={c.id} value={c.id}>
                          {g?.titulo ?? t("prestamos.sinTitulo")}
                          {g?.autor ? ` — ${g.autor}` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                {t("prestamos.aQuienSePresta")}
              </Label>
              {bibliotecaActual?.modoSocios ? (
                <Select value={socioIdPrestamo} onValueChange={setSocioIdPrestamo}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("prestamos.elegirSocio")} />
                  </SelectTrigger>
                  <SelectContent>
                    {socios.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        {t("prestamos.sinSocios")}
                      </div>
                    ) : (
                      socios.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={nombrePrestamo}
                  onChange={(e) => setNombrePrestamo(e.target.value)}
                  placeholder={t("prestamos.nombrePlaceholder")}
                />
              )}
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                {t("prestamos.fechaSalida")}
              </Label>
              <Input
                type="date"
                value={fechaPrestamo}
                onChange={(e) => setFechaPrestamo(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setPrestarOpen(false)}>
                {t("common.cancelar")}
              </Button>
              <Button
                className="flex-1"
                onClick={handlePrestar}
                disabled={guardandoPrestamo || disponibles.length === 0}
              >
                {t("prestamos.confirmarPrestamo")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
