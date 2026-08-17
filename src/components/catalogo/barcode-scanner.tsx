"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

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
    detectedRef.current = false;

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
            onDetected(decodedText.replace(/[^0-9Xx]/g, ""));
          },
          () => {
            // decode attempt sin resultado, ignorar (se llama constantemente)
          }
        );
        if (!cancelado) setEstado("escaneando");
      } catch {
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
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
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
