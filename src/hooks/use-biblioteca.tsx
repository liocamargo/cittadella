"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  aceptarInvitacionesPendientes,
  crearBiblioteca,
  listenBibliotecasDeUsuario,
} from "@/lib/firestore/bibliotecas";
import type { Biblioteca } from "@/types";

interface BibliotecaContextValue {
  bibliotecas: Biblioteca[];
  bibliotecaActual: Biblioteca | null;
  loading: boolean;
  seleccionarBiblioteca: (id: string) => void;
  crearYSeleccionar: (nombre: string) => Promise<void>;
}

const BibliotecaContext = createContext<BibliotecaContextValue | null>(null);

function storageKey(uid: string) {
  return `cittadella:bibliotecaActual:${uid}`;
}

export function BibliotecaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [bibliotecas, setBibliotecas] = useState<Biblioteca[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const autoCreateAttempted = useRef(false);
  const invitesAccepted = useRef(false);

  useEffect(() => {
    if (!user) {
      setBibliotecas([]);
      setCurrentId(null);
      setLoading(true);
      autoCreateAttempted.current = false;
      invitesAccepted.current = false;
      return;
    }

    setCurrentId(window.localStorage.getItem(storageKey(user.uid)));

    if (!invitesAccepted.current && user.email) {
      invitesAccepted.current = true;
      const nombre = user.displayName ?? user.email;
      aceptarInvitacionesPendientes(user.uid, user.email, nombre).catch(() => {});
    }

    const unsubscribe = listenBibliotecasDeUsuario(user.uid, (lista) => {
      setBibliotecas(lista);
      setLoading(false);

      if (lista.length > 0) {
        // Vuelve a armar la guarda: si más adelante te quedás sin
        // bibliotecas (p.ej. la borraste a mano en Firestore), se
        // puede volver a crear una por defecto sin recargar la página.
        autoCreateAttempted.current = false;
        return;
      }

      if (!autoCreateAttempted.current) {
        autoCreateAttempted.current = true;
        const nombre = user.displayName
          ? `Biblioteca de ${user.displayName.split(" ")[0]}`
          : "Mi biblioteca";
        crearBiblioteca(
          nombre,
          user.uid,
          user.displayName ?? user.email ?? "Yo",
          user.email ?? ""
        ).catch(() => {
          autoCreateAttempted.current = false;
        });
      }
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user || bibliotecas.length === 0) return;
    const exists = bibliotecas.some((b) => b.id === currentId);
    if (!exists) {
      const next = bibliotecas[0].id;
      setCurrentId(next);
      window.localStorage.setItem(storageKey(user.uid), next);
    }
  }, [bibliotecas, currentId, user]);

  const bibliotecaActual = bibliotecas.find((b) => b.id === currentId) ?? null;

  const value = useMemo<BibliotecaContextValue>(
    () => ({
      bibliotecas,
      bibliotecaActual,
      loading,
      seleccionarBiblioteca(id: string) {
        setCurrentId(id);
        if (user) window.localStorage.setItem(storageKey(user.uid), id);
      },
      async crearYSeleccionar(nombre: string) {
        if (!user) return;
        const id = await crearBiblioteca(
          nombre,
          user.uid,
          user.displayName ?? user.email ?? "Yo",
          user.email ?? ""
        );
        setCurrentId(id);
        window.localStorage.setItem(storageKey(user.uid), id);
      },
    }),
    [bibliotecas, bibliotecaActual, loading, user]
  );

  return (
    <BibliotecaContext.Provider value={value}>{children}</BibliotecaContext.Provider>
  );
}

export function useBiblioteca() {
  const ctx = useContext(BibliotecaContext);
  if (!ctx) {
    throw new Error("useBiblioteca debe usarse dentro de <BibliotecaProvider>");
  }
  return ctx;
}
