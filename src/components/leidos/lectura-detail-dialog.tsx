"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { logError } from "@/lib/log";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { useSugerenciasComunidad } from "@/hooks/use-sugerencias-comunidad";
import {
  actualizarLibroGlobal,
  listenResenas,
  publicarResena,
  type DatosComunidad,
} from "@/lib/firestore/libros";
import { quitarLectura } from "@/lib/firestore/lecturas";
import { IdiomaSelect } from "@/components/catalogo/idioma-select";
import { GeneroSelect } from "@/components/catalogo/genero-select";
import { BuscarMasInformacion } from "@/components/catalogo/buscar-mas-informacion";
import { RatingCara, RatingCaraPicker } from "@/components/catalogo/rating-cara";
import type { LibroGlobal, Resena } from "@/types";

const CAMPOS_EDITABLES = {
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
};

interface LecturaDetailDialogProps {
  isbn: string | null;
  global?: LibroGlobal;
  onClose: () => void;
}

export function LecturaDetailDialog({
  isbn,
  global,
  onClose,
}: LecturaDetailDialogProps) {
  const { user } = useAuth();
  const { localeLectura, t } = useLocale();
  const { autores: sugerenciasAutor, editoriales: sugerenciasEditorial } =
    useSugerenciasComunidad();
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState("");
  const [editando, setEditando] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [formEdit, setFormEdit] = useState(CAMPOS_EDITABLES);

  useEffect(() => {
    if (!isbn) return;
    setReviewOpen(false);
    setEditando(false);
    return listenResenas(isbn, setResenas);
  }, [isbn]);

  if (!isbn) return null;

  function setCampoEdit<K extends keyof typeof CAMPOS_EDITABLES>(
    campo: K,
    valor: string
  ) {
    setFormEdit((f) => ({ ...f, [campo]: valor }));
  }

  function handleEmpezarEdicion() {
    setFormEdit({
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
    });
    setEditando(true);
  }

  function handleDatosEncontrados(datos: DatosComunidad) {
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
  }

  async function handleGuardarEdicion() {
    if (!isbn) return;
    if (!formEdit.titulo.trim()) {
      toast.error(t("lecturaDetail.errorTituloObligatorio"));
      return;
    }
    setGuardandoEdicion(true);
    try {
      await actualizarLibroGlobal(isbn, {
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
      });
      toast.success(t("lecturaDetail.datosActualizados"));
      setEditando(false);
    } catch (err) {
      logError("Error editando el libro:", err);
      toast.error(t("lecturaDetail.errorGuardandoCambios"));
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function handlePublicarResena() {
    if (!isbn || !user) return;
    if (!comentario.trim()) {
      toast.error(t("lecturaDetail.errorEscribirComentario"));
      return;
    }
    try {
      await publicarResena(
        isbn,
        user.uid,
        user.displayName ?? user.email ?? t("lecturaDetail.anonimo"),
        estrellas,
        comentario.trim()
      );
      setComentario("");
      setReviewOpen(false);
    } catch (err) {
      logError("Error publicando la reseña:", err);
      toast.error(t("lecturaDetail.errorPublicandoResena"));
    }
  }

  async function handleQuitar() {
    if (!isbn || !user) return;
    const titulo = global?.titulo ?? t("lecturaDetail.esteLibro");
    if (!window.confirm(t("lecturaDetail.confirmarQuitar", { titulo }))) {
      return;
    }
    try {
      await quitarLectura(user.uid, isbn);
      onClose();
    } catch (err) {
      logError("Error quitando de leídos:", err);
      toast.error(t("lecturaDetail.errorQuitando"));
    }
  }

  const inicial = (global?.titulo ?? "?").trim().charAt(0).toUpperCase();

  return (
    <>
    <Dialog open={Boolean(isbn)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{global?.titulo}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          {editando ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("lecturaDetail.editarDatos")}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditando(false)}
                  disabled={guardandoEdicion}
                >
                  {t("lecturaDetail.cancelar")}
                </Button>
              </div>
              <BuscarMasInformacion
                isbn={isbn}
                idiomasLectura={localeLectura}
                onEncontrado={handleDatosEncontrados}
              />
              <FieldEdit label={t("lecturaDetail.campoTitulo")}>
                <Input
                  value={formEdit.titulo}
                  onChange={(e) => setCampoEdit("titulo", e.target.value)}
                />
              </FieldEdit>
              <FieldEdit label={t("lecturaDetail.campoSubtitulo")}>
                <Input
                  value={formEdit.subtitulo}
                  onChange={(e) => setCampoEdit("subtitulo", e.target.value)}
                />
              </FieldEdit>
              <FieldEdit label={t("lecturaDetail.campoAutor")}>
                <Input
                  value={formEdit.autor}
                  onChange={(e) => setCampoEdit("autor", e.target.value)}
                  list="sugerencias-autor"
                />
              </FieldEdit>
              <FieldEdit label={t("lecturaDetail.campoIlustrador")}>
                <Input
                  value={formEdit.ilustrador}
                  onChange={(e) => setCampoEdit("ilustrador", e.target.value)}
                />
              </FieldEdit>
              <div className="flex gap-2">
                <FieldEdit label={t("lecturaDetail.campoEditorial")} className="flex-[2]">
                  <Input
                    value={formEdit.editorial}
                    onChange={(e) => setCampoEdit("editorial", e.target.value)}
                    list="sugerencias-editorial"
                  />
                </FieldEdit>
                <FieldEdit label={t("lecturaDetail.campoAnio")} className="w-20">
                  <Input
                    value={formEdit.anio}
                    onChange={(e) => setCampoEdit("anio", e.target.value)}
                  />
                </FieldEdit>
                <FieldEdit label={t("lecturaDetail.campoPaginas")} className="w-20">
                  <Input
                    value={formEdit.paginas}
                    onChange={(e) => setCampoEdit("paginas", e.target.value)}
                  />
                </FieldEdit>
                <FieldEdit label={t("lecturaDetail.campoVolumen")} className="w-20">
                  <Input
                    placeholder={t("lecturaDetail.tomoPlaceholder")}
                    value={formEdit.volumen}
                    onChange={(e) => setCampoEdit("volumen", e.target.value)}
                  />
                </FieldEdit>
              </div>
              <div className="flex gap-2">
                <FieldEdit label={t("lecturaDetail.campoGenero")} className="flex-1">
                  <GeneroSelect
                    value={formEdit.genero}
                    onValueChange={(v) => setCampoEdit("genero", v)}
                  />
                </FieldEdit>
                <FieldEdit label={t("lecturaDetail.campoIdioma")} className="w-36">
                  <IdiomaSelect
                    value={formEdit.idioma}
                    onValueChange={(v) => setCampoEdit("idioma", v)}
                  />
                </FieldEdit>
              </div>
              <FieldEdit label={t("lecturaDetail.campoSinopsis")}>
                <Textarea
                  rows={3}
                  value={formEdit.sinopsis}
                  onChange={(e) => setCampoEdit("sinopsis", e.target.value)}
                />
              </FieldEdit>
              <Button onClick={handleGuardarEdicion} disabled={guardandoEdicion}>
                {t("lecturaDetail.guardarCambios")}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {global?.portadaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={global.portadaUrl}
                    alt={global.titulo}
                    className="h-[130px] w-[88px] rounded-md border object-cover"
                  />
                ) : (
                  <div className="flex h-[130px] w-[88px] items-center justify-center rounded-md border bg-muted">
                    <span className="text-2xl font-bold text-muted-foreground/60">
                      {inicial}
                    </span>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground">{global?.autor}</div>
                  {global?.ilustrador && (
                    <div className="text-xs text-muted-foreground">
                      {t("lecturaDetail.ilustradoPor", { ilustrador: global.ilustrador })}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("lecturaDetail.ratingInfo", {
                      rating: global?.ratingPromedio ?? 0,
                      resenas: global?.totalResenas ?? 0,
                      propietarios: global?.propietarios ?? 0,
                    })}
                  </div>
                  <button
                    onClick={handleEmpezarEdicion}
                    className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary underline"
                  >
                    <Pencil className="size-3" />
                    {t("lecturaDetail.editarDatos")}
                  </button>
                </div>
              </div>

              {global?.sinopsis && <p className="leading-relaxed">{global.sinopsis}</p>}
            </>
          )}

          <div className="border-t pt-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold">{t("lecturaDetail.resenasComunidad")}</div>
              <button
                onClick={() => setReviewOpen((o) => !o)}
                className="text-xs font-semibold text-primary underline"
              >
                {reviewOpen ? t("lecturaDetail.cancelar") : t("lecturaDetail.escribirResena")}
              </button>
            </div>

            {reviewOpen && (
              <div className="mb-3 flex flex-col gap-2 rounded-lg border p-3">
                <RatingCaraPicker value={estrellas} onChange={setEstrellas} />
                <Textarea
                  placeholder={t("lecturaDetail.placeholderResena")}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                />
                <Button size="sm" className="self-end" onClick={handlePublicarResena}>
                  {t("lecturaDetail.publicarResena")}
                </Button>
              </div>
            )}

            {resenas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("lecturaDetail.sinResenas")}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {resenas.map((r) => (
                <div key={r.id} className="rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {r.usuarioNombre}
                    <RatingCara estrellas={r.estrellas} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{r.comentario}</div>
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline" onClick={handleQuitar} className="text-destructive">
            <Trash2 className="size-4" />
            {t("lecturaDetail.quitarDeLeidos")}
          </Button>
        </div>
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
    </>
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
