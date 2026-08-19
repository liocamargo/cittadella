"use client";

import {
  GoogleAuthProvider,
  type User,
  deleteUser,
  isSignInWithEmailLink,
  onAuthStateChanged,
  reauthenticateWithPopup,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth } from "@/lib/firebase/client";
import { normalizarSiteUrl } from "@/lib/site-url";

const EMAIL_FOR_SIGN_IN_KEY = "cittadella:emailForSignIn";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  sendLoginLink: (email: string) => Promise<void>;
  isEmailSignInLink: (url: string) => boolean;
  completeEmailLinkSignIn: (url: string, email?: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  /** Borra el usuario de Firebase Auth. Si el login no es reciente, intenta
   *  reautenticar (Google) y reintenta una vez; si no puede, tira
   *  Error("NEEDS_RELOGIN") para que quien llama pida volver a iniciar sesión. */
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signInWithGoogle() {
        await signInWithPopup(auth, new GoogleAuthProvider());
      },
      async sendLoginLink(email: string) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
          ? normalizarSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
          : window.location.origin;
        await sendSignInLinkToEmail(auth, email, {
          url: `${siteUrl}/login`,
          handleCodeInApp: true,
        });
        window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);
      },
      isEmailSignInLink(url: string) {
        return isSignInWithEmailLink(auth, url);
      },
      async completeEmailLinkSignIn(url: string, email?: string) {
        const storedEmail =
          email ?? window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
        if (!storedEmail) {
          throw new Error("NEEDS_EMAIL");
        }
        await signInWithEmailLink(auth, storedEmail, url);
        window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
      },
      async signOutUser() {
        await signOut(auth);
      },
      async deleteAccount() {
        const current = auth.currentUser;
        if (!current) return;
        try {
          await deleteUser(current);
        } catch (err) {
          const code = (err as { code?: string })?.code;
          if (code !== "auth/requires-recent-login") throw err;

          const esGoogle = current.providerData.some(
            (p) => p.providerId === "google.com"
          );
          if (!esGoogle) throw new Error("NEEDS_RELOGIN");

          await reauthenticateWithPopup(current, new GoogleAuthProvider());
          await deleteUser(current);
        }
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
