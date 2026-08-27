import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { getSiteUrl } from "@/lib/site-url";
import { logError } from "@/lib/log";

// firebase-admin y resend requieren el runtime Node (no Edge). En Vercel, si
// no se fuerza, el handler puede caer en Edge y el módulo muere al importar
// → 500 HTML en vez de nuestra respuesta JSON.
export const runtime = "nodejs";

interface InvitarBody {
  email: string;
  bibliotecaId: string;
}

function esEmailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Falta autenticación." }, { status: 401 });
  }

  let adminAuth;
  try {
    adminAuth = getAdminAuth();
  } catch (err) {
    logError("Firebase Admin no está configurado:", err);
    return NextResponse.json(
      { error: "Firebase Admin no está configurado en el servidor." },
      { status: 500 }
    );
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token inválido o expirado." }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json(
      { error: "Falta configurar RESEND_API_KEY en el servidor." },
      { status: 500 }
    );
  }

  let body: InvitarBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const { email, bibliotecaId } = body;
  if (!email || !esEmailValido(email) || !bibliotecaId) {
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
  }

  const bibliotecaSnap = await getAdminDb().collection("Bibliotecas").doc(bibliotecaId).get();
  if (!bibliotecaSnap.exists) {
    return NextResponse.json({ error: "Biblioteca inexistente." }, { status: 404 });
  }
  const biblioteca = bibliotecaSnap.data()!;
  if (!(biblioteca.miembrosUids as string[] | undefined)?.includes(uid)) {
    return NextResponse.json(
      { error: "No sos miembro de esa biblioteca." },
      { status: 403 }
    );
  }

  const bibliotecaNombre = (biblioteca.nombre as string) ?? "una biblioteca";
  const invitadaPorNombre =
    (biblioteca.nombresMiembros as Record<string, string> | undefined)?.[uid] ??
    (biblioteca.emailsMiembros as Record<string, string> | undefined)?.[uid] ??
    "Alguien";

  const siteUrl = getSiteUrl();
  const from = process.env.RESEND_FROM_EMAIL ?? "Cittadella <onboarding@resend.dev>";

  const resend = new Resend(resendKey);

  try {
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: `${invitadaPorNombre} te invitó a "${bibliotecaNombre}" en Cittadella`,
      html: `
        <div style="font-family: Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #222;">
          <h2 style="margin-bottom: 4px;">📚 Cittadella</h2>
          <p style="color: #555; margin-top: 0;">Catálogo compartido de biblioteca</p>
          <p><strong>${invitadaPorNombre}</strong> te invitó a formar parte de la biblioteca
          <strong>${bibliotecaNombre}</strong>.</p>
          <p>Entrá con este mismo correo (<strong>${email}</strong>) usando Google o el link
          de acceso por email, y vas a unirte automáticamente.</p>
          <p style="margin: 28px 0;">
            <a href="${siteUrl}/login"
               style="background:#171717; color:#fff; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:600;">
              Ingresar a Cittadella
            </a>
          </p>
          <p style="color: #888; font-size: 12px;">Si no esperabas esta invitación, podés ignorar este correo.</p>
        </div>
      `,
    });

    if (error) {
      logError("Error de Resend enviando invitación:", error);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("Error inesperado enviando invitación:", err);
    return NextResponse.json(
      { error: "No pudimos enviar el email." },
      { status: 502 }
    );
  }
}
