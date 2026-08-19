"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { logError } from "@/lib/log";

interface BarcodeScannerProps {
  onDetected: (codigo: string) => void;
}

type Estado = "iniciando" | "escaneando" | "error";

export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const elementId = useId().replace(/:/g, "");
  const [estado, setEstado] = useState<Estado>("iniciando");
  const [errorMsg, setErrorMsg] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    let cancelado = false;
    let detenido = false;
    detectedRef.current = false;

    // html5-qrcode's stop() puede tirar una excepción SINCRÓNICA (no un
    // reject de promesa) si se llama cuando el scanner ya no está corriendo.
    // Nos podía pasar dos veces: una vez al detectar un código, y otra vez
    // en el cleanup del efecto al desmontar el componente justo después,
    // lo cual rompía la página entera en producción. Este helper evita
    // llamar stop() más de una vez y blinda contra el throw sincrónico.
    function detenerScanner(scanner: Html5Qrcode): Promise<void> {
      if (detenido) return Promise.resolve();
      detenido = true;
      try {
        return scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      } catch {
        return Promise.resolve();
      }
    }

    async function iniciar() {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
        "html5-qrcode"
      );
      if (cancelado) return;

      const scanner = new Html5Qrcode(elementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 140 } },
          (decodedText) => {
            if (detectedRef.current) return;
            detectedRef.current = true;
            const codigo = decodedText.replace(/[^0-9Xx]/g, "");
            // Frenamos la cámara ANTES de avisar al padre, para no seguir
            // decodificando ni disparar más de un fetch por el mismo código.
            detenerScanner(scanner).finally(() => onDetected(codigo));
          },
          () => {
            // decode attempt sin resultado, ignorar (se llama constantemente)
          }
        );
        if (!cancelado) setEstado("escaneando");
      } catch (err) {
        logError("Error iniciando la cámara:", err);
        if (!cancelado) {
          setEstado("error");
          setErrorMsg(
            "No pudimos acceder a la cámara. Revisá los permisos del navegador o cargá el ISBN manualmente."
          );
        }
      }
    }

    iniciar();

    return () => {
      cancelado = true;
      const scanner = scannerRef.current;
      if (scanner) detenerScanner(scanner);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border">
      <div id={elementId} className="[&_video]:!w-full [&_video]:!object-cover" />
      {estado === "iniciando" && (
        <div className="p-6 text-center text-xs text-muted-foreground">
          Activando cámara…
        </div>
      )}
      {estado === "error" && (
        <div className="p-6 text-center text-xs text-muted-foreground">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
