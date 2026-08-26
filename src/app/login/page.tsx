"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { logError } from "@/lib/log";

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
      <path d="M15.5 8.5c-1 0-1.8.6-2.4.6s-1.5-.6-2.5-.6c-2.1 0-4.1 1.7-4.1 4.9 0 2.9 2.1 6.6 3.9 6.6.8 0 1.2-.5 2.2-.5s1.4.5 2.2.5c1.4 0 2.4-1.4 3.2-2.7.9-1.5 1.3-3 1.3-3.1-3.1-1.2-3.1-4.9.3-6-1.1-1.6-2.8-1.7-3.4-1.7z" />
      <path d="M13.3 6.5c.6-.7 1-1.7.9-2.7-.9.1-2 .7-2.6 1.4-.5.6-1 1.6-.9 2.6.9.1 1.9-.5 2.6-1.3z" />
    </svg>
  );
}

function AmazonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <text
        x="12"
        y="15"
        textAnchor="middle"
        fontSize="13"
        fontFamily="Arial, sans-serif"
        fontWeight="700"
        fill="currentColor"
      >
        a
      </text>
      <path
        d="M6 16c3.5 2.2 8.5 2.2 12 0"
        stroke="#FF9900"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M16.6 15.3l1.7.4-.5 1.7"
        stroke="#FF9900"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.48-1.13 2.73-2.4 3.58v3h3.86c2.26-2.09 3.62-5.17 3.62-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.28A11.94 11.94 0 0 0 0 12c0 1.92.46 3.74 1.28 5.38l3.99-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

type Step = "start" | "sent" | "completing" | "need-email";

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    loading,
    signInWithGoogle,
    signInWithApple,
    completeAmazonSignIn,
    sendLoginLink,
    isEmailSignInLink,
    completeEmailLinkSignIn,
  } = useAuth();
  const { t } = useLocale();

  const [step, setStep] = useState<Step>(() =>
    typeof window !== "undefined" && isEmailSignInLink(window.location.href)
      ? "completing"
      : "start"
  );
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/inicio");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (step !== "completing") return;

    completeEmailLinkSignIn(window.location.href)
      .then(() => router.replace("/inicio"))
      .catch((err) => {
        if (err instanceof Error && err.message === "NEEDS_EMAIL") {
          setStep("need-email");
        } else {
          toast.error(t("login.errorCompletando"));
          setStep("start");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Vuelta del redirect de /api/auth/amazon/callback: ?provider=amazon si
  // salió bien (hay un custom token esperando), ?error=amazon si no.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("provider") === "amazon") {
      completeAmazonSignIn()
        .then(() => router.replace("/inicio"))
        .catch((err) => {
          logError("Error completando el login con Amazon:", err);
          toast.error(t("login.errorAmazon"));
        });
    } else if (params.get("error") === "amazon") {
      toast.error(t("login.errorAmazon"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogle() {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/inicio");
    } catch (err) {
      logError("Error con Google Sign-In:", err);
      toast.error(t("login.errorGoogle"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApple() {
    setSubmitting(true);
    try {
      await signInWithApple();
      router.replace("/inicio");
    } catch (err) {
      logError("Error con Apple Sign-In:", err);
      toast.error(t("login.errorApple"));
    } finally {
      setSubmitting(false);
    }
  }

  function handleAmazon() {
    window.location.href = "/api/auth/amazon/iniciar";
  }

  async function handleSendLink() {
    if (!email.trim()) {
      toast.error(t("login.errorCorreoVacio"));
      return;
    }
    setSubmitting(true);
    try {
      await sendLoginLink(email.trim());
      setStep("sent");
    } catch (err) {
      logError("Error enviando el link de acceso:", err);
      toast.error(t("login.errorEnviandoLink"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmEmail() {
    if (!confirmEmail.trim()) {
      toast.error(t("login.errorCorreoConfirmVacio"));
      return;
    }
    setSubmitting(true);
    try {
      await completeEmailLinkSignIn(window.location.href, confirmEmail.trim());
      router.replace("/inicio");
    } catch (err) {
      logError("Error completando el login por email link:", err);
      toast.error(t("login.errorLinkInvalido"));
      setStep("start");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-[380px] flex-col gap-6 rounded-xl border bg-card p-9 shadow-sm">
        <div>
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Cittadella" className="mb-3 h-9 w-auto" />
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("login.subtitulo")}
          </p>
        </div>

        {step === "start" && (
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="justify-center gap-2.5 py-5.5"
              onClick={handleGoogle}
              disabled={submitting}
            >
              <GoogleIcon />
              {t("login.continuarGoogle")}
            </Button>

            <Button
              variant="outline"
              className="justify-center gap-2.5 py-5.5"
              onClick={handleApple}
              disabled={submitting}
            >
              <AppleIcon />
              {t("login.continuarApple")}
            </Button>

            <Button
              variant="outline"
              className="justify-center gap-2.5 py-5.5"
              onClick={handleAmazon}
              disabled={submitting}
            >
              <AmazonIcon />
              {t("login.continuarAmazon")}
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              {t("login.oConCorreo")}
              <div className="h-px flex-1 bg-border" />
            </div>

            <Input
              type="email"
              placeholder={t("login.placeholderCorreo")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
            <Button onClick={handleSendLink} disabled={submitting}>
              {t("login.enviarLink")}
            </Button>
          </div>
        )}

        {step === "sent" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("login.linkEnviadoA")}{" "}
              <strong className="text-foreground">{email}</strong>.{" "}
              {t("login.abrirDesdeDispositivo")}
            </p>
            <Button variant="ghost" onClick={() => setStep("start")}>
              {t("login.volver")}
            </Button>
          </div>
        )}

        {step === "completing" && (
          <p className="text-sm text-muted-foreground">{t("login.ingresando")}</p>
        )}

        {step === "need-email" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("login.confirmarCorreo")}
            </p>
            <Label htmlFor="confirm-email">{t("login.correo")}</Label>
            <Input
              id="confirm-email"
              type="email"
              placeholder={t("login.placeholderCorreo")}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              disabled={submitting}
            />
            <Button onClick={handleConfirmEmail} disabled={submitting}>
              {t("login.ingresar")}
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Al continuar, aceptás nuestra{" "}
          <Link href="/privacidad" className="underline">
            Política de Privacidad
          </Link>
          .
        </p>

        <Link
          href="/"
          className="text-center text-sm text-muted-foreground underline"
        >
          {t("login.volverInicio")}
        </Link>
      </div>
    </div>
  );
}
