# Cittadella

Biblioteca de libros en casa. Catálogo compartido de biblioteca personal:
escaneá tus libros, prestáselos a quien quieras y llevá el registro entre
varias personas en tiempo real.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui +
Firebase (Auth + Firestore).

## Fase 1 — Setup y Autenticación (completada)

- Scaffold de Next.js + Tailwind + shadcn/ui (preset `radix-nova`).
- Capa de Firebase cliente en `src/lib/firebase/client.ts`.
- `useAuth` / `AuthProvider` (`src/hooks/use-auth.tsx`) con:
  - Google Sign-In.
  - Ingreso por email vía **Email Link** (magic link nativo de Firebase Auth
    — no requiere backend propio; el usuario recibe un link, no un código).
- Pantalla de login (`/login`) y layout protegido con sidebar
  (`src/app/(app)/layout.tsx`) que redirige a `/login` si no hay sesión.
- Pantallas placeholder para Catálogo, Préstamos, Espacio compartido e
  Importar/Exportar — se conectan a datos reales en la Fase 2.
- `firestore.rules` v1: reglas de seguridad para `Libros_Globales`,
  `Bibliotecas` y `Libros_En_Biblioteca`.

## Setup local

1. Copiá `.env.local.example` a `.env.local` y completá con las credenciales
   de tu proyecto Firebase (Firebase Console → Project Settings → General →
   Tus apps → SDK setup and configuration).
2. En Firebase Console → Authentication → Sign-in method, habilitá:
   - **Google**
   - **Email/Password** → activá la opción "Email link (passwordless
     sign-in)"
3. En Firebase Console → Authentication → Settings → Authorized domains,
   agregá tu dominio de Vercel cuando lo tengas.
4. Creá una base de Firestore (modo producción) y pegá el contenido de
   `firestore.rules` en Firestore → Rules.
5. Instalá dependencias y corré el servidor de desarrollo:

   ```bash
   npm install
   npm run dev
   ```

6. Abrí [http://localhost:3000](http://localhost:3000).

## Carpetas

```
src/
  app/
    login/            pantalla de login
    (app)/             grupo de rutas protegidas (requieren sesión)
      catalogo/
      prestamos/
      espacio/
      importar/
  components/
    layout/            sidebar y navegación
    ui/                componentes shadcn/ui
  hooks/
    use-auth.tsx        AuthProvider + useAuth
  lib/
    firebase/client.ts   inicialización de Firebase (Auth + Firestore)
  types/
    index.ts             modelos de datos (Libro, Biblioteca, etc.)
firestore.rules          reglas de seguridad de Firestore
design/                   prototipo original (Pencil) y CSV de referencia — no es parte de la app
```

## Deploy en Vercel

1. Conectá el repo de GitHub en Vercel.
2. Cargá las mismas variables de `.env.local` como Environment Variables del
   proyecto en Vercel (Settings → Environment Variables).
3. Seteá `NEXT_PUBLIC_SITE_URL` al dominio real de Vercel una vez asignado.
