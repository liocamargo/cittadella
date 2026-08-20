"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, PenLine, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { useSugerenciasComunidad } from "@/hooks/use-sugerencias-comunidad";
import { logError } from "@/lib/log";
import {
  agregarLibroLeido,
  getLibroGlobal,
  publicarResena,
} from "@/lib/firestore/libros";
import {
  buscarPorIsbn,
  mensajeErrorBusqueda,
  type ResultadoBusquedaTitulo,
} from "@/services/google-books";
import { BarcodeScanner } from "@/components/catalogo/barcode-scanner";
import { PortadaPicker } from "@/components/catalogo/portada-picker";
import { RatingCaraPicker } from "@/components/catalogo/rating-cara";
import { GeneroSelect } from "@/components/catalogo/genero-select";
import { BuscarPorTitulo } from "@/components/catalogo/buscar-por-titulo";
import type { LibroGlobal } from "@/types";

type Paso = "buscar" | "formulario";

/** Deja solo los caracteres válidos de un ISBN y lo corta a 13 (ISBN-13). */
function sanitizarIsbn(valor: string): string {
  return valor.replace(/[^0-9Xx]/g, "").slice(0, 13);
}

const FORM_INICIAL = {
  titulo: "",
  subtitulo: "",
  autor: "",
  ilustrador: "",
  editorial: "",
  anio: "",
  paginas: "",
  volumen: "",
  genero: "",
  idioma: "",
  sinopsis: "",
  portadaUrl: "",
};

