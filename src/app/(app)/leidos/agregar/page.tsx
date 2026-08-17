"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PenLine, ScanBarcode, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  agregarLibroLeido,
  getLibroGlobal,
  publicarResena,
} from "@/lib/firestore/libros";
import { buscarPorIsbn } from "@/services/google-books";
import { BarcodeScanner } from "@/components/catalogo/barcode-scanner";
import { PortadaPicker } from "@/components/catalogo/portada-picker";
import type { LibroGlobal } from "@/types";

type Paso = "buscar" | "formulario";

const FORM_INICIAL = {
  titulo: "",
  subtitulo: "",
  autor: "",
  editorial: "",
  anio: "",
  paginas: "",
  genero: "",
  idioma: "",
  sinopsis: "",
  portadaUrl: "",
};

export default function AgregarLeidoPage() {
  const router = useRouter();
  const { user } = useAuth();
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
      toast.error("Ingresá un ISBN.");
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
          editorial: local.editorial ?? "",
          anio: local.anio ?? "",
          paginas: local.paginas ?? "",
          genero: local.genero ?? "",
          idioma: local.idioma ?? "",
          sinopsis: local.sinopsis ?? "",
          portadaUrl: local.portadaUrl ?? "",
        });
      } else {
        try {
          const encontrado = await buscarPorIsbn(codigo);
          if (encontrado) {
            setForm({ ...FORM_INICIAL, ...encontrado });
          } else {
            toast.error(
              "No encontramos ese ISBN (Google Books ni Open Library). Completá los datos a mano."
            );
            setForm({ ...FORM_INICIAL });
          }
        } catch (err) {
          console.error("Error consultando el ISBN:", err);
          toast.error("No pudimos consultar el ISBN. Cargá los datos manualmente.");
          setForm({ ...FORM_INICIAL });
        }
      }
      setIsbn(codigo);
      setPaso("formulario");
    } catch (err) {
      console.error("Error buscando ISBN:", err);
      toast.error("No pudimos buscar el ISBN. Probá de nuevo.");
    } finally {
      setBuscando(false);
    }
  }

  function handleBuscar() {
    buscar(isbnInput.trim());
  }

  function handleDetected(codigo: string) {
    setEscaneando(false);
    setIsbnInput(codigo);
    buscar(codigo);
  }

  function handleManual() {
    setIsbn("");
    setComunidad(null);
    setForm(FORM_INICIAL);
    setPaso("formulario");
  }

  async function handleGuardar() {
    if (!user) return;
    if (!isbn) {
      toast.error("Falta el ISBN.");
      return;
    }
    if (!form.titulo.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }
    setGuardando(true);
    try {
      await agregarLibroLeido(isbn, user.uid, {
        titulo: form.titulo.trim(),
        subtitulo: form.subtitulo.trim() || undefined,
        autor: form.autor.trim(),
        editorial: form.editorial.trim() || undefined,
        anio: form.anio.trim() || undefined,
        paginas: form.paginas.trim() || undefined,
        idioma: form.idioma.trim() || undefined,
        genero: form.genero.trim() || undefined,
        sinopsis: form.sinopsis.trim() || undefined,
        portadaUrl: form.portadaUrl.trim() || undefined,
      });

      if (comentario.trim()) {
        await publicarResena(
          isbn,
          user.uid,
          user.displayName ?? user.email ?? "Anónimo",
          estrellas,
          comentario.trim()
        );
      }

      toast.success("Agregado a tus leídos.");
      router.push("/leidos");
    } catch (err) {
      console.error("Error guardando el libro leído:", err);
      const mensaje = err instanceof Error ? err.message : String(err);
      toast.error(`No pudimos guardarlo: ${mensaje}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Agregar a leídos</h1>
      <p className="mb-7 mt-1 text-sm text-muted-foreground">
        Para libros que leíste pero no tenés en tu biblioteca. No se agrega a
        ningún inventario físico.
      </p>

      {paso === "buscar" && (
        <div className="flex flex-col gap-4">
          {escaneando ? (
            <BarcodeScanner onDetected={handleDetected} />
          ) : (
            <Button variant="outline" onClick={() => setEscaneando(true)}>
              <ScanBarcode />
              Escanear con la cámara
            </Button>
          )}
          {escaneando && (
            <Button variant="ghost" size="sm" onClick={() => setEscaneando(false)}>
              Cancelar escaneo
            </Button>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />o ingresá el ISBN
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="978-..."
              value={isbnInput}
              onChange={(e) => setIsbnInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            />
            <Button onClick={handleBuscar} disabled={buscando}>
              Buscar
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />o<div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" onClick={handleManual}>
            <PenLine />
            Cargar manualmente
          </Button>
        </div>
      )}

      {paso === "formulario" && (
        <div className="flex flex-col gap-4">
          {comunidad && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs">
              <span className="font-semibold">Ya está en la comunidad: </span>
              {comunidad.propietarios} biblioteca(s) lo tienen · ★{" "}
              {comunidad.ratingPromedio} promedio
            </div>
          )}

          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Datos del libro (comunidad)
          </div>

          <div className="flex items-center gap-3">
            {form.portadaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.portadaUrl}
                alt="Portada"
                className="h-[130px] w-[88px] rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-[130px] w-[88px] items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                Sin portada
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPortadaPickerOpen(true)}
            >
              {form.portadaUrl ? "Cambiar portada" : "Buscar portada"}
            </Button>
          </div>

          <Field label="ISBN">
            <Input value={isbn} onChange={(e) => setIsbn(e.target.value.trim())} />
          </Field>
          <Field label="Título">
            <Input value={form.titulo} onChange={(e) => setCampo("titulo", e.target.value)} />
          </Field>
          <Field label="Autor(es)">
            <Input
              placeholder="separados por coma"
              value={form.autor}
              onChange={(e) => setCampo("autor", e.target.value)}
            />
          </Field>
          <div className="flex gap-3">
            <Field label="Editorial" className="flex-[2]">
              <Input value={form.editorial} onChange={(e) => setCampo("editorial", e.target.value)} />
            </Field>
            <Field label="Año" className="w-[90px]">
              <Input value={form.anio} onChange={(e) => setCampo("anio", e.target.value)} />
            </Field>
          </div>
          <Field label="Género (opcional)">
            <Input value={form.genero} onChange={(e) => setCampo("genero", e.target.value)} />
          </Field>
          <Field label="Sinopsis (opcional)">
            <Textarea rows={3} value={form.sinopsis} onChange={(e) => setCampo("sinopsis", e.target.value)} />
          </Field>

          <div className="mt-2 border-t pt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Tu reseña (opcional)
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setEstrellas(n)}>
                <Star
                  className={cn(
                    "size-5",
                    n <= estrellas ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="¿Qué te pareció?"
            rows={3}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />

        </div>
      )}

      {paso === "formulario" && (
        <div className="sticky bottom-0 -mx-5 flex gap-2.5 border-t bg-background px-5 py-3 md:-mx-12 md:px-12">
          <Button variant="outline" onClick={() => setPaso("buscar")}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleGuardar} disabled={guardando}>
            Agregar a leídos
          </Button>
        </div>
      )}

      <PortadaPicker
        open={portadaPickerOpen}
        onOpenChange={setPortadaPickerOpen}
        consultaInicial={form.titulo || form.autor}
        isbn={isbn}
        onSeleccionar={(url) => setCampo("portadaUrl", url)}
      />
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
