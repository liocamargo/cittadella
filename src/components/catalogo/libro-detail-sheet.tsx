"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Check, Heart, Pencil, Trash2 } from "lucide-react";
import { logError } from "@/lib/log";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLocale } from "@/hooks/use-locale";
import { useSugerenciasComunidad } from "@/hooks/use-sugerencias-comunidad";
import {
  actualizarCopia,
  actualizarLibroGlobal,
  actualizarPortada,
  cambiarIsbnCopia,
  devolverLibro,
  eliminarCopia,
  listenResenas,
  prestarLibro,
  publicarResena,
  toggleFavorito,
  toggleLeido,
  type DatosComunidad,
} from "@/lib/firestore/libros";
import { listenSocios } from "@/lib/firestore/socios";
import { PortadaPicker } from "@/components/catalogo/portada-picker";
import { RatingCara, RatingCaraPicker } from "@/components/catalogo/rating-cara";
import { IdiomaSelect, getIdiomaInfo } from "@/components/catalogo/idioma-select";
import { GeneroSelect } from "@/components/catalogo/genero-select";
import { BuscarMasInformacion } from "@/components/catalogo/buscar-mas-informacion";
import type { LibroEnBiblioteca, LibroGlobal, Resena, Socio } from "@/types";

/** Deja solo los caracteres válidos de un ISBN y lo corta a 13 (ISBN-13). */
function sanitizarIsbn(valor: string): string {
  return valor.replace(/[^0-9Xx]/g, "").slice(0, 13);
}

const CAMPOS_EDITABLES = {
  isbn: "",
  titulo: "",
  subtitulo: "",
  autor: "",
  ilustrador: "",
  editorial: "",
  anio: "",
  paginas: "",
  volumen: "",
  idioma: "",
  genero: "",
  sinopsis: "",
  estante: "",
  tipoTapa: "",
  notas: "",
};

interface LibroDetailSheetProps {
  copia: LibroEnBiblioteca | null;
  global?: LibroGlobal;
  onClose: () => void;
}

