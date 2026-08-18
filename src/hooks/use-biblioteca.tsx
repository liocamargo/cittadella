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
  const invitesAccepted = useRef(false);

  // Si el usuario todavía no tiene ninguna biblioteca (cuenta nueva, o
  // ninguna invitación resuelta todavía), no creamos nada sola: el
  // OnboardingWizard le pregunta nombre/idioma/géneros y crea la primera
  // biblioteca recién cuando termina ese flujo (ver crearYSeleccionar).
  useEffect(() => {
    if (!user) {
      setBibliotecas([]);
      setCurrentId(null);
      setLoading(true);
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
