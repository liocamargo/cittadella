"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Pencil, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import { useLocale } from "@/hooks/use-locale";
import { logError } from "@/lib/log";
import {
  actualizarWhatsappMiembro,
  cancelarInvitacion,
  invitarMiembro,
  quitarMiembro,
  renombrarBiblioteca,
  renombrarMiembro,
  setModoSocios,
} from "@/lib/firestore/bibliotecas";
import {
  agregarLibroABiblioteca,
  getLibroGlobal,
  listenInventario,
} from "@/lib/firestore/libros";
import { EliminarBibliotecaDialog } from "@/components/espacio/eliminar-biblioteca-dialog";
import type { LibroEnBiblioteca, LibroGlobal } from "@/types";

interface FilaImportada {
  titulo: string;
  autor: string;
  editorial: string;
  anio: string;
  paginas: string;
  volumen: string;
  genero: string;
  idioma: string;
  isbn: string;
  estante: string;
  notas: string;
  favorito: boolean;
}

const COLUMNAS_RECONOCIDAS = [
  "Title",
  "titulo",
  "título",
  "Author",
  "autor",
  "Publisher",
  "editorial",
  "Published Date",
  "year",
  "anio",
  "año",
  "Pages",
  "paginas",
  "páginas",
  "Volume",
  "volumen",
  "tomo",
  "Genres",
  "Genre",
  "genero",
  "género",
  "Language",
  "idioma",
  "ISBN",
  "isbn",
  "BookShelf",
  "shelf",
  "estante",
  "Comments",
  "notas",
  "Favorite",
  "favorito",
  "Favorito",
];

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function mapearFila(row: Record<string, string>): FilaImportada {
  const fav = pick(row, ["Favorite", "favorito", "Favorito"]).toLowerCase();
  return {
    titulo: pick(row, ["Title", "titulo", "título"]),
    autor: pick(row, ["Author", "autor"]),
    editorial: pick(row, ["Publisher", "editorial"]),
    anio: pick(row, ["Published Date", "year", "anio", "año"]).slice(0, 4),
    paginas: pick(row, ["Pages", "paginas", "páginas"]),
    volumen: pick(row, ["Volume", "volumen", "tomo"]),
    genero: pick(row, ["Genres", "Genre", "genero", "género"]),
    idioma: pick(row, ["Language", "idioma"]),
    isbn: pick(row, ["ISBN", "isbn"]).replace(/[^0-9Xx]/g, ""),
    estante: pick(row, ["BookShelf", "shelf", "estante"]),
    notas: pick(row, ["Comments", "notas"]),
    favorito: fav === "true" || fav === "1" || fav === "yes" || fav === "sí" || fav === "si",
  };
}

