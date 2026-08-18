"use client";

import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { Label } from "@/components/ui/label";
import { LocaleSelect } from "@/components/cuenta/locale-select";

export default function CuentaPage() {
  const { user } = useAuth();
  const { locale, localeLectura, setLocale, setLocaleLectura, t } = useLocale();

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("cuenta.titulo")}</h1>
      <p className="mb-7 mt-1 text-sm text-muted-foreground">{t("cuenta.subtitulo")}</p>

      <div className="flex max-w-sm flex-col gap-6">
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
          <LocaleSelect value={localeLectura} onValueChange={setLocaleLectura} />
        </div>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        {t("cuenta.conectadoComo")} <strong>{user?.email}</strong>
      </p>
    </div>
  );
}
