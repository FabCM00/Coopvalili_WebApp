import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";
import tailwindConfig from "./tailwind.config";
import { Lock, LockKeyhole } from "lucide-react";

interface CoopvaliliInvitationEmailProps {
  userFirstname?: string;
  inviterName: string;
  organizationName: string;
  acceptInvitationLink: string;
}

const mainFontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const CoopvaliliInvitationEmail = ({
  userFirstname,
  inviterName = "Alguien",
  organizationName = "WANT N' GET",
  acceptInvitationLink,
}: CoopvaliliInvitationEmailProps) => (
  <Html>
    <Head />
    <Tailwind config={tailwindConfig}>
      <Body
        style={{ fontFamily: mainFontFamily }}
        className="bg-white text-[#333333]"
      >
        <Preview>
          Únete a {organizationName} en WANT N' GET
        </Preview>
        <Container className="mx-auto py-10 px-5 max-w-[600px]">
          {/* Logo */}
          <Section className="mb-8 text-left">
            <Img
              src="https://i.imgur.com/kBwQizJ.jpg"
              height="40"
              alt="WANT N' GET"
              className="inline-block"
            />
          </Section>

          {/* Título */}
          <Text className="text-[24px] font-normal text-[#1A1A1A] mb-4">
            Has sido invitado a WANT N' GET
          </Text>

          {/* Saludo y texto principal */}
          <Text className="text-[15px] leading-[24px] text-[#555555] mb-6">
            {userFirstname && <span>Hola {userFirstname},<br /><br /></span>}
            <strong>{inviterName}</strong> te ha invitado a unirte a su equipo en la organización <strong>{organizationName}</strong> dentro de nuestra plataforma. Para aceptar la invitación y comenzar a colaborar, haz clic en el botón de abajo:
          </Text>

          {/* Botón */}
          <Section className="text-center mt-4 mb-2">
            <Button
              style={{ fontFamily: mainFontFamily }}
              className="bg-[#E89A2E] rounded-[6px] text-white text-[15px] font-bold no-underline text-center inline-block py-[12px] px-[24px]"
              href={acceptInvitationLink}
            >
              Aceptar invitación
            </Button>
          </Section>

          {/* Enlace alternativo */}
          <Section className="text-center mt-0">
            <Text className="text-[13px] text-[#888888] mb-1">
              O utiliza el enlace a continuación:
            </Text>
            <Link
              href={acceptInvitationLink}
              className="text-[13px] text-[#2864FF] underline break-all block px-4"
            >
              {acceptInvitationLink}
            </Link>
          </Section>

          {/* Aviso de seguridad */}
          <Section className="text-center mt-4 mb-6">
            <Text className="text-[13px] text-[#777777] font-medium inline-block m-0">
              <span style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px", fontSize: "14px" }}>
                <LockKeyhole size={16} color="#777777" />
              </span>
              <span style={{ verticalAlign: "middle" }}>
                Por tu seguridad, no reenvíes este correo a otras personas.
              </span>
            </Text>
          </Section>

          {/* Divider */}
          <Hr className="border-[#E5E5E5] my-6" />

          {/* Footer */}
          <Section className="text-center">
            <Text className="text-[12px] leading-[18px] text-[#999999] mb-4">
              Este correo fue enviado por <strong>WANT N' GET</strong>,
              Bogotá - Colombia.
            </Text>
            <Text className="text-[12px] leading-[18px] text-[#999999]">
              <Link href="#" className="text-[#999999] underline decoration-[#cccccc]">Términos de uso</Link> &bull;{" "}
              <Link href="#" className="text-[#999999] underline decoration-[#cccccc]">LGPD</Link> &bull;{" "}
              <Link href="#" className="text-[#999999] underline decoration-[#cccccc]">Centro de confianza</Link> &bull;{" "}
              <Link href="#" className="text-[#999999] underline decoration-[#cccccc]">Contáctanos</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

CoopvaliliInvitationEmail.PreviewProps = {
  userFirstname: "Alan",
  inviterName: "Carlos Gómez",
  organizationName: "WANT N' GET S.A.S",
  acceptInvitationLink:
    "http://localhost:3000/accept-invitation?token=example123",
} as CoopvaliliInvitationEmailProps;

export default CoopvaliliInvitationEmail;
