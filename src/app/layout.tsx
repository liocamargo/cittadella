import type { Metadata } from "next";
import { Fraunces, Inter, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/hooks/use-auth";
import { LocaleProvider } from "@/hooks/use-locale";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-heading-family",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cittadella — Organizá tu biblioteca personal y compartila",
    template: "%s | Cittadella",
  },
  description:
    "Catalogá tus libros escaneando el ISBN, controlá a quién le prestaste cada uno y compartí tu biblioteca con tu familia en tiempo real. Gratis para empezar.",
  applicationName: "Cittadella",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Cittadella",
    title: "Cittadella — Organizá tu biblioteca personal y compartila",
    description:
      "Catalogá tus libros escaneando el ISBN, controlá a quién le prestaste cada uno y compartí tu biblioteca con tu familia en tiempo real.",
    images: [{ url: "/logo.png", width: 688, height: 190, alt: "Cittadella" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cittadella — Organizá tu biblioteca personal y compartila",
    description:
      "Catalogá tus libros escaneando el ISBN, controlá a quién le prestaste cada uno y compartí tu biblioteca con tu familia en tiempo real.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <LocaleProvider>
            {children}
            <Toaster position="top-right" />
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
