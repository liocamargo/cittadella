# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Overview

Cittadella: catálogo compartido de biblioteca personal (Next.js 15 App
Router + TypeScript + Tailwind v4 + shadcn/ui + Firebase). Varias personas
pueden compartir un inventario de libros físicos en tiempo real, escanear
ISBNs, gestionar préstamos, y —desde la Fase 1+2 de ebooks— subir
EPUB/PDF y sincronizar progreso de lectura con KOReader vía el protocolo
KOSync. `design/` es el prototipo original (Pencil) y CSVs de referencia —
no es parte de la app.

## Comandos

```bash
npm run dev              # servidor de desarrollo
npm run build             # build de producción (corre lint + type-check)
npm run lint               # ESLint (flat config, eslint-config-next)
npm test                    # vitest run (una vez)
npm run test:watch           # vitest en modo watch
npx vitest run <archivo>      # correr un solo archivo de test
npx vitest run -t "<nombre>"   # correr un test puntual por nombre
npm run firebase:rules:deploy   # deploy de firestore.rules + storage.rules
npm run backfill:obras            # script one-off (scripts/backfill-obras.mjs)
```

Requiere `.env.local` (copiar de `.env.local.example`) con credenciales de
Firebase — sin ellas, `src/lib/firebase/client.ts` tira excepción al
importarse (ver más abajo). `npx tsc --noEmit` para chequear tipos sin
buildear.

## Arquitectura

### Shell de la app y autenticación

`src/app/(app)/layout.tsx` es el guard: si `useAuth()` no tiene `user`,
redirige a `/login`. Adentro, `BibliotecaProvider`
(`src/hooks/use-biblioteca.tsx`) carga las bibliotecas del usuario y guarda
cuál está activa en `localStorage` (clave por uid). Si el usuario no tiene
ninguna biblioteca todavía (cuenta nueva o invitación sin resolver), se
muestra `OnboardingWizard` en vez del contenido normal — recién ahí se crea
la primera biblioteca. Casi todas las páginas de `(app)/` asumen que existe
`bibliotecaActual` y no manejan el caso `null` explícitamente porque el
layout ya se encargó de eso.

Login: Google y magic link por email nativos de Firebase Auth
(`src/hooks/use-auth.tsx`). Apple y Amazon (Amazon vía flujo OAuth propio +
Firebase custom token, `src/app/api/auth/amazon/*`) ya están implementados
pero **ocultos** detrás de `LOGIN_APPLE_HABILITADO` /
`LOGIN_AMAZON_HABILITADO` en `src/app/login/page.tsx` hasta tener las
cuentas de proveedor configuradas.

### Modelo de datos (Firestore)

Dos capas separadas, y es la distinción más importante del modelo:

- **Comunidad** (`Libros_Globales` indexado por ISBN, `Obras` que agrupa
  ediciones de un mismo libro por título+autor normalizados): lectura
  pública, escritura de cualquier usuario logueado, compartida entre TODAS
  las bibliotecas. `src/lib/firestore/libros.ts` tiene la lógica de
  normalización (`generarObraId`, claves canónicas sin acentos/puntuación)
  para agrupar ediciones distintas del mismo libro.
- **Biblioteca** (`Bibliotecas`, `Libros_En_Biblioteca`, `Socios`,
  `HistorialPrestamos`, `Ebooks`): privada, solo miembros. Nunca es de
  lectura pública ni siquiera con `catalogoPublico=true` — la página
  pública `/compartido/{id}` se sirve vía `/api/catalogo/[bibliotecaId]`
  (Admin SDK) que expone una proyección reducida, no el doc completo.

Colecciones personales por usuario (`MetasLectura`, `Lecturas`, `Deseos`,
`Perfiles`, `KosyncProgreso`) usan doc id `uid` o `${uid}_${isbn}` /
`${uid}_${document}` — casi nunca hace falta una query, se accede directo
por id.

