import type { NextConfig } from "next";

const securityHeaders = [
  // Evita clickjacking — ningún iframe externo puede incrustar el portal
  { key: "X-Frame-Options", value: "DENY" },
  // Impide que el navegador adivine el MIME type (protege contra XSS vía uploads)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limita la información del referrer que sale del portal
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Fuerza HTTPS durante 1 año (solo eficaz en producción con TLS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Restringe acceso a APIs del navegador que el portal no necesita
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Protección XSS legacy para navegadores que no soporten CSP
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Evita que el portal sea servido dentro de frames/objects
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_URL_PREFIX || "",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
