import {
  Body,
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
import { LockKeyhole } from "lucide-react";

interface CoopvaliliLoginOtpEmailProps {
  userFirstname?: string;
  code: string;
  expiresInMinutes: number;
}

const mainFontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const CoopvaliliLoginOtpEmail = ({
  userFirstname,
  code,
  expiresInMinutes,
}: CoopvaliliLoginOtpEmailProps) => (
  <Html>
    <Head />
    <Tailwind config={tailwindConfig}>
      <Body
        style={{ fontFamily: mainFontFamily }}
        className="bg-white text-[#333333]"
      >
        <Preview>Tu código de verificación de WANT N' GET</Preview>
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
            Tu código de verificación
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
            Recibimos un intento de inicio de sesión en tu cuenta de WANT N'
            GET - COOPVALILI. Usa el siguiente código para continuar:
          </Text>

          {/* Código */}
          <Section className="text-center mt-4 mb-2">
            <Text
              className="bg-[#F5F5F5] rounded-[6px] text-[#1A1A1A] text-[36px] font-bold tracking-[10px] text-center inline-block py-[16px] px-[28px] m-0"
              style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
            >
              {code}
            </Text>
          </Section>

          <Text className="text-[13px] text-[#888888] text-center mt-2 mb-6">
            Este código expira en {expiresInMinutes} minutos.
          </Text>

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
                <LockKeyhole size={16} color="#777777" />
              </span>
              <span style={{ verticalAlign: "middle" }}>
                Por tu seguridad, no reenvíes este correo ni compartas este
                código con nadie.
              </span>
            </Text>
          </Section>

          {/* Divider */}
          <Hr className="border-[#E5E5E5] my-6" />

          {/* Footer */}
          <Section className="text-center">
            <Text className="text-[12px] leading-[18px] text-[#999999] mb-4">
              Este correo fue enviado por <strong>WANT N' GET</strong>, Bogotá
              - Colombia. Si no intentaste iniciar sesión, ignora este
              mensaje.
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

CoopvaliliLoginOtpEmail.PreviewProps = {
  userFirstname: "Alan",
  code: "482913",
  expiresInMinutes: 10,
} as CoopvaliliLoginOtpEmailProps;

export default CoopvaliliLoginOtpEmail;
