import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";
import tailwindConfig from "./tailwind.config";
import { ShieldAlert } from "lucide-react";

interface CoopvaliliNewLoginNoticeEmailProps {
  userFirstname?: string;
  when: string;
  ip: string;
  userAgent: string;
  forgotPasswordLink: string;
}

const mainFontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const CoopvaliliNewLoginNoticeEmail = ({
  userFirstname,
  when,
  ip,
  userAgent,
  forgotPasswordLink,
}: CoopvaliliNewLoginNoticeEmailProps) => (
  <Html>
    <Head />
    <Tailwind config={tailwindConfig}>
      <Body
        style={{ fontFamily: mainFontFamily }}
        className="bg-white text-[#333333]"
      >
        <Preview>Nuevo inicio de sesión detectado en tu cuenta</Preview>
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
            Se inició sesión en tu cuenta
          </Text>

          {/* Saludo y texto principal */}
          <Text className="text-[15px] leading-[24px] text-[#555555] mb-6">
            {userFirstname && (
              <span>
                Hola {userFirstname},
                <br />
                <br />
              </span>
            )}
            Detectamos un inicio de sesión exitoso en tu cuenta de WANT N'
            GET - COOPVALILI con los siguientes detalles:
          </Text>

          {/* Metadata */}
          <Section className="bg-[#F5F5F5] rounded-[6px] py-[16px] px-[20px] mb-6">
            <Text className="text-[13px] text-[#555555] m-0 mb-2">
              <strong>Fecha y hora:</strong> {when}
            </Text>
            <Text className="text-[13px] text-[#555555] m-0 mb-2">
              <strong>Dirección IP:</strong> {ip}
            </Text>
            <Text className="text-[13px] text-[#555555] m-0">
              <strong>Dispositivo:</strong> {userAgent}
            </Text>
          </Section>

          <Text className="text-[15px] leading-[24px] text-[#555555] mb-6">
            Si fuiste tú, no necesitas hacer nada más. Si no reconoces este
            acceso, cambia tu contraseña de inmediato:
          </Text>

          {/* Botón */}
          <Section className="text-center mt-4 mb-6">
            <Button
              style={{ fontFamily: mainFontFamily }}
              className="bg-[#E89A2E] rounded-[3px] text-white text-[14px] font-bold tracking-wider no-underline text-center inline-block p-4"
              href={forgotPasswordLink}
            >
              Cambiar mi contraseña
            </Button>
          </Section>

          {/* Aviso de seguridad */}
          <Section className="text-center mt-4 mb-6">
            <Text className="text-[13px] text-[#777777] font-medium inline-block m-0">
              <span
                style={{
                  display: "inline-block",
                  verticalAlign: "middle",
                  marginRight: "4px",
                  fontSize: "14px",
                }}
              >
                <ShieldAlert size={16} color="#777777" />
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
              Este correo fue enviado por <strong>WANT N' GET</strong>, Bogotá
              - Colombia.
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

CoopvaliliNewLoginNoticeEmail.PreviewProps = {
  userFirstname: "Alan",
  when: "24/07/2026, 08:15 p. m.",
  ip: "190.60.12.34",
  userAgent: "Chrome en Windows",
  forgotPasswordLink: "http://localhost:3000/forgot-password",
} as CoopvaliliNewLoginNoticeEmailProps;

export default CoopvaliliNewLoginNoticeEmail;