export default function AgregarLeidoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { localeLectura, t } = useLocale();
  const { autores: sugerenciasAutor, editoriales: sugerenciasEditorial } =
    useSugerenciasComunidad();
  const [paso, setPaso] = useState<Paso>("buscar");
  const [isbnInput, setIsbnInput] = useState("");
  const [isbn, setIsbn] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [comunidad, setComunidad] = useState<LibroGlobal | null>(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [escaneando, setEscaneando] = useState(false);
  const [portadaPickerOpen, setPortadaPickerOpen] = useState(false);
  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState("");

  function setCampo<K extends keyof typeof FORM_INICIAL>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function buscar(codigo: string) {
    if (!codigo) {
      toast.error(t("leidosAgregar.ingresarIsbn"));
      return;
    }
    setBuscando(true);
    try {
      const local = await getLibroGlobal(codigo);
      if (local) {
        setComunidad(local);
        setForm({
          titulo: local.titulo,
          subtitulo: local.subtitulo ?? "",
          autor: local.autor,
          ilustrador: local.ilustrador ?? "",
          editorial: local.editorial ?? "",
          anio: local.anio ?? "",
          paginas: local.paginas ?? "",
          volumen: local.volumen ?? "",
          genero: local.genero ?? "",
          idioma: local.idioma ?? "",
          sinopsis: local.sinopsis ?? "",
          portadaUrl: local.portadaUrl ?? "",
        });
      } else {
        try {
          const encontrado = await buscarPorIsbn(codigo, localeLectura);
          if (encontrado) {
            setForm({
              ...FORM_INICIAL,
              titulo: encontrado.titulo ?? "",
              subtitulo: encontrado.subtitulo ?? "",
              autor: encontrado.autor ?? "",
              editorial: encontrado.editorial ?? "",
              anio: encontrado.anio ?? "",
              paginas: encontrado.paginas ?? "",
              idioma: encontrado.idioma ?? "",
              genero: encontrado.genero ?? "",
              sinopsis: encontrado.sinopsis ?? "",
              portadaUrl: encontrado.portadaUrl ?? "",
            });
          } else {
            toast.error(t("leidosAgregar.isbnNoEncontrado"));
            setForm({ ...FORM_INICIAL });
          }
        } catch (err) {
          logError("Error consultando el ISBN:", err);
          toast.error(
            mensajeErrorBusqueda(err, t("leidosAgregar.errorConsultaIsbn"))
          );
          setForm({ ...FORM_INICIAL });
        }
      }
      setIsbn(codigo);
      setPaso("formulario");
    } catch (err) {
      logError("Error buscando ISBN:", err);
      toast.error(t("leidosAgregar.errorBuscarIsbn"));
    } finally {
      setBuscando(false);
    }
  }

  function handleBuscar() {
    buscar(isbnInput.trim());
  }

  function handleDetected(codigoCrudo: string) {
    // Algunos libros (colecciones/volúmenes) traen un add-on de 5 dígitos
    // pegado al EAN-13 (código de 18 dígitos); nos quedamos con los
    // primeros 13, que son el ISBN real.
    const codigo = sanitizarIsbn(codigoCrudo);
    setEscaneando(false);
    setIsbnInput(codigo);
    buscar(codigo);
  }

  function handleIsbnInputChange(valor: string) {
    setIsbnInput(sanitizarIsbn(valor));
  }

  // Auto-búsqueda: apenas el ISBN tipeado llega a un largo válido (10 o 13
  // dígitos) buscamos solo, sin esperar que aprieten "Buscar".
  const largoAnteriorRef = useRef(0);
  useEffect(() => {
    const largo = isbnInput.length;
    if (
      paso === "buscar" &&
      !buscando &&
      (largo === 10 || largo === 13) &&
      largo !== largoAnteriorRef.current
    ) {
      buscar(isbnInput);
    }
    largoAnteriorRef.current = largo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isbnInput]);

  function handleManual() {
    setIsbn("");
    setComunidad(null);
    setForm(FORM_INICIAL);
    setPaso("formulario");
  }

  function handleSeleccionarPorTitulo(resultado: ResultadoBusquedaTitulo) {
    if (resultado.isbn) {
      setIsbnInput(resultado.isbn);
      buscar(resultado.isbn);
      return;
    }
    setIsbn("");
    setComunidad(null);
    setForm({
      ...FORM_INICIAL,
      titulo: resultado.titulo ?? "",
      subtitulo: resultado.subtitulo ?? "",
      autor: resultado.autor ?? "",
      editorial: resultado.editorial ?? "",
      anio: resultado.anio ?? "",
      paginas: resultado.paginas ?? "",
      idioma: resultado.idioma ?? "",
      genero: resultado.genero ?? "",
      sinopsis: resultado.sinopsis ?? "",
      portadaUrl: resultado.portadaUrl ?? "",
    });
    setPaso("formulario");
  }

  async function handleGuardar() {
    if (!user) return;
    if (!(form.titulo ?? "").trim()) {
      toast.error(t("leidosAgregar.tituloObligatorio"));
      return;
    }

    // El ISBN es opcional: si no lo cargaron, generamos un identificador
    // propio para poder crear igual el libro comunitario y el registro.
    const isbnFinal = isbn || `manual-${crypto.randomUUID()}`;

    setGuardando(true);
    try {
      await agregarLibroLeido(isbnFinal, user.uid, {
        titulo: (form.titulo ?? "").trim(),
        subtitulo: (form.subtitulo ?? "").trim() || undefined,
        autor: (form.autor ?? "").trim(),
        ilustrador: (form.ilustrador ?? "").trim() || undefined,
        editorial: (form.editorial ?? "").trim() || undefined,
        anio: (form.anio ?? "").trim() || undefined,
        paginas: (form.paginas ?? "").trim() || undefined,
        volumen: (form.volumen ?? "").trim() || undefined,
        idioma: (form.idioma ?? "").trim() || undefined,
        genero: (form.genero ?? "").trim() || undefined,
        sinopsis: (form.sinopsis ?? "").trim() || undefined,
        portadaUrl: (form.portadaUrl ?? "").trim() || undefined,
      });

      if (comentario.trim()) {
        await publicarResena(
          isbnFinal,
          user.uid,
          user.displayName ?? user.email ?? t("leidosAgregar.anonimo"),
          estrellas,
          comentario.trim()
        );
      }

      toast.success(t("leidosAgregar.agregadoExito"));
      router.push("/leidos");
    } catch (err) {
      logError("Error guardando el libro leído:", err);
      const mensaje = err instanceof Error ? err.message : String(err);
      toast.error(t("leidosAgregar.errorGuardar", { mensaje }));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <button
          onClick={() => router.push("/leidos")}
          className="flex size-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={t("leidosAgregar.volverALeidos")}
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-2xl font-bold">{t("leidosAgregar.titulo")}</h1>
      </div>
      <p className="mb-7 mt-1 text-sm text-muted-foreground">
        {t("leidosAgregar.subtitulo")}
      </p>

      {paso === "buscar" && (
        <div className="flex flex-col gap-4">
          {escaneando ? (
            <BarcodeScanner onDetected={handleDetected} />
          ) : (
            <Button variant="outline" onClick={() => setEscaneando(true)}>
              <ScanBarcode />
              {t("leidosAgregar.escanear")}
            </Button>
          )}
          {escaneando && (
            <Button variant="ghost" size="sm" onClick={() => setEscaneando(false)}>
              {t("leidosAgregar.cancelarEscaneo")}
            </Button>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            {t("leidosAgregar.oIngresarIsbn")}
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={t("leidosAgregar.placeholderIsbn")}
              inputMode="numeric"
              maxLength={13}
              value={isbnInput}
              onChange={(e) => handleIsbnInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            />
            <Button onClick={handleBuscar} disabled={buscando}>
              {buscando ? <Loader2 className="size-4 animate-spin" /> : t("leidosAgregar.buscar")}
            </Button>
          </div>
          {buscando && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t("leidosAgregar.buscandoLibro")}
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            {t("leidosAgregar.oBuscarPorTitulo")}
            <div className="h-px flex-1 bg-border" />
          </div>
          <BuscarPorTitulo
            idiomasLectura={localeLectura}
            onSeleccionar={handleSeleccionarPorTitulo}
          />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            {t("leidosAgregar.o")}
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" onClick={handleManual}>
            <PenLine />
            {t("leidosAgregar.cargarManualmente")}
          </Button>
        </div>
      )}

      {paso === "formulario" && (
        <div className="flex flex-col gap-4">
          {comunidad && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs">
              <span className="font-semibold">{t("leidosAgregar.yaEstaComunidad")} </span>
              {t("leidosAgregar.comunidadInfo", {
                propietarios: comunidad.propietarios,
                rating: comunidad.ratingPromedio,
              })}
            </div>
          )}

          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("leidosAgregar.datosComunidad")}
          </div>

          <div className="flex items-center gap-3">
            {form.portadaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.portadaUrl}
                alt={t("leidosAgregar.portadaAlt")}
                className="h-[130px] w-[88px] rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-[130px] w-[88px] items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                {t("leidosAgregar.sinPortada")}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPortadaPickerOpen(true)}
            >
              {form.portadaUrl ? t("leidosAgregar.cambiarPortada") : t("leidosAgregar.buscarPortada")}
            </Button>
          </div>

          <Field label={t("leidosAgregar.campoIsbn")}>
            <Input
              inputMode="numeric"
              maxLength={13}
              value={isbn}
              onChange={(e) => setIsbn(sanitizarIsbn(e.target.value))}
            />
          </Field>
          <Field label={t("leidosAgregar.campoTitulo")}>
            <Input value={form.titulo} onChange={(e) => setCampo("titulo", e.target.value)} />
          </Field>
          <Field label={t("leidosAgregar.campoAutor")}>
            <Input
              placeholder={t("leidosAgregar.separadosPorComa")}
              value={form.autor}
              onChange={(e) => setCampo("autor", e.target.value)}
              list="sugerencias-autor"
            />
          </Field>
          <Field label={t("leidosAgregar.campoIlustrador")}>
            <Input
              placeholder={t("leidosAgregar.separadosPorComa")}
              value={form.ilustrador}
              onChange={(e) => setCampo("ilustrador", e.target.value)}
            />
          </Field>
          <div className="flex gap-3">
            <Field label={t("leidosAgregar.campoEditorial")} className="flex-[2]">
              <Input
                value={form.editorial}
                onChange={(e) => setCampo("editorial", e.target.value)}
                list="sugerencias-editorial"
              />
            </Field>
            <Field label={t("leidosAgregar.campoAnio")} className="w-[90px]">
              <Input value={form.anio} onChange={(e) => setCampo("anio", e.target.value)} />
            </Field>
            <Field label={t("leidosAgregar.campoVolumen")} className="w-[110px]">
              <Input
                placeholder={t("leidosAgregar.tomoPlaceholder")}
                value={form.volumen}
                onChange={(e) => setCampo("volumen", e.target.value)}
              />
            </Field>
          </div>
          <Field label={t("leidosAgregar.campoGenero")}>
            <GeneroSelect value={form.genero} onValueChange={(v) => setCampo("genero", v)} />
          </Field>
          <Field label={t("leidosAgregar.campoSinopsis")}>
            <Textarea rows={3} value={form.sinopsis} onChange={(e) => setCampo("sinopsis", e.target.value)} />
          </Field>

          <div className="mt-2 border-t pt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("leidosAgregar.tuResena")}
          </div>
          <RatingCaraPicker value={estrellas} onChange={setEstrellas} />
          <Textarea
            placeholder={t("leidosAgregar.quePensaste")}
            rows={3}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />

        </div>
      )}

      {paso === "formulario" && (
        <div className="sticky bottom-0 -mx-5 -mb-24 flex gap-2.5 border-t bg-background px-5 pt-3 pb-24 md:-mx-12 md:-mb-12 md:px-12 md:pb-3">
          <Button variant="outline" onClick={() => setPaso("buscar")}>
            {t("leidosAgregar.cancelar")}
          </Button>
          <Button className="flex-1" onClick={handleGuardar} disabled={guardando}>
            {t("leidosAgregar.agregarALeidos")}
          </Button>
        </div>
      )}

      <PortadaPicker
        open={portadaPickerOpen}
        onOpenChange={setPortadaPickerOpen}
        consultaInicial={form.titulo || form.autor}
        onSeleccionar={(url) => setCampo("portadaUrl", url)}
      />

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
    </div>
  );
}

function Field({
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
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
