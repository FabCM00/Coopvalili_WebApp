import { EmailClient } from "@azure/communication-email";
import { render } from "@react-email/components";
import * as React from "react";
import WantPasswordRecoveryEmail from "@/emails/coopvalili-password-reset";
import CoopvaliliInvitationEmail from "@/emails/coopvalili-invitation";

const CONNECTION_STRING = process.env.AZURE_EMAIL_CONNECTION_STRING!;
const FROM_EMAIL = process.env.EMAIL_FROM!;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

function emailClient() {
  return new EmailClient(CONNECTION_STRING);
}

async function send(to: string, subject: string, html: string) {
  const poller = await emailClient().beginSend({
    senderAddress: FROM_EMAIL,
    content: { subject, html },
    recipients: { to: [{ address: to }] },
  });
  await poller.pollUntilDone();
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  userFirstname?: string,
): Promise<void> {
  const html = await render(
    React.createElement(WantPasswordRecoveryEmail, {
      resetPasswordLink: `${APP_URL}/set-password?token=${token}`,
      userFirstname,
    }),
  );
  await send(to, "Recuperación de contraseña — WANT TECH 4 ALL", html);
}

export async function sendInvitationEmail(
  to: string,
  token: string,
  invitedByName?: string,
): Promise<void> {
  const html = await render(
    React.createElement(CoopvaliliInvitationEmail, {
      acceptInvitationLink: `${APP_URL}/set-password?token=${token}&type=invite`,
      inviterName: invitedByName ?? "Un administrador",
      organizationName: "WANT N' GET",
    }),
  );
  await send(to, "Invitación de acceso — WANT TECH 4 ALL", html);
}