export function LibroDetailSheet({
  copia,
  global,
  onClose,
}: LibroDetailSheetProps) {
  const { user } = useAuth();
  const { bibliotecaActual } = useBiblioteca();
  const { localeLectura, t } = useLocale();
  const { autores: sugerenciasAutor, editoriales: sugerenciasEditorial } =
    useSugerenciasComunidad();
  const [prestando, setPrestando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [formEdit, setFormEdit] = useState(CAMPOS_EDITABLES);
  const [loanName, setLoanName] = useState("");
  const [loanSocioId, setLoanSocioId] = useState("");
  const [loanDate, setLoanDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [socios, setSocios] = useState<Socio[]>([]);
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState("");
  const [portadaPickerOpen, setPortadaPickerOpen] = useState(false);

  useEffect(() => {
    if (!copia) return;
    setPrestando(false);
    setReviewOpen(false);
    setEditando(false);
    return listenResenas(copia.isbn, setResenas);
  }, [copia]);

  useEffect(() => {
    if (!bibliotecaActual?.modoSocios) {
      setSocios([]);
      return;
    }
    return listenSocios(bibliotecaActual.id, setSocios);
  }, [bibliotecaActual]);

  if (!copia) return null;

  function setCampoEdit<K extends keyof typeof CAMPOS_EDITABLES>(
    campo: K,
    valor: string
  ) {
    setFormEdit((f) => ({ ...f, [campo]: valor }));
  }

  function handleEmpezarEdicion() {
    if (!copia) return;
    setFormEdit({
      isbn: copia.isbn ?? "",
      titulo: global?.titulo ?? "",
      subtitulo: global?.subtitulo ?? "",
      autor: global?.autor ?? "",
      ilustrador: global?.ilustrador ?? "",
      editorial: global?.editorial ?? "",
      anio: global?.anio ?? "",
      paginas: global?.paginas ?? "",
      volumen: global?.volumen ?? "",
      idioma: global?.idioma ?? "",
      genero: global?.genero ?? "",
      sinopsis: global?.sinopsis ?? "",
      estante: copia.estante ?? "",
      tipoTapa: copia.tipoTapa ?? "",
      notas: copia.notas ?? "",
    });
    setEditando(true);
  }

  async function handleGuardarEdicion() {
    if (!copia) return;
    if (!formEdit.titulo.trim()) {
      toast.error(t("libroDetail.errorTituloObligatorio"));
      return;
    }
    setGuardandoEdicion(true);
    try {
      const nuevoIsbn = sanitizarIsbn(formEdit.isbn) || copia.isbn;
      const datosComunidad = {
        titulo: formEdit.titulo.trim(),
        subtitulo: formEdit.subtitulo.trim() || undefined,
        autor: formEdit.autor.trim(),
        ilustrador: formEdit.ilustrador.trim() || undefined,
        editorial: formEdit.editorial.trim() || undefined,
        anio: formEdit.anio.trim() || undefined,
        paginas: formEdit.paginas.trim() || undefined,
        volumen: formEdit.volumen.trim() || undefined,
        idioma: formEdit.idioma.trim() || undefined,
        genero: formEdit.genero.trim() || undefined,
        sinopsis: formEdit.sinopsis.trim() || undefined,
      };
      if (nuevoIsbn !== copia.isbn) {
        await cambiarIsbnCopia(copia.id, nuevoIsbn, datosComunidad);
      }
      await actualizarLibroGlobal(nuevoIsbn, datosComunidad);
      await actualizarCopia(copia.id, {
        estante: formEdit.estante.trim(),
        tipoTapa: formEdit.tipoTapa.trim() || undefined,
        notas: formEdit.notas.trim() || undefined,
      });
      toast.success(t("libroDetail.datosActualizados"));
      setEditando(false);
    } catch (err) {
      logError("Error editando el libro:", err);
      toast.error(t("libroDetail.errorGuardandoCambios"));
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function handlePrestar() {
    if (!copia) return;
    const modoSocios = Boolean(bibliotecaActual?.modoSocios);
    const nombreDestino = modoSocios
      ? socios.find((s) => s.id === loanSocioId)?.nombre ?? ""
      : loanName.trim();
    if (modoSocios && !loanSocioId) {
      toast.error(t("libroDetail.errorElegirSocio"));
      return;
    }
    if (!modoSocios && !nombreDestino) {
      toast.error(t("libroDetail.errorIngresarNombre"));
      return;
    }
    try {
      await prestarLibro(
        copia,
        nombreDestino,
        loanDate,
        modoSocios ? loanSocioId : undefined
      );
      setLoanName("");
      setLoanSocioId("");
      setPrestando(false);
    } catch (err) {
      logError("Error registrando el préstamo:", err);
      toast.error(t("libroDetail.errorRegistrandoPrestamo"));
    }
  }

  async function handleDevolver() {
    if (!copia) return;
    try {
      await devolverLibro(copia.id, copia.historialActivoId);
    } catch (err) {
      logError("Error registrando la devolución:", err);
      toast.error(t("libroDetail.errorRegistrandoDevolucion"));
    }
  }

  function handleToggleLeido() {
    if (!copia) return;
    toggleLeido(copia.id, !copia.leido).catch((err) => {
      logError("Error actualizando leído:", err);
      toast.error(t("libroDetail.errorActualizandoLeido"));
    });
  }

  async function handleEliminar() {
    if (!copia) return;
    const titulo = global?.titulo ?? t("libroDetail.esteLibro");
    if (!window.confirm(t("libroDetail.confirmarEliminar", { titulo }))) {
      return;
    }
    try {
      await eliminarCopia(copia.id);
      onClose();
    } catch (err) {
      logError("Error eliminando el libro:", err);
      toast.error(t("libroDetail.errorEliminandoLibro"));
    }
  }

  async function handlePublicarResena() {
    if (!copia || !user) return;
    if (!comentario.trim()) {
      toast.error(t("libroDetail.errorEscribirComentario"));
      return;
    }
    try {
      await publicarResena(
        copia.isbn,
        user.uid,
        user.displayName ?? user.email ?? t("libroDetail.anonimo"),
        estrellas,
        comentario.trim()
      );
      setComentario("");
      setReviewOpen(false);
    } catch (err) {
      logError("Error publicando la reseña:", err);
      toast.error(t("libroDetail.errorPublicandoResena"));
    }
  }

  function handleDatosEncontrados(datos: DatosComunidad) {
    if (!copia) return;
    setFormEdit((f) => ({
      ...f,
      titulo: datos.titulo || f.titulo,
      subtitulo: datos.subtitulo ?? f.subtitulo,
      autor: datos.autor || f.autor,
      editorial: datos.editorial ?? f.editorial,
      anio: datos.anio ?? f.anio,
      paginas: datos.paginas ?? f.paginas,
      volumen: datos.volumen ?? f.volumen,
      idioma: datos.idioma ?? f.idioma,
      genero: datos.genero ?? f.genero,
      sinopsis: datos.sinopsis ?? f.sinopsis,
    }));
    if (datos.portadaUrl && !global?.portadaUrl) {
      handleActualizarPortada(datos.portadaUrl);
    }
    if (datos.previewLink && !global?.previewLink) {
      actualizarLibroGlobal(copia.isbn, { previewLink: datos.previewLink }).catch((err) => {
        logError("Error actualizando el link de vista previa:", err);
      });
    }
  }

  async function handleActualizarPortada(url: string) {
    if (!copia) return;
    try {
      await actualizarPortada(copia.isbn, url);
    } catch (err) {
      logError("Error actualizando la portada:", err);
      toast.error(t("libroDetail.errorActualizandoPortada"));
    }
  }

  const inicial = (global?.titulo ?? "?").trim().charAt(0).toUpperCase();
  const idiomaInfo = getIdiomaInfo(global?.idioma);
  const linkLectura =
    global?.previewLink ??
    (global?.titulo
      ? `https://www.google.com/search?q=${encodeURIComponent(`${global.titulo} ${global.autor ?? ""} libro`)}`
      : undefined);

  return (
    <Sheet open={Boolean(copia)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-[420px]">
        <SheetHeader className="sr-only">
          <SheetTitle>{global?.titulo}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6 pt-1">
          <div className="flex items-center gap-3">
            {global?.portadaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={global.portadaUrl}
                alt={global?.titulo ?? ""}
                className="h-[170px] w-[120px] rounded-lg border object-cover"
              />
            ) : (
              <div className="flex h-[170px] w-[120px] items-center justify-center rounded-lg border bg-muted">
                <span className="text-3xl font-bold text-muted-foreground/60">
                  {inicial}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPortadaPickerOpen(true)}
            >
              {global?.portadaUrl
              ? t("libroDetail.cambiarPortada")
              : t("libroDetail.agregarPortada")}
            </Button>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold">{global?.titulo}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {global?.autor}
              </div>
            </div>
            <button
              onClick={() =>
                toggleFavorito(copia.id, !copia.favorito).catch((err) => {
                  logError("Error actualizando favorito:", err);
                  toast.error(t("libroDetail.errorActualizandoFavorito"));
                })
              }
              className={cn(
                "flex size-8 items-center justify-center rounded-md border text-muted-foreground",
                copia.favorito && "text-rose-500"
              )}
            >
              <Heart
                className="size-4"
                fill={copia.favorito ? "currentColor" : "none"}
              />
            </button>
          </div>

          <Badge
            variant={copia.estado === "disponible" ? "secondary" : "outline"}
            className="w-fit"
          >
            {copia.estado === "disponible"
              ? t("libroDetail.disponible")
              : t("libroDetail.prestadoA", { nombre: copia.prestadoA ?? "" })}
          </Badge>

          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("libroDetail.datosDelLibro")}
              </div>
              <button
                onClick={handleEmpezarEdicion}
                className="flex items-center gap-1 text-xs font-semibold text-primary underline"
              >
                <Pencil className="size-3" />
                {t("libroDetail.editar")}
              </button>
            </div>
            <div>
              <strong>{t("libroDetail.isbn")}</strong> {copia.isbn || "—"}
            </div>
            {global?.ilustrador && (
              <div>
                <strong>{t("libroDetail.ilustrador")}</strong> {global.ilustrador}
              </div>
            )}
            <div>
              <strong>{t("libroDetail.editorial")}</strong> {global?.editorial || "—"}
            </div>
            <div>
              <strong>{t("libroDetail.anio")}</strong> {global?.anio || "—"}
            </div>
            {global?.paginas && (
              <div>
                <strong>{t("libroDetail.paginas")}</strong> {global.paginas}
              </div>
            )}
            {global?.volumen && (
              <div>
                <strong>{t("libroDetail.volumen")}</strong> {global.volumen}
              </div>
            )}
            <div>
              <strong>{t("libroDetail.idioma")}</strong>{" "}
              {idiomaInfo ? `${idiomaInfo.bandera} ${t(idiomaInfo.key)}` : global?.idioma || "—"}
            </div>
            <div>
              <strong>{t("libroDetail.genero")}</strong> {global?.genero || "—"}
            </div>
          </div>

          {global?.subtitulo && (
            <p className="text-sm italic text-muted-foreground">
              {global.subtitulo}
            </p>
          )}
          {global?.sinopsis && (
            <p className="text-sm leading-relaxed">{global.sinopsis}</p>
          )}

          {linkLectura && (
            <Button asChild variant="outline" className="w-full">
              <a href={linkLectura} target="_blank" rel="noopener noreferrer">
                <BookOpen className="size-4" />
                {global?.previewLink
                  ? t("libroDetail.leerOnline")
                  : t("libroDetail.buscarlo")}
              </a>
            </Button>
          )}

          <div className="flex gap-4 border-y py-3">
            <div>
              <div className="text-base font-bold">
                ★ {global?.ratingPromedio ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {t("libroDetail.totalResenas", { cantidad: global?.totalResenas ?? 0 })}
              </div>
            </div>
            <div>
              <div className="text-base font-bold">{global?.propietarios ?? 0}</div>
              <div className="text-[11px] text-muted-foreground">
                {t("libroDetail.propietarios")}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t pt-4 text-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("libroDetail.tuCopia")}
            </div>
            <div>
              <strong>{t("libroDetail.estante")}</strong> {copia.estante || "—"}
            </div>
            {copia.tipoTapa && (
              <div>
                <strong>{t("libroDetail.tapa")}</strong> {copia.tipoTapa}
              </div>
            )}
            <div>
              <strong>{t("libroDetail.agregado")}</strong> {copia.fechaAgregado?.slice(0, 10)}
            </div>
            {copia.notas && (
              <div>
                <strong>{t("libroDetail.notasPrivadas")}</strong> {copia.notas}
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="text-sm font-semibold">{t("libroDetail.resenasComunidad")}</div>
              <button
                onClick={() => setReviewOpen((o) => !o)}
                className="text-xs font-semibold text-primary underline"
              >
                {reviewOpen ? t("common.cancelar") : t("libroDetail.escribirResena")}
              </button>
            </div>

            {reviewOpen && (
              <div className="mb-3 flex flex-col gap-2 rounded-lg border p-3">
                <RatingCaraPicker value={estrellas} onChange={setEstrellas} />
                <Textarea
                  placeholder={t("libroDetail.placeholderResena")}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                />
                <Button size="sm" className="self-end" onClick={handlePublicarResena}>
                  {t("libroDetail.publicarResena")}
                </Button>
              </div>
            )}

            {resenas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("libroDetail.sinResenas")}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {resenas.map((r) => (
                <div key={r.id} className="rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {r.usuarioNombre}
                    <RatingCara estrellas={r.estrellas} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {r.comentario}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t">
          {prestando ? (
            <div className="flex flex-col gap-3">
              <Label>{t("libroDetail.aQuienSeLoPrestas")}</Label>
              {bibliotecaActual?.modoSocios ? (
                <Select value={loanSocioId} onValueChange={setLoanSocioId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("libroDetail.placeholderElegirSocio")} />
                  </SelectTrigger>
                  <SelectContent>
                    {socios.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        {t("libroDetail.sinSocios")}
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
                  value={loanName}
                  onChange={(e) => setLoanName(e.target.value)}
                  placeholder={t("libroDetail.placeholderNombre")}
                />
              )}
              <Label>{t("libroDetail.fechaDeSalida")}</Label>
              <Input
                type="date"
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
              />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handlePrestar}>
                  {t("libroDetail.confirmarPrestamo")}
                </Button>
                <Button variant="outline" onClick={() => setPrestando(false)}>
                  {t("common.cancelar")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {copia.estado === "disponible" ? (
                <Button className="flex-1" onClick={() => setPrestando(true)}>
                  {t("libroDetail.prestar")}
                </Button>
              ) : (
                <Button className="flex-1" onClick={handleDevolver}>
                  {t("libroDetail.devolver")}
                </Button>
              )}
              <Button
                variant="outline"
                className={cn(
                  "hidden md:inline-flex",
                  copia.leido &&
                    "border-green-600 bg-green-600 text-white hover:bg-green-700 hover:text-white"
                )}
                onClick={handleToggleLeido}
              >
                {copia.leido && <Check className="size-4" />}
                {copia.leido ? t("libroDetail.leido") : t("libroDetail.marcarLeido")}
              </Button>
              <Button variant="outline" size="icon" onClick={handleEliminar}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          )}
        </SheetFooter>

        {!prestando && (
          <button
            onClick={handleToggleLeido}
            aria-label={copia.leido ? t("libroDetail.leido") : t("libroDetail.marcarLeido")}
            className={cn(
              "fixed bottom-6 right-4 z-50 flex size-14 items-center justify-center rounded-full text-white shadow-lg md:hidden",
              copia.leido ? "bg-green-600" : "bg-primary"
            )}
          >
            <Check className="size-6" />
          </button>
        )}
      </SheetContent>

      <PortadaPicker
        open={portadaPickerOpen}
        onOpenChange={setPortadaPickerOpen}
        consultaInicial={global?.titulo ?? ""}
        onSeleccionar={handleActualizarPortada}
      />

      <Dialog
        open={editando}
        onOpenChange={(open) => !open && !guardandoEdicion && setEditando(false)}
      >
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("libroDetail.editarDatos")}</DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto text-sm">
            <BuscarMasInformacion
              isbn={copia.isbn}
              idiomasLectura={localeLectura}
              onEncontrado={handleDatosEncontrados}
            />

            <FieldEdit label={t("libroDetail.campoIsbn")}>
              <Input
                inputMode="numeric"
                maxLength={13}
                value={formEdit.isbn}
                onChange={(e) => setCampoEdit("isbn", sanitizarIsbn(e.target.value))}
              />
            </FieldEdit>
            <FieldEdit label={t("libroDetail.campoTitulo")}>
              <Input
                value={formEdit.titulo}
                onChange={(e) => setCampoEdit("titulo", e.target.value)}
              />
            </FieldEdit>
            <FieldEdit label={t("libroDetail.campoSubtitulo")}>
              <Input
                value={formEdit.subtitulo}
                onChange={(e) => setCampoEdit("subtitulo", e.target.value)}
              />
            </FieldEdit>
            <FieldEdit label={t("libroDetail.campoAutor")}>
              <Input
                value={formEdit.autor}
                onChange={(e) => setCampoEdit("autor", e.target.value)}
                list="sugerencias-autor"
              />
            </FieldEdit>
            <FieldEdit label={t("libroDetail.campoIlustrador")}>
              <Input
                value={formEdit.ilustrador}
                onChange={(e) => setCampoEdit("ilustrador", e.target.value)}
              />
            </FieldEdit>
            <FieldEdit label={t("libroDetail.campoEditorial")}>
              <Input
                value={formEdit.editorial}
                onChange={(e) => setCampoEdit("editorial", e.target.value)}
                list="sugerencias-editorial"
              />
            </FieldEdit>
            <div className="flex gap-3">
              <FieldEdit label={t("libroDetail.campoAnio")} className="flex-1">
                <Input
                  value={formEdit.anio}
                  onChange={(e) => setCampoEdit("anio", e.target.value)}
                />
              </FieldEdit>
              <FieldEdit label={t("libroDetail.campoPaginas")} className="flex-1">
                <Input
                  value={formEdit.paginas}
                  onChange={(e) => setCampoEdit("paginas", e.target.value)}
                />
              </FieldEdit>
              <FieldEdit label={t("libroDetail.campoVolumen")} className="flex-1">
                <Input
                  placeholder={t("libroDetail.placeholderVolumen")}
                  value={formEdit.volumen}
                  onChange={(e) => setCampoEdit("volumen", e.target.value)}
                />
              </FieldEdit>
            </div>
            <div className="flex gap-3">
              <FieldEdit label={t("libroDetail.campoGenero")} className="flex-1">
                <GeneroSelect
                  value={formEdit.genero}
                  onValueChange={(v) => setCampoEdit("genero", v)}
                />
              </FieldEdit>
              <FieldEdit label={t("libroDetail.campoIdioma")} className="w-40">
                <IdiomaSelect
                  value={formEdit.idioma}
                  onValueChange={(v) => setCampoEdit("idioma", v)}
                />
              </FieldEdit>
            </div>
            <FieldEdit label={t("libroDetail.campoSinopsis")}>
              <Textarea
                rows={3}
                value={formEdit.sinopsis}
                onChange={(e) => setCampoEdit("sinopsis", e.target.value)}
              />
            </FieldEdit>

            <div className="mt-1 border-t pt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("libroDetail.tuCopia")}
            </div>
            <div className="flex gap-3">
              <FieldEdit label={t("libroDetail.campoEstante")} className="flex-1">
                {bibliotecaActual && bibliotecaActual.estantes.length > 0 ? (
                  <Select
                    value={formEdit.estante}
                    onValueChange={(v) => setCampoEdit("estante", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("libroDetail.placeholderEstante")} />
                    </SelectTrigger>
                    <SelectContent>
                      {bibliotecaActual.estantes.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formEdit.estante}
                    onChange={(e) => setCampoEdit("estante", e.target.value)}
                  />
                )}
              </FieldEdit>
              <FieldEdit label={t("libroDetail.campoTipoTapa")} className="flex-1">
                <Input
                  value={formEdit.tipoTapa}
                  onChange={(e) => setCampoEdit("tipoTapa", e.target.value)}
                />
              </FieldEdit>
            </div>
            <FieldEdit label={t("libroDetail.campoNotasPrivadas")}>
              <Input
                value={formEdit.notas}
                onChange={(e) => setCampoEdit("notas", e.target.value)}
              />
            </FieldEdit>
          </div>

          <DialogFooter className="grid grid-cols-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setEditando(false)}
              disabled={guardandoEdicion}
            >
              {t("common.cancelar")}
            </Button>
            <Button
              className="w-full"
              onClick={handleGuardarEdicion}
              disabled={guardandoEdicion}
            >
              {t("libroDetail.guardarCambios")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <datalist id="sugerencias-autor">
        {sugerenciasAutor.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <datalist id="sugerencias-editorial">
        {sugerenciasEditorial.map((e) => (
          <option key={e} value={e} />
        ))}
      </datalist>
    </Sheet>
  );
}

function FieldEdit({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
