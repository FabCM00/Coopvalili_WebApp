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
import { Lock, LockKeyhole, LogOut } from "lucide-react";

interface WantPasswordRecoveryEmailProps {
  userFirstname?: string;
  resetPasswordLink: string;
}

const mainFontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const WantPasswordRecoveryEmail = ({
  userFirstname,
  resetPasswordLink,
}: WantPasswordRecoveryEmailProps) => (
  <Html>
    <Head />
    <Tailwind config={tailwindConfig}>
      <Body
        style={{ fontFamily: mainFontFamily }}
        className="bg-white text-[#333333]"
      >
        <Preview>
          Redefine tu contraseña de WANT N' GET
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
            Redefine tu contraseña de WANT N' GET - COOPVALILI
          </Text>

          {/* Saludo y texto principal */}
          <Text className="text-[15px] leading-[24px] text-[#555555] mb-6">
            {userFirstname && <span>Hola {userFirstname},<br /><br /></span>}
            Hemos recibido una solicitud para restablecer la contraseña vinculada a
            esta cuenta de WANT N' GET. Para continuar, haz clic en el botón de abajo:
          </Text>

          {/* Botón */}
          <Section className="text-center mt-4 mb-2">
            <Button
              style={{ fontFamily: mainFontFamily }}
              className="bg-[#E89A2E] rounded-[3px] text-white text-[14px] font-bold tracking-wider no-underline text-center inline-block p-4"
              href={resetPasswordLink}
            >
              Definir contraseña
            </Button>
          </Section>

          {/* Enlace alternativo */}
          <Section className="text-center mt-0">
            <Text className="text-[13px] text-[#888888] mb-1">
              O utiliza el enlace a continuación:
            </Text>
            <Link
              href={resetPasswordLink}
              className="text-[13px] text-[#2864FF] underline break-all block px-4"
            >
              {resetPasswordLink}
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
          
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

WantPasswordRecoveryEmail.PreviewProps = {
  userFirstname: "Alan",
  resetPasswordLink:
    "http://localhost:3000/set-password?token=2834d122-f07b-45e2-8afc-4c7276efd526",
} as WantPasswordRecoveryEmailProps;

export default WantPasswordRecoveryEmail;