Un archivo por colección en `src/lib/firestore/`, con el patrón
`listenX`/`crearX`/`actualizarX`/`eliminarX` (SDK cliente directo,
`onSnapshot` para tiempo real). `db` se inicializa con
`ignoreUndefinedProperties: true` (`src/lib/firebase/client.ts`), por eso
el código pasa `campo: valor || undefined` libremente en vez de
`deleteField()` al crear docs nuevos.

`firestore.rules`/`storage.rules` reflejan exactamente esta separación
comunidad/biblioteca (funciones `signedIn()`/`isMemberOf(bibliotecaId)`) —
al agregar una colección nueva, el patrón a copiar ya está ahí.

### Client SDK vs Admin SDK

- `src/lib/firebase/client.ts`: init **eager** (top-level), tira si faltan
  `NEXT_PUBLIC_FIREBASE_*`. Lo usa casi todo el código de UI.
- `src/lib/firebase/admin.ts`: init **lazy** (`getAdminAuth()`/`getAdminDb()`
  recién se llaman dentro de un Route Handler) a propósito, para que
  `next build` no falle si faltan `FIREBASE_ADMIN_*` en el entorno de build.

Las API routes (`src/app/api/`) existen solo cuando hace falta el Admin SDK
para bypassear `firestore.rules` (proyección pública, verificar
credenciales que no son un Firebase ID Token) o hablar con un servicio
externo server-side:

- `catalogo/[bibliotecaId]`: proyección pública segura del catálogo.
- `invitar`: verifica ID Token + membresía, manda el email de invitación
  (Resend).
- `kosync/*`: servidor compatible con el protocolo KOSync de KOReader —
  autentica por headers `x-auth-user`/`x-auth-key` (no por Firebase Auth),
  ver `src/lib/kosync/auth.ts`.
- `auth/amazon/*`: intercambio OAuth con Amazon + `createCustomToken`, ya
  que Amazon no es un proveedor nativo de Firebase Auth.

### Ebooks / KOSync

`Ebook.koreaderDigest` vincula un archivo subido con el `document` opaco
que KOReader manda al sincronizar progreso — Cittadella **no** reimplementa
el algoritmo `partialMD5` de KOReader (frágil de validar sin un dispositivo
real), así que el primer vínculo es manual: `src/components/inicio/
leyendo-ahora.tsx` muestra el progreso "sin vincular" con un selector para
elegir a qué ebook corresponde una única vez; después resuelve solo.

### Internacionalización

`src/i18n/dictionaries/{es,en,it,pt}.ts`, un objeto anidado por namespace
(`cuenta`, `catalogoAgregar`, `libroDetail`, etc.) con las mismas claves en
los 4 idiomas. `useLocale().t("namespace.clave", { variable })` resuelve
por path con interpolación `{variable}`; si falta la clave devuelve el path
tal cual (no rompe, pero se nota). Al agregar un string de UI hay que
tocar los 4 archivos — es fácil dejar claves muertas al refactorizar UI
(borrarlas de los 4 si ya no las usa ningún componente).

### Componentes reusables entre flujos

`BuscadorUnificado` (`src/components/catalogo/buscador-unificado.tsx`) es
el buscador de "agregar libro" (escaneo + ISBN + título en un solo campo,
cámara como ícono) compartido por `catalogo/agregar`, `deseos/agregar` y
`leidos/agregar` — usa las claves i18n de `catalogoAgregar.*` sin importar
en qué página se monta, a propósito, para no triplicar strings.

### Testing

`vitest.config.mts` inyecta variables de entorno de Firebase dummy
(`test.env`) porque cualquier módulo que importe algo de
`src/lib/firestore/*.ts` arrastra la inicialización eager de
`src/lib/firebase/client.ts`. Los tests de hoy solo cubren lógica pura
(normalización de autores/obras, ranking de selección semanal,
`estaVencido`) y un caso con `vi.mock` sobre `@/lib/firebase/admin`
(`src/lib/kosync/auth.test.ts`) — nada pega contra Firestore real ni usa el
emulador (no está configurado en `firebase.json`).