function descargarArchivo(nombre: string, contenido: string) {
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EspacioPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { bibliotecaActual } = useBiblioteca();
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [editingNombre, setEditingNombre] = useState(false);
  const [nombreEspacio, setNombreEspacio] = useState("");
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  const [copias, setCopias] = useState<LibroEnBiblioteca[]>([]);
  const [preview, setPreview] = useState<FilaImportada[] | null>(null);
  const [datosComunidad, setDatosComunidad] = useState<Record<string, LibroGlobal>>({});
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);

  useEffect(() => {
    if (!bibliotecaActual) {
      setCopias([]);
      return;
    }
    return listenInventario(bibliotecaActual.id, setCopias);
  }, [bibliotecaActual]);

  const isbns = copias.map((c) => c.isbn);
  const globales = useLibrosGlobales(isbns);
  const isbnsExistentes = new Set(copias.map((c) => c.isbn));

  if (!bibliotecaActual) {
    return (
      <div className="text-sm text-muted-foreground">{t("espacio.cargando")}</div>
    );
  }

  const miembros = bibliotecaActual.miembrosUids.map((uid) => ({
    uid,
    nombre:
      bibliotecaActual.nombresMiembros[uid] ??
      bibliotecaActual.emailsMiembros[uid] ??
      uid,
    email: bibliotecaActual.emailsMiembros[uid] ?? "",
    whatsapp: bibliotecaActual.whatsappMiembros[uid] ?? "",
    esOwner: uid === bibliotecaActual.creadaPor,
  }));

  async function handleGuardarNombreEspacio() {
    if (!bibliotecaActual) return;
    if (!nombreEspacio.trim()) return;
    setGuardandoNombre(true);
    try {
      await renombrarBiblioteca(bibliotecaActual.id, nombreEspacio.trim());
      setEditingNombre(false);
    } catch (err) {
      logError("Error renombrando el espacio:", err);
      toast.error(t("espacio.errorRenombrandoEspacio"));
    } finally {
      setGuardandoNombre(false);
    }
  }

  async function handleGuardarNombre(uid: string) {
    if (!bibliotecaActual) return;
    if (!editName.trim()) return;
    await renombrarMiembro(bibliotecaActual.id, uid, editName.trim());
    await actualizarWhatsappMiembro(bibliotecaActual.id, uid, editWhatsapp);
    setEditingUid(null);
  }

  async function handleQuitar(uid: string) {
    if (!bibliotecaActual) return;
    if (!window.confirm(t("espacio.confirmarQuitarAcceso"))) return;
    await quitarMiembro(bibliotecaActual.id, uid);
  }

  async function handleInvitar() {
    if (!bibliotecaActual) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error(t("espacio.errorCorreoInvalido"));
      return;
    }
    setInviting(true);
    try {
      await invitarMiembro(bibliotecaActual.id, email);
      setInviteEmail("");

      try {
        const idToken = await user?.getIdToken();
        const res = await fetch("/api/invitar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            email,
            bibliotecaId: bibliotecaActual.id,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        toast.success(t("espacio.invitacionEnviada", { email }));
      } catch (err) {
        logError("Error mandando el email de invitación:", err);
        toast.warning(t("espacio.avisoInvitacionSinEmail"));
      }
    } catch (err) {
      logError("Error guardando la invitación:", err);
      toast.error(t("espacio.errorInvitando"));
    } finally {
      setInviting(false);
    }
  }

  async function handleCancelarInvitacion(email: string) {
    if (!bibliotecaActual) return;
    await cancelarInvitacion(bibliotecaActual.id, email);
  }

  async function handleToggleModoSocios(activo: boolean) {
    if (!bibliotecaActual) return;
    if (activo && !window.confirm(t("espacio.confirmarModoSocios"))) {
      return;
    }
    try {
      await setModoSocios(bibliotecaActual.id, activo);
    } catch (err) {
      logError("Error actualizando el modo socios:", err);
      toast.error(t("espacio.errorModoSocios"));
    }
  }

  function handleExportar() {
    const filas = copias.map((c) => {
      const g = globales[c.isbn];
      return {
        titulo: g?.titulo ?? "",
        autor: g?.autor ?? "",
        editorial: g?.editorial ?? "",
        anio: g?.anio ?? "",
        volumen: g?.volumen ?? "",
        genero: g?.genero ?? "",
        isbn: c.isbn.startsWith("manual-") ? "" : c.isbn,
        estante: c.estante,
        estado: c.estado,
        prestado_a: c.prestadoA ?? "",
      };
    });
    descargarArchivo(
      `${bibliotecaActual?.nombre ?? "biblioteca"}.csv`,
      Papa.unparse(filas)
    );
  }

  function handleDescargarPlantilla() {
    descargarArchivo(
      "plantilla-cittadella.csv",
      Papa.unparse([
        {
          title: "",
          author: "",
          publisher: "",
          year: "",
          genre: "",
          volume: "",
          isbn: "",
          shelf: "",
        },
      ])
    );
  }

  function procesarArchivo(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error(t("importar.errorNoCsv"));
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const columnas = results.meta.fields ?? [];
        const reconoce = columnas.some((c) => COLUMNAS_RECONOCIDAS.includes(c.trim()));
        if (!reconoce) {
          toast.error(t("importar.errorColumnasNoReconocidas"));
          return;
        }
        const conTitulo = results.data.map(mapearFila).filter((f) => f.titulo);
        if (conTitulo.length === 0) {
          toast.error(t("importar.errorSinTitulo"));
          return;
        }
        const filas = conTitulo.filter((f) => f.isbn);
        const sinIsbn = conTitulo.length - filas.length;
        if (filas.length === 0) {
          toast.error(t("importar.errorSinIsbn"));
          return;
        }
        if (sinIsbn > 0) {
          toast.warning(t("importar.avisoFilasSinIsbn", { cantidad: sinIsbn }));
        }
        setPreview(filas);
        setDatosComunidad({});
        cargarDatosComunidad(filas);
      },
      error: (err) => {
        logError("Error leyendo el CSV:", err);
        toast.error(t("importar.errorLeyendoArchivo"));
      },
    });
  }

  async function cargarDatosComunidad(filas: FilaImportada[]) {
    const isbnsUnicos = Array.from(new Set(filas.map((f) => f.isbn)));
    const encontrados: Record<string, LibroGlobal> = {};
    await Promise.all(
      isbnsUnicos.map(async (isbn) => {
        const libro = await getLibroGlobal(isbn);
        if (libro) encontrados[isbn] = libro;
      })
    );
    setDatosComunidad(encontrados);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) procesarArchivo(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) procesarArchivo(file);
  }

  async function handleConfirmarImport() {
    if (!bibliotecaActual || !preview) return;
    setImportando(true);
    setProgreso(0);
    let ok = 0;
    let omitidos = 0;
    let fallidos = 0;
    for (const fila of preview) {
      if (isbnsExistentes.has(fila.isbn)) {
        omitidos += 1;
        setProgreso((p) => p + 1);
        continue;
      }
      try {
        await agregarLibroABiblioteca(
          fila.isbn,
          bibliotecaActual.id,
          {
            titulo: fila.titulo,
            autor: fila.autor,
            editorial: fila.editorial || undefined,
            anio: fila.anio || undefined,
            paginas: fila.paginas || undefined,
            volumen: fila.volumen || undefined,
            idioma: fila.idioma || undefined,
            genero: fila.genero || undefined,
          },
          { estante: fila.estante, notas: fila.notas || undefined }
        );
        ok += 1;
      } catch (err) {
        logError(`Error importando "${fila.titulo}" (ISBN ${fila.isbn}):`, err);
        fallidos += 1;
      }
      setProgreso((p) => p + 1);
    }
    setImportando(false);
    setPreview(null);
    const detalles = [
      omitidos > 0 && t("importar.detalleOmitidos", { cantidad: omitidos }),
      fallidos > 0 && t("importar.detalleFallidos", { cantidad: fallidos }),
    ].filter(Boolean);
    const detalle = detalles.length > 0 ? ` (${detalles.join(", ")})` : "";
    toast.success(t("importar.resultadoImportacion", { ok, total: preview.length, detalle }));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("espacio.titulo")}</h1>

      {editingNombre ? (
        <div className="mb-1 mt-2 flex items-center gap-1.5">
          <Input
            autoFocus
            value={nombreEspacio}
            onChange={(e) => setNombreEspacio(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGuardarNombreEspacio()}
            className="h-8 max-w-xs text-sm font-semibold"
          />
          <Button
            size="sm"
            className="h-8"
            onClick={handleGuardarNombreEspacio}
            disabled={guardandoNombre}
          >
            {t("common.guardar")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => setEditingNombre(false)}
            disabled={guardandoNombre}
          >
            {t("common.cancelar")}
          </Button>
        </div>
      ) : (
        <div className="mb-1 mt-2 flex items-center gap-1.5">
          <p className="text-sm text-muted-foreground">
            {t("espacio.nombreEspacioLabel")} <strong>{bibliotecaActual.nombre}</strong>
          </p>
          <button
            onClick={() => {
              setNombreEspacio(bibliotecaActual.nombre);
              setEditingNombre(true);
            }}
            className="text-muted-foreground"
            aria-label={t("espacio.editarNombreAriaLabel")}
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      )}

      <p className="mb-1 mt-1 text-sm text-muted-foreground">
        {t("espacio.descripcionMiembros")}
      </p>
      <p className="mb-7 text-xs text-muted-foreground">
        {t("espacio.descripcionWhatsapp")}
      </p>

      <div className="mb-7 flex items-center justify-between gap-4 rounded-lg border p-3.5">
        <div>
          <Label className="text-sm font-semibold">{t("espacio.modoSocios")}</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("espacio.modoSociosDesc")}
          </p>
        </div>
        <Switch
          checked={bibliotecaActual.modoSocios}
          onCheckedChange={handleToggleModoSocios}
        />
      </div>

      <div className="mb-6 flex flex-col divide-y overflow-hidden rounded-lg border">
        {miembros.map((m) => (
          <div
            key={m.uid}
            className="flex items-center justify-between gap-2.5 bg-card p-3.5"
          >
            {editingUid === m.uid ? (
              <div className="flex flex-1 flex-col gap-1.5">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t("espacio.placeholderNombre")}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Input
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  placeholder={t("espacio.placeholderWhatsapp")}
                  inputMode="numeric"
                  className="h-8 text-sm"
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-8" onClick={() => handleGuardarNombre(m.uid)}>
                    {t("common.guardar")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setEditingUid(null)}
                  >
                    {t("common.cancelar")}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-semibold">{m.nombre}</div>
                <div className="text-xs text-muted-foreground">{m.email}</div>
                {m.whatsapp && (
                  <div className="text-xs text-muted-foreground">
                    {t("espacio.whatsappLabel")} {m.whatsapp}
                  </div>
                )}
              </div>
            )}

            <div className="flex shrink-0 items-center gap-2.5">
              <Badge variant={m.esOwner ? "default" : "secondary"}>
                {m.esOwner ? t("espacio.dueno") : t("espacio.miembro")}
              </Badge>
              {editingUid !== m.uid && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    setEditingUid(m.uid);
                    setEditName(m.nombre);
                    setEditWhatsapp(m.whatsapp);
                  }}
                >
                  {t("espacio.editar")}
                </Button>
              )}
              {!m.esOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-destructive"
                  onClick={() => handleQuitar(m.uid)}
                >
                  {t("espacio.quitarAcceso")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {bibliotecaActual.invitacionesPendientes.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">
            {t("espacio.invitacionesPendientes")}
          </div>
          <div className="flex flex-col gap-1.5">
            {bibliotecaActual.invitacionesPendientes.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between rounded-lg border border-dashed p-2.5 text-sm"
              >
                <span className="text-muted-foreground">{email}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => handleCancelarInvitacion(email)}
                >
                  {t("common.cancelar")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm font-semibold">{t("espacio.invitarNuevoMiembro")}</div>
      <p className="mb-2 mt-1 text-xs text-muted-foreground">
        {t("espacio.invitarDescripcion")}
      </p>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder={t("espacio.placeholderCorreo")}
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleInvitar()}
        />
        <Button onClick={handleInvitar} disabled={inviting}>
          {t("espacio.invitar")}
        </Button>
      </div>

      <div className="mt-10 flex flex-col gap-9 border-t pt-8">
        <div>
          <h2 className="text-lg font-bold">{t("importar.titulo")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("importar.subtitulo")}</p>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold">{t("importar.exportarTitulo")}</div>
          <p className="mb-3 text-sm text-muted-foreground">
            {t("importar.exportarDescripcion", { cantidad: copias.length })}
          </p>
          <Button variant="outline" onClick={handleExportar}>
            {t("importar.descargarCsv")}
          </Button>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold">{t("importar.importarTitulo")}</div>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors",
              arrastrando && "border-foreground bg-muted/50"
            )}
          >
            <UploadCloud className="size-5 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {t("importar.arrastrarArchivo")}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground/70">
              {t("importar.soportaFormatos")}
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          <Button
            variant="outline"
            className="mt-2.5"
            onClick={handleDescargarPlantilla}
          >
            {t("importar.descargarPlantilla")}
          </Button>

          {preview && (
            <div className="mt-4">
              <div className="mb-2 text-sm text-muted-foreground">
                {t("importar.filasDetectadas", { cantidad: preview.length })}
              </div>
              <div className="mb-3 max-h-64 overflow-y-auto rounded-lg border">
                {preview.slice(0, 30).map((f, i) => {
                  const enComunidad = datosComunidad[f.isbn];
                  const yaEnBiblioteca = isbnsExistentes.has(f.isbn);
                  const titulo = enComunidad?.titulo || f.titulo;
                  const autor = enComunidad?.autor || f.autor;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 border-b p-2.5 text-sm last:border-b-0"
                    >
                      <span className={cn(yaEnBiblioteca && "text-muted-foreground")}>
                        {titulo} — {autor}
                      </span>
                      {yaEnBiblioteca ? (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {t("importar.yaEnBiblioteca")}
                        </span>
                      ) : (
                        enComunidad && (
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {t("importar.yaEnComunidad")}
                          </span>
                        )
                      )}
                    </div>
                  );
                })}
                {preview.length > 30 && (
                  <div className="p-2.5 text-xs text-muted-foreground">
                    {t("importar.yMasFilas", { cantidad: preview.length - 30 })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleConfirmarImport} disabled={importando}>
                  {importando
                    ? t("importar.importando", { progreso, total: preview.length })
                    : t("importar.agregarCatalogo")}
                </Button>
                <Button
                  variant="ghost"
                  disabled={importando}
                  onClick={() => setPreview(null)}
                >
                  {t("common.cancelar")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        {t("cuenta.conectadoComo")} <strong>{user?.email}</strong>
      </p>

      <EliminarBibliotecaDialog biblioteca={bibliotecaActual} />
    </div>
  );
}
