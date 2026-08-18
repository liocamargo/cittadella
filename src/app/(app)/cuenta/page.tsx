"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { Label } from "@/components/ui/label";
import { LocaleSelect } from "@/components/cuenta/locale-select";
import { LocaleMultiSelect } from "@/components/cuenta/locale-multi-select";
import { GeneroMultiSelect } from "@/components/cuenta/genero-multi-select";
import { listenPerfil, guardarPerfil } from "@/lib/firestore/perfiles";

export default function CuentaPage() {
  const { user } = useAuth();
  const { locale, localeLectura, setLocale, setLocaleLectura, t } = useLocale();
  const [generosFavoritos, setGenerosFavoritos] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    return listenPerfil(user.uid, (perfil) => {
      if (perfil) setGenerosFavoritos(perfil.generosFavoritos);
    });
  }, [user]);

  function handleChangeGeneros(nuevos: string[]) {
    setGenerosFavoritos(nuevos);
    if (user) {
      guardarPerfil(user.uid, { generosFavoritos: nuevos }).catch((err) => {
        console.error("Error guardando los géneros favoritos:", err);
        toast.error(t("cuenta.errorGuardando"));
      });
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("cuenta.titulo")}</h1>
      <p className="mb-7 mt-1 text-sm text-muted-foreground">{t("cuenta.subtitulo")}</p>

      <div className="flex max-w-md flex-col gap-6">
        <div>
          <Label className="mb-1.5 block text-sm font-semibold">
            {t("cuenta.idiomaPagina")}
          </Label>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("cuenta.idiomaPaginaDesc")}
          </p>
          <LocaleSelect value={locale} onValueChange={setLocale} />
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-semibold">
            {t("cuenta.idiomaLectura")}
          </Label>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("cuenta.idiomaLecturaDesc")}
          </p>
          <LocaleMultiSelect value={localeLectura} onChange={setLocaleLectura} />
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-semibold">
            {t("cuenta.generosFavoritos")}
          </Label>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("cuenta.generosFavoritosDesc")}
          </p>
          <GeneroMultiSelect value={generosFavoritos} onChange={handleChangeGeneros} />
        </div>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        {t("cuenta.conectadoComo")} <strong>{user?.email}</strong>
      </p>
    </div>
  );
}
