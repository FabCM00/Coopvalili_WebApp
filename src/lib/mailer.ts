import { EmailClient } from "@azure/communication-email";

const client = new EmailClient(process.env.AZURE_EMAIL_CONNECTION_STRING!);

const FROM = process.env.EMAIL_FROM!;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");

export async function sendPasswordResetEmail(
  to: string,
  token: string,
): Promise<void> {
  const link = `${APP_URL}/set-password?token=${token}`;

  const emailMessage = {
    senderAddress: FROM,
    content: {
      subject: "Recuperación de contraseña — Coopvalili Want N' Get",
      html: buildEmail({
        title: "Recuperación de contraseña",
        body: "Recibimos una solicitud para restablecer tu contraseña. Este enlace expira en <strong>1 hora</strong>.",
        cta: "RESTABLECER CONTRASEÑA",
        link,
        footer: "Si no solicitaste este cambio, puedes ignorar este correo.",
      }),
    },
    recipients: {
      to: [{ address: to }],
    },
  };

  const poller = await client.beginSend(emailMessage);
  await poller.pollUntilDone();
}

export async function sendInvitationEmail(
  to: string,
  token: string,
  invitedByName?: string,
): Promise<void> {
  const link = `${APP_URL}/set-password?token=${token}&type=invite`;
  const body = invitedByName
    ? `<strong>${invitedByName}</strong> te ha invitado al Portal de Motores de Crédito de Want N' Get. La invitación expira en <strong>7 días</strong>.`
    : "Has sido invitado al Portal de Motores de Crédito de Want N' Get. La invitación expira en <strong>7 días</strong>.";

  const emailMessage = {
    senderAddress: FROM,
    content: {
      subject: "Invitación al Portal Coopvalili  Want N' Get",
      html: buildEmail({
        title: "Invitación al portal",
        body,
        cta: "CREAR MI CONTRASEÑA",
        link,
        footer: "Si no esperabas esta invitación, puedes ignorar este correo.",
      }),
    },
    recipients: {
      to: [{ address: to }],
    },
  };

  const poller = await client.beginSend(emailMessage);
  await poller.pollUntilDone();
}

// El template HTML se mantiene exactamente igual
function buildEmail(opts: {
  title: string;
  body: string;
  cta: string;
  link: string;
  footer: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;">
        <tr>
          <td style="background:#012340;padding:28px 40px;">
            <div style="color:#F29A2E;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;">WANT N&apos; GET</div>
            <div style="color:#ffffff;font-size:16px;font-weight:600;margin-top:4px;">Coopvalili de Motores de</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;font-size:22px;color:#012340;font-weight:700;">${opts.title}</h2>
            <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;">${opts.body}</p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="background:#F29A2E;">
                  <a href="${opts.link}"
                     style="display:inline-block;padding:14px 32px;color:#0D0D0D;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:1px;">
                    ${opts.cta}
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${opts.footer}</p>
            <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all;">
              Enlace directo: <a href="${opts.link}" style="color:#012340;">${opts.link}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              Correo generado automáticamente. No respondas a este mensaje.<br/>
              &copy; ${new Date().getFullYear()} Want N&apos; Get &middot; Portal Interno
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
