import { NextResponse } from "next/server";
import { Resend } from "resend";

interface InvitarBody {
  email: string;
  bibliotecaNombre: string;
  invitadaPorNombre: string;
}

function esEmailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
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

  const { email, bibliotecaNombre, invitadaPorNombre } = body;
  if (!email || !esEmailValido(email) || !bibliotecaNombre) {
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const from = process.env.RESEND_FROM_EMAIL ?? "Cittadella <onboarding@resend.dev>";

  const resend = new Resend(apiKey);

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
      console.error("Error de Resend enviando invitación:", error);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error inesperado enviando invitación:", err);
    return NextResponse.json(
      { error: "No pudimos enviar el email." },
      { status: 502 }
    );
  }
}
