# Guía de referencia — patrones de esta sesión para replicar en otra webapp

Este documento resume, con código real y verificado del proyecto Coopvalili_WebApp, todo lo que se implementó en esta sesión: desde el sistema de colores/badges de estado hasta el 2FA por correo (OTP) completo. La idea es que sirva como checklist y fuente de copia/pega al llevar estos mismos patrones a otro proyecto Next.js.

Stack de referencia: Next.js 15 (App Router), NextAuth v5 beta (Credentials provider), Prisma 6 + PostgreSQL, Tailwind, React Hook Form + Zod, Azure Communication Services para email, React Email para plantillas.

---

## 1. Sistema de colores por estado (badges/dots/borders)

**Problema que resuelve:** cuando una entidad tiene varios estados posibles (aprobado, rechazado, en revisión, etc.), es fácil terminar con colores repetidos o poco distinguibles entre sí, y con el color del "punto indicador", el "badge" y el "borde de tarjeta" definidos en tres lugares distintos sin relación entre sí.

**Patrón:** centralizar TODO el color de cada estado en tres `Record<Estado, string>` (uno por elemento visual), en un único archivo (`lib/`), para que cambiar el color de un estado sea una sola edición.

```ts
// src/lib/<dominio>.ts

export const ESTADO_LABEL: Record<SolicitudEstado, string> = {
  valida_1: "Valida 1",
  no_valida_1: "No valida 1",
  val_identidad: "Val. identidad",
  no_val_identidad: "No val. identidad",
  fallo_servicios: "Fallo en servicios",
  no_viable: "No viable",
  aprobado: "Aprobado",
  revision: "Revisión",
};

// Color del punto/indicador pequeño (dot)
export const ESTADO_DOT: Record<SolicitudEstado, string> = {
  valida_1: "bg-teal-500",
  no_valida_1: "bg-pink-500",
  val_identidad: "bg-indigo-500",
  no_val_identidad: "bg-yellow-600",
  fallo_servicios: "bg-red-600",
  no_viable: "bg-orange-500",
  aprobado: "bg-emerald-500",
  revision: "bg-amber-500",
};

// Fondo + texto + borde del badge/chip
export const ESTADO_BADGE: Record<SolicitudEstado, string> = {
  valida_1: "bg-teal-50 text-teal-700 border-teal-200",
  no_valida_1: "bg-pink-50 text-pink-700 border-pink-200",
  val_identidad: "bg-indigo-50 text-indigo-700 border-indigo-200",
  no_val_identidad: "bg-yellow-50 text-yellow-800 border-yellow-300",
  fallo_servicios: "bg-red-50 text-red-700 border-red-200",
  no_viable: "bg-orange-50 text-orange-700 border-orange-200",
  aprobado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  revision: "bg-amber-50 text-amber-700 border-amber-200",
};

// Borde izquierdo de fila/tarjeta (acento de color)
export const ESTADO_BORDER: Record<SolicitudEstado, string> = {
  valida_1: "border-l-teal-500",
  no_valida_1: "border-l-pink-500",
  val_identidad: "border-l-indigo-500",
  no_val_identidad: "border-l-yellow-600",
  fallo_servicios: "border-l-red-600",
  no_viable: "border-l-orange-500",
  aprobado: "border-l-emerald-500",
  revision: "border-l-amber-400",
};
```

**Reglas de diseño aplicadas al elegir estos colores** (útiles al adaptar a otro dominio):
- El estado "positivo final" (aprobado) siempre en verde (`emerald`).
- El estado más crítico/de error de sistema en rojo puro (`red-600`), reservado SOLO para ese caso.
- Otros estados "negativos" pero no críticos (rechazos de validación) usan tonos cercanos al rojo pero distintos (`pink`, `yellow-600`) para no confundirse visualmente con el error de sistema.
- Cada estado tiene un color de familia distinta (`teal`, `indigo`, `orange`, `amber`) para que a simple vista, sin leer el texto, se distingan.
- Uso: `<span className={ESTADO_BADGE[estado]}>{ESTADO_LABEL[estado]}</span>`.

---

## 2. Patrón de grid "label arriba, valor abajo" con líneas divisorias

**Problema que resuelve:** mostrar muchos pares label/valor (datos de un formulario, resumen de un registro) de forma más legible que una tabla de filas horizontales, inspirado en un layout de tarjeta que se veía bien en otra parte de la misma app.

**Patrón: `GridField` + `GridSection`**, con líneas divisorias logradas vía `gap-px` sobre fondo gris + celdas blancas (más robusto que bordes por posición porque no depende de contar cuántos elementos hay):

```tsx
// components: GridField (celda individual)
function GridField({
  label,
  value,
  mono,
  currency,
  highlight,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  currency?: boolean;
  highlight?: boolean;
}) {
  if (value === null || value === undefined || value === "") return null; // no renderiza campos vacíos
  const display = currency ? fmt(value) : String(value);
  return (
    <div className="min-w-0 bg-white px-4 py-3">
      <p className="text-[9px] font-bold tracking-wider uppercase text-[#0D0D0D]/40">
        {label}
      </p>
      <p
        className={`truncate text-sm ${highlight ? "font-bold text-[#012340]" : mono ? "font-mono text-[#0D0D0D]/70" : "font-medium text-[#0D0D0D]/85"}`}
      >
        {display}
      </p>
    </div>
  );
}

// GridSection: título de sección + tooltip opcional + grid de 2 columnas
function GridSection({
  title,
  tooltip,
  children,
}: {
  title: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  // React.Children.toArray ya filtra los null que retornan los GridField vacíos
  const fields = React.Children.toArray(children).filter(Boolean);
  const isOdd = fields.length % 2 === 1;
  return (
    <div className="border border-[#0D0D0D]/8 bg-white pt-4">
      <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/35 mb-3 px-4">
        {title}
        {tooltip && (
          <span title={tooltip} className="inline-flex flex-shrink-0">
            <Info className="h-3 w-3 text-[#0D0D0D]/30" />
          </span>
        )}
      </p>
      {/* gap-px + fondo gris del contenedor + celdas blancas = líneas divisorias
          verticales y horizontales sin depender de bordes por posición */}
      <div className="grid grid-cols-2 gap-px bg-[#0D0D0D]/8">
        {fields}
        {/* Si el número de campos es impar, rellena la celda vacía con blanco
            en vez de dejar que se vea el fondo gris del contenedor */}
        {isOdd && <div className="bg-white" />}
      </div>
    </div>
  );
}
```

Uso:

```tsx
<GridSection title="Solicitante" tooltip="Para más información revisa la pestaña de Datos JSON.">
  <GridField label="Edad" value={`${edad} años`} />
  <GridField label="Celular" value={celular} mono />
  <GridField label="Email" value={email} mono />
</GridSection>
```

**Por qué el relleno con `React.Children.toArray().filter(Boolean)` en vez de contar hijos directamente:** cada `GridField` puede retornar `null` si su valor está vacío (para no mostrar campos sin dato). Si se contara `children.length` a secas, se contaría también los `null`, dando un número de "campos visibles" incorrecto. `React.Children.toArray` ya excluye `null`/`undefined`/booleanos automáticamente.

**Para secciones con semántica de check/cumple-no-cumple** (ej. validaciones con ícono de check verde/X roja), usar un componente de fila normal en vez de este grid — el grid es para datos puramente informativos label→valor, no para estados de aprobación con iconografía.

---

## 3. Header de detalle con dos columnas (info + estado)

**Patrón:** un bloque reusable que separa "información de la entidad" (nombre, ID, fecha) a la izquierda de "estado actual" (badge) a la derecha, cada uno con su propio mini-título en mayúsculas:

```tsx
function SolicitanteHeader({ solicitud }: { solicitud: SolicitudUI }) {
  const badge = ESTADO_BADGE[solicitud.estado];
  const badgeLabel = ESTADO_LABEL[solicitud.estado];

  return (
    <div className="flex items-start justify-between gap-4 mb-1">
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/35 mb-2">
          Información del solicitante
        </p>
        <p className="text-sm font-semibold text-[#012340] truncate">
          {solicitud.solicitante}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#0D0D0D]/45 mt-1">
          <span><span className="opacity-60">CC</span> {solicitud.cedula}</span>
          <span className="opacity-30">•</span>
          <span>
            <span className="opacity-60">Radicado</span>{" "}
            <span className="font-mono">{solicitud.radicado}</span>
          </span>
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/35 mb-2">
          Estado de la solicitud
        </p>
        <span className={`text-[10px] font-bold px-2 py-0.5 border ${badge}`}>
          {badgeLabel}
        </span>
      </div>
    </div>
  );
}
```

**Lección de esta sesión sobre este componente:** originalmente este bloque vivía en la barra superior del modal (con un borde de color lateral tipo `border-l-4`), y se movió DENTRO del contenido del tab de resumen a pedido del usuario — dejando la barra superior solo con botones de acción (cerrar, marcar gestionado). Si replicas esto, decide desde el inicio si el "header de identidad" va pegado arriba del modal o es la primera sección de su contenido — ambos son válidos, pero cambiar de uno a otro después implica tocar dos componentes (el header del modal y el componente de contenido).

---

## 4. Pantalla de carga con logo + barra de progreso ("industrial loading")

**Patrón:** en vez de un spinner genérico, una pantalla con el logo de marca centrado y una barra de progreso indeterminada animada por CSS puro (sin librería):

```tsx
// src/components/LoadingScreen.tsx
export function LoadingScreen({ message = "Cargando...", fullScreen = true }) {
  return (
    <div className={`flex ${fullScreen ? "h-[100dvh]" : "h-full"} w-full flex-col items-center justify-center bg-white gap-10`}>
      <Image src="/logo.png" alt="Marca" width={140} height={42} className="h-10 w-auto object-contain" priority />

      <div className="flex flex-col items-center gap-4 w-48">
        <div className="relative h-[3px] w-full bg-[#0D0D0D]/8 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-brand-orange animate-[loading-bar_1.4s_ease-in-out_infinite]" />
        </div>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#0D0D0D]/40">{message}</p>
      </div>

      <style>{`
        @keyframes loading-bar {
          0%   { left: -60%; width: 60%; }
          50%  { left: 40%; width: 60%; }
          100% { left: 100%; width: 60%; }
        }
      `}</style>
    </div>
  );
}
```

**Uso 1 — durante la resolución de sesión/perfil** (ya existía en el proyecto):

```tsx
if (loading) return <LoadingScreen message="Cargando tu sesión..." />;
if (user && !profile) return <LoadingScreen message="Cargando tu perfil..." />;
```

**Uso 2 — durante la transición entre rutas del panel** (agregado en esta sesión, para que cambiar de página muestre brevemente el logo en vez de un salto brusco al contenido):

```tsx
// app/(protected)/layout.tsx
const ROUTE_TRANSITION_MS = 450;

const [navigating, setNavigating] = useState(false);
const previousPathname = useRef(pathname);

useEffect(() => {
  if (previousPathname.current === pathname) return;
  previousPathname.current = pathname;
  setNavigating(true);
  const timer = setTimeout(() => setNavigating(false), ROUTE_TRANSITION_MS);
  return () => clearTimeout(timer);
}, [pathname]);

// ...
<main className="relative flex-1 min-h-0 ...">
  {navigating && (
    <div className="absolute inset-0 z-20 bg-white">
      <LoadingScreen message="Cargando vista..." fullScreen={false} />
    </div>
  )}
  {children}
</main>
```

Este enfoque detecta el cambio de `pathname` con `usePathname()` y muestra el overlay por un tiempo mínimo fijo — es una solución client-side simple, útil cuando las páginas son `"use client"` con datos vía React Query (no Server Components con streaming nativo de Next.js, que tendría su propio `loading.tsx` automático).

---

## 5. Rediseño de sección "Documentos" (header + chips de estado + tarjetas)

Patrón para una vista de gestión de archivos con carpetas/categorías:

- **Header** con avatar circular (inicial del nombre) + fondo con degradado sutil:
  ```tsx
  <div className="flex items-center gap-3">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#012340] text-sm font-bold text-white">
      {solicitante?.trim()?.[0]?.toUpperCase() ?? "?"}
    </span>
    <div>...</div>
  </div>
  ```

- **Barra de resumen con chips en vez de texto plano**: el contador total como chip sólido de marca, y los contadores por estado como chips que reutilizan el color de `STATUS_CONFIG` (mismo patrón de la sección 1, pero aplicado a estados de documento en vez de estados de solicitud):
  ```tsx
  <span className="rounded-full bg-[#012340] px-3 py-1 text-[11px] font-semibold text-white">
    {docs.length} documento{docs.length === 1 ? "" : "s"}
  </span>
  {STATUS_OPTIONS.filter((s) => counts[s] > 0).map((s) => (
    <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_CONFIG[s].badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
      {counts[s]} {STAT_LABEL[s]}
    </span>
  ))}
  ```

- **Secciones de carpeta** con ícono en contenedor cuadrado + contador en badge:
  ```tsx
  <div className="mb-3 flex items-center gap-2 border-b border-[#0D0D0D]/6 pb-2">
    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#012340]/8">
      <Folder className="h-3.5 w-3.5 text-[#012340]" />
    </span>
    <h4 className="text-sm font-semibold text-[#012340]">{group.label}</h4>
    <span className="rounded-full bg-[#0D0D0D]/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-[#0D0D0D]/45">
      {group.docs.length}
    </span>
  </div>
  ```

- **Tarjetas de documento** con thumbnail más grande, sombra sutil que se intensifica y eleva levemente al hover:
  ```tsx
  <li className="flex items-center gap-3.5 rounded-xl border border-[#0D0D0D]/10 bg-white px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#012340]/25 hover:shadow-md">
  ```

---

## 6. Mejoras al editor de JSON embebido (Monaco)

Si usas `@monaco-editor/react` para mostrar respuestas JSON crudas de una API, estas opciones mejoran mucho la legibilidad por defecto:

```tsx
<Editor
  language="json"
  value={formatted}
  theme="light"
  options={{
    readOnly: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 13,              // subir de 10 a 13+ es notable
    lineHeight: 22,
    fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
    wordWrap: "on",
    renderLineHighlight: "line",
    lineNumbersMinChars: 4,
    folding: true,
    padding: { top: 20, bottom: 20 },
    contextmenu: false,
    bracketPairColorization: { enabled: true },  // colorea pares de { } [ ]
    guides: { indentation: true, bracketPairs: true },
    renderWhitespace: "none",
  }}
/>
```

Y si hay una barra de sub-tabs para elegir qué JSON ver (ej. distintas fuentes de datos), centrarla en vez de dejarla pegada a la izquierda:

```tsx
<div className="flex-shrink-0 border-b border-slate-200 bg-white overflow-x-auto">
  <div className="flex min-w-max justify-center mx-auto">
    {/* tabs */}
  </div>
</div>
```

---

## 7. 2FA por código OTP al correo — la pieza más grande de esta sesión

### 7.1. Modelo de datos

```prisma
model LoginOtp {
  id        String   @id @default(cuid())
  userId    String
  codeHash  String   // bcrypt del código de 6 dígitos — NUNCA texto plano
  expiresAt DateTime @db.Timestamptz(6)
  used      Boolean  @default(false)
  attempts  Int      @default(0)  // tope de intentos por código, anti-brute-force
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "fk_login_otp_user")

  @@index([userId], map: "idx_login_otp_userid")
}

model User {
  // ...
  loginOtps LoginOtp[]
}
```

**Por qué `codeHash` y no `code` en texto plano:** un código de 6 dígitos solo tiene 1,000,000 de combinaciones. Si la base de datos se filtrara, un código en texto plano sería trivialmente reutilizable dentro de su ventana de expiración. Se hashea con bcrypt costo 10 (no 12 como las contraseñas — el costo extra de CPU no aporta seguridad real aquí, la protección real es el rate limiting y la expiración corta).

**Por qué `attempts`:** protege contra que alguien, sabiendo o adivinando aproximadamente el código, lo intente muchas veces dentro de su ventana de validez rotando de IP (evadiendo el rate limit por IP). Se incrementa en cada intento fallido dentro de `authorize()` y se trata como inválido al alcanzar el tope (`MAX_OTP_ATTEMPTS = 5`).

### 7.2. Generador de código y constantes

```ts
// src/lib/tokens.ts
import { randomBytes, randomInt } from "crypto";

/** Código numérico de 6 dígitos, zero-padded. Usa crypto.randomInt (NO Math.random). */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function expiresIn(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export const TOKEN_EXPIRY = {
  RESET_PASSWORD_MIN: 60,
  INVITATION_MIN: 7 * 24 * 60,
  LOGIN_OTP_MIN: 10,
} as const;

export const MAX_OTP_ATTEMPTS = 5;
```

`Math.random()` NUNCA debe usarse para generar códigos de seguridad — no es criptográficamente seguro (es predecible). `crypto.randomInt` sí lo es.

### 7.3. Endpoint que envía el código — `POST /api/auth/send-otp`

Este es el endpoint que el cliente llama DESPUÉS de que el usuario escribe su contraseña, y ANTES de mostrarle la pantalla de ingreso del código.

```ts
// src/app/api/auth/send-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { generateOtpCode, expiresIn, TOKEN_EXPIRY } from "@/lib/tokens";
import { sendLoginOtpEmail } from "@/lib/mailer";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // 3 intentos por minuto por IP
  if (await isRateLimited(`otp-send:${ip}`, 3, 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: "Demasiados intentos. Espera un minuto." },
      { status: 429 },
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Correo o contraseña incorrectos." },
      { status: 401 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();

  // Límite ADICIONAL por email (no solo por IP): evita que alguien con la
  // contraseña correcta pero rotando IPs bombardee de correos a un usuario.
  if (await isRateLimited(`otp-send-email:${email}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: "Demasiados intentos para este correo." },
      { status: 429 },
    );
  }

  try {
    const user = await withPrismaRetry(() =>
      prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, active: true, passwordHash: true },
      }),
    );

    if (!user?.passwordHash) {
      return NextResponse.json(
        { ok: false, message: "Correo o contraseña incorrectos." },
        { status: 401 },
      );
    }
    if (!user.active) {
      return NextResponse.json(
        { ok: false, message: "Tu cuenta ha sido desactivada. Contacta al administrador." },
        { status: 403 },
      );
    }

    const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!passwordOk) {
      return NextResponse.json(
        { ok: false, message: "Correo o contraseña incorrectos." },
        { status: 401 },
      );
    }

    // Invalida códigos anteriores no usados del mismo usuario
    await withPrismaRetry(() =>
      prisma.loginOtp.updateMany({ where: { userId: user.id, used: false }, data: { used: true } }),
    );

    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);

    await withPrismaRetry(() =>
      prisma.loginOtp.create({
        data: { userId: user.id, codeHash, expiresAt: expiresIn(TOKEN_EXPIRY.LOGIN_OTP_MIN) },
      }),
    );

    sendLoginOtpEmail(email, code, user.name ?? undefined).catch(console.error);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-otp]", err);
    return NextResponse.json(
      { ok: false, message: "No se pudo enviar el código. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
```

> **Decisión de diseño consciente, tomada explícitamente por el usuario en esta sesión (NO es el default recomendado):**
> Este endpoint SÍ revela si la contraseña es correcta (responde 401 con mensaje específico si está mal). El diseño original recomendado — y el que se usa en `forgot-password` de este mismo proyecto — es que el endpoint SIEMPRE responda `{ ok: true }` sin importar si el email/contraseña son válidos, para que nadie pueda usarlo como oráculo para adivinar contraseñas o confirmar qué correos existen en el sistema (protección anti-enumeración).
>
> El usuario decidió priorizar la experiencia de usuario (ver el error de contraseña de inmediato, sin tener que llegar a la pantalla de código para descubrir que estaba mal) sobre esa protección. **Si replicas esto en otro proyecto, decide conscientemente cuál de las dos posturas quieres**:
> - **Anti-enumeración (más seguro):** el endpoint siempre responde `ok: true`; el error real de contraseña solo se descubre en el submit final (dentro de `authorize()`).
> - **UX inmediata (lo que se implementó aquí):** el endpoint valida y responde el error real de inmediato, a cambio de que alguien pueda usarlo para probar contraseñas contra un email conocido (aunque nunca vea el código en sí, porque solo llega por correo).

### 7.4. Verificación del código dentro de `authorize()`

La decisión de arquitectura clave: el código OTP se verifica **dentro de `authorize()`** de NextAuth, como un tercer campo de credenciales, en la MISMA llamada final a `signIn()` que ya lleva email+password. No hay un endpoint `verify-otp` separado.

**Por qué ahí y no en un endpoint aparte con un "nonce firmado":** `authorize()` de todas formas tiene que re-verificar la contraseña de forma independiente (nunca puede confiar ciegamente en el cliente), así que verificar el OTP en el mismo lugar no cuesta nada extra, y evita agregar una dependencia nueva de firma de tokens (`jose`) más una segunda ventana de "es esto válido" que mantener sincronizada.

```ts
// auth.ts
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { isRateLimited } from "@/lib/rate-limit";
import { MAX_OTP_ATTEMPTS } from "@/lib/tokens";
import { sendNewLoginNotificationEmail } from "@/lib/mailer";
import { authConfig } from "./auth.config";

class InactiveAccountError extends CredentialsSignin { code = "InactiveAccount"; }
class OtpRequiredError extends CredentialsSignin { code = "OtpRequired"; }
class InvalidOtpError extends CredentialsSignin { code = "InvalidOtp"; }

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  otp: z.string().length(6).regex(/^\d{6}$/),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
        otp: { label: "Código", type: "text" },
      },
      async authorize(credentials, request) {
        // El segundo parámetro `request: Request` SÍ existe en la firma
        // oficial de NextAuth v5 Credentials provider — se usa para capturar
        // IP/User-Agent para el correo de aviso de login (ver 7.6).
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

        // Guard grueso sobre el submit completo (email+password+otp)
        if (await isRateLimited(`login-submit:${ip}`, 10, 60 * 1000)) return null;

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password, otp } = parsed.data;

        const user = await withPrismaRetry(() =>
          prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, email: true, name: true, image: true, passwordHash: true, role: true, active: true },
          }),
        );

        if (!user?.passwordHash) return null;
        if (!user.active) throw new InactiveAccountError();

        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) return null;

        // A partir de acá, la contraseña YA fue confirmada correcta.
        const otpRow = await withPrismaRetry(() =>
          prisma.loginOtp.findFirst({ where: { userId: user.id, used: false }, orderBy: { createdAt: "desc" } }),
        );

        if (!otpRow) throw new OtpRequiredError();

        if (otpRow.expiresAt < new Date()) {
          await withPrismaRetry(() => prisma.loginOtp.update({ where: { id: otpRow.id }, data: { used: true } }));
          throw new InvalidOtpError();
        }

        if (otpRow.attempts >= MAX_OTP_ATTEMPTS) throw new InvalidOtpError();

        const otpOk = await bcrypt.compare(otp, otpRow.codeHash);
        if (!otpOk) {
          await withPrismaRetry(() =>
            prisma.loginOtp.update({ where: { id: otpRow.id }, data: { attempts: { increment: 1 } } }),
          );
          throw new InvalidOtpError();
        }

        await withPrismaRetry(() => prisma.loginOtp.update({ where: { id: otpRow.id }, data: { used: true } }));

        const userAgent = request.headers.get("user-agent") ?? "unknown";

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role === "ADMIN" ? "admin" : "user",
          // Campos transitorios: solo para pasar IP/user-agent al callback
          // jwt() dentro del MISMO ciclo de request. Se leen y se descartan
          // ahí, NUNCA se persisten en el token/cookie.
          __loginIp: ip,
          __loginUserAgent: userAgent,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks, // ver 7.5, esto es crítico
    async jwt({ token, user, ...rest }) {
      const base = await authConfig.callbacks.jwt({ token, user, ...rest });
      if (user) {
        const u = user as { email?: string | null; name?: string | null; __loginIp?: string; __loginUserAgent?: string };
        if (u.email) {
          sendNewLoginNotificationEmail(
            u.email,
            { ip: u.__loginIp ?? "unknown", userAgent: u.__loginUserAgent ?? "unknown" },
            u.name ?? undefined,
          ).catch(console.error);
        }
      }
      return base;
    },
  },
});
```

### 7.5. La trampa a evitar: componer `callbacks`, no reemplazarlos

Si tu proyecto separa la config en dos archivos como este (uno Edge-safe compartido con `middleware.ts`, y otro completo con Prisma/bcrypt para el sign-in), **ten mucho cuidado al agregar un callback nuevo**:

```ts
// auth.config.ts — Edge-safe, compartido con middleware.ts
export const authConfig = {
  // ...
  callbacks: {
    authorized({ auth, request }) { /* guarda de rutas por rol */ },
    jwt({ token, user }) { /* codifica role/id en el token */ },
    session({ session, token }) { /* expone role/id a useSession() */ },
  },
  providers: [],
} satisfies NextAuthConfig;
```

Si en `auth.ts` (el config completo) haces `NextAuth({ ...authConfig, callbacks: { jwt(...) {...} } })` — con una clave `callbacks` nueva a secas — el spread superficial de objetos **reemplaza por completo** el objeto `callbacks` de `authConfig`, perdiendo silenciosamente `authorized()` (el guard de rutas por rol) y `session()` (lo que expone `role`/`id` al frontend). Esto rompería la protección de rutas admin/usuario sin ningún error visible en consola — solo se notaría porque de repente cualquiera podría entrar a rutas que no le corresponden.

**La forma correcta es siempre componer explícitamente:**
```ts
callbacks: {
  ...authConfig.callbacks,   // preserva authorized() y session() intactos
  async jwt({ token, user, ...rest }) {
    const base = await authConfig.callbacks.jwt({ token, user, ...rest }); // llama al original
    // ... tu lógica extra ...
    return base;
  },
},
```

### 7.6. Correo de aviso de nuevo login — por qué va en `jwt()` de `auth.ts`, no en `auth.config.ts`

- **NO puede vivir en `auth.config.ts`** porque ese archivo debe seguir siendo 100% Edge Runtime compatible (lo usa `middleware.ts` directamente). Importar ahí una función que a su vez importa Prisma o un SDK de email de Node rompería la compatibilidad Edge de todo el middleware.
- **Debe vivir en `auth.ts`** (el config completo, Node runtime), específicamente en `jwt()`, porque ese callback solo recibe el parámetro `user` poblado UNA VEZ: justo en la llamada inmediatamente posterior a que `authorize()` retorna con éxito. En cualquier otra llamada (refresco de token en cada request), `user` viene `undefined`. Es el punto de "esto pasó una sola vez, al iniciar sesión" — a diferencia de `session()`, que se ejecuta en CADA `useSession()`/`auth()` (o sea, en cada carga de página), y usarlo ahí mandaría un correo por cada page load, no por cada login.

### 7.7. Endpoint de plantilla `/api/auth/account-status` (patrón de desambiguación reutilizado)

Este proyecto ya tenía este patrón para el caso "cuenta desactivada" antes de la sesión de OTP, y es útil como referencia si tu versión de NextAuth tiene la misma limitación (ver 7.8):

```ts
// src/app/api/auth/account-status/route.ts
export async function POST(req: NextRequest) {
  // ... parseo con zod ...
  const user = await withPrismaRetry(() =>
    prisma.user.findUnique({ where: { email }, select: { active: true, passwordHash: true } }),
  );
  // Solo informa "inactivo" si el usuario YA configuró contraseña pero fue desactivado
  // (para no revelar cuentas pendientes de invitación o inexistentes)
  const inactive = !!(user?.passwordHash && !user.active);
  return NextResponse.json({ inactive });
}
```

### 7.8. Limitación conocida de NextAuth v5 beta.31: los códigos de error no llegan confiables al cliente

Con `signIn("credentials", { ..., redirect: false })`, en esta versión beta, **todo error de `CredentialsSignin` (incluidas subclases custom con su propio `code`) colapsa al string genérico `"CredentialsSignin"`** en `result.error` del lado del cliente — el `code` real (`"InactiveAccount"`, `"OtpRequired"`, etc.) NO se propaga de forma confiable. Por eso:

- El caso "cuenta inactiva" se resuelve con una llamada EXTRA a `/api/auth/account-status` DESPUÉS de que `signIn()` falla, para desambiguar sin depender del `code`.
- Los mensajes de OTP incorrecto/expirado se mantienen genéricos en pantalla ("Código inválido o expirado. Solicita uno nuevo.") en vez de intentar diferenciar "incorrecto" de "expirado" — no hay forma confiable de saberlo en el cliente con esta versión de NextAuth.
- Aun así, se declaran las clases de error custom correctamente (`OtpRequiredError`, `InvalidOtpError` extendiendo `CredentialsSignin`) por buena práctica y por si una futura versión de NextAuth arregla la propagación.

### 7.9. Contexto de auth (cliente) — dividir `login()` en dos pasos

```ts
// src/contexts/AuthContext.tsx
interface RequestOtpResult { ok: boolean; message?: string; }

const requestOtp = useCallback(async (email: string, password: string): Promise<RequestOtpResult> => {
  setError(null);
  try {
    const res = await fetch(`/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, message: data.message ?? "Correo o contraseña incorrectos." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "No se pudo enviar el código. Intenta de nuevo." };
  }
}, []);

const login = useCallback(async (email: string, password: string, otp: string) => {
  setError(null);
  const result = await signIn("credentials", { email, password, otp, redirect: false });
  if (result?.error) {
    // ... desambiguación de cuenta inactiva vía account-status (ver 7.8) ...
    setError(traducirError(result.error));
    return;
  }
  router.push("/");
}, [router]);
```

### 7.10. Formulario de login — Step 3 (código OTP), reenviar con cooldown

Patrón para el formulario multi-step (React Hook Form + Zod, un solo `useForm()` compartido entre "pasos" que son distintos `<form>` renderizados condicionalmente — así los valores sobreviven entre pasos sin necesidad de estado externo):

```tsx
const RESEND_COOLDOWN_SECONDS = 30;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  otp: z.string().length(6, "Ingresa los 6 dígitos.").regex(/^\d{6}$/, "Solo números."),
});

const [step, setStep] = useState<1 | 2 | 3>(1);
const [resendCooldown, setResendCooldown] = useState(0);

// Countdown del cooldown de reenvío
useEffect(() => {
  if (resendCooldown <= 0) return;
  const timer = setInterval(() => setResendCooldown((v) => (v > 0 ? v - 1 : 0)), 1000);
  return () => clearInterval(timer);
}, [resendCooldown]);

const handleSendOtp = async () => {
  const valid = await trigger("password");
  if (!valid) return;
  const result = await requestOtp(email, password);
  if (!result.ok) {
    setError("password", { type: "server", message: result.message });
    return; // NO avanza de step si la contraseña estaba mal
  }
  setStep(3);
  setResendCooldown(RESEND_COOLDOWN_SECONDS);
};

const handleResendOtp = async () => {
  if (resendCooldown > 0) return;
  const result = await requestOtp(email, password);
  if (!result.ok) { setError("otp", { type: "server", message: result.message }); return; }
  setResendCooldown(RESEND_COOLDOWN_SECONDS);
};

const onSubmit = async (data) => {
  await login(data.email, data.password, data.otp);
};
```

```tsx
{/* Step 3 — input de 6 dígitos */}
<input
  id="otp"
  type="text"
  inputMode="numeric"
  maxLength={6}
  autoComplete="one-time-code"
  {...register("otp")}
  className="... tracking-[0.4em] font-mono ..."
/>

<button type="button" onClick={handleResendOtp} disabled={resendCooldown > 0}>
  {resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : "Reenviar código"}
</button>
```

### 7.11. Plantillas de correo

Con Azure Communication Services + React Email, el patrón de la app es: una función helper privada `send(to, subject, html)` que hace `render()` de un componente React Email y lo manda vía `EmailClient.beginSend(...).pollUntilDone()`. Cada tipo de correo es una función exportada que arma las props y llama a ese `send`:

```ts
// src/lib/mailer.tsx
async function send(to: string, subject: string, html: string) {
  const poller = await new EmailClient(CONNECTION_STRING).beginSend({
    senderAddress: FROM_EMAIL,
    content: { subject, html },
    recipients: { to: [{ address: to }] },
  });
  await poller.pollUntilDone();
}

export async function sendLoginOtpEmail(to: string, code: string, userFirstname?: string) {
  const html = await render(React.createElement(CoopvaliliLoginOtpEmail, {
    code, userFirstname, expiresInMinutes: TOKEN_EXPIRY.LOGIN_OTP_MIN,
  }));
  await send(to, "Tu código de verificación — MARCA", html);
}

export async function sendNewLoginNotificationEmail(to: string, meta: { ip: string; userAgent: string }, userFirstname?: string) {
  const html = await render(React.createElement(CoopvaliliNewLoginNoticeEmail, {
    userFirstname, ip: meta.ip, userAgent: meta.userAgent,
    when: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    forgotPasswordLink: `${APP_URL}/forgot-password`,
  }));
  await send(to, "Nuevo inicio de sesión detectado — MARCA", html);
}
```

**Plantilla del código OTP:** el elemento clave visual es mostrar el código grande, monoespaciado y con `tracking` amplio (porque se tipea, no se hace clic — a diferencia de un link de reset de contraseña):

```tsx
<Text
  className="bg-[#F5F5F5] rounded-[6px] text-[#1A1A1A] text-[36px] font-bold tracking-[10px] text-center inline-block py-[16px] px-[28px] m-0"
  style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
>
  {code}
</Text>
```

**Plantilla de aviso de login:** un bloque de metadata (fecha/hora, IP, dispositivo) seguido de un CTA para cambiar contraseña si no fue el usuario real:

```tsx
<Section className="bg-[#F5F5F5] rounded-[6px] py-[16px] px-[20px] mb-6">
  <Text className="text-[13px] text-[#555555] m-0 mb-2"><strong>Fecha y hora:</strong> {when}</Text>
  <Text className="text-[13px] text-[#555555] m-0 mb-2"><strong>Dirección IP:</strong> {ip}</Text>
  <Text className="text-[13px] text-[#555555] m-0"><strong>Dispositivo:</strong> {userAgent}</Text>
</Section>
```

### 7.12. Rate limiting — valores usados

Reutilizando un `isRateLimited(key, max, windowMs)` genérico basado en `Map` en memoria (ver limitación abajo):

| Punto | Clave | Máx | Ventana |
|---|---|---|---|
| Envío de código, por IP | `otp-send:${ip}` | 3 | 60s |
| Envío de código, por email | `otp-send-email:${email}` | 5 | 15 min |
| Intentos de un código específico | columna `LoginOtp.attempts` (no el limiter genérico) | 5 | vida del código (10 min) |
| Submit final completo | `login-submit:${ip}` | 10 | 60s |

```ts
// src/lib/rate-limit.ts — implementación completa, muy simple
const store = new Map<string, { count: number; resetAt: number }>();

export async function isRateLimited(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= max) return true;
  entry.count++;
  return false;
}
```

**Limitación conocida y aceptada:** este `Map` es en memoria, por proceso. Si la app corre en más de una instancia (ej. Azure App Service con >1 réplica, o serverless con cold starts concurrentes), el límite efectivo real es `max × número de instancias`. Para un volumen bajo de usuarios esto es aceptable; para escala mayor, reemplazar por Redis o similar.

### 7.13. Middleware — evitar el parpadeo de `/login` cuando ya hay sesión

Problema detectado en esta sesión: al entrar a una ruta protegida con sesión activa, el navegador compilaba y pintaba brevemente `/login` antes de que un `useEffect` en el cliente (observando `useSession()`) detectara la sesión y redirigiera — un parpadeo visible del formulario.

**Solución de raíz: la redirección debe ocurrir en el middleware (Edge), no en el cliente**, para que el servidor redirija ANTES de que el navegador reciba el HTML del formulario:

```ts
// dentro del callback authorized() de auth.config.ts / middleware
const isLoginRoute = nextUrl.pathname === "/login";

if (isLoggedIn && isLoginRoute) {
  return Response.redirect(
    new URL(nextUrl.basePath + (role === "admin" ? "/admin/home" : "/usuario/home"), nextUrl),
  );
}
```

Este cambio se agrega en el mismo callback `authorized()` que ya gestiona la protección de rutas por rol — es el lugar natural porque ya tiene acceso a `role`/`isLoggedIn` sin consultar la base de datos (vienen codificados en el JWT).

---

## 8. Lección operativa importante: `db push` vs `migrate dev` en proyectos sin carpeta de migraciones

Al intentar aplicar el modelo `LoginOtp` nuevo con `npx prisma migrate dev`, Prisma detectó "drift" entre el historial de migraciones esperado y el estado real de la base de datos, y sugirió `prisma migrate reset` — **un comando que habría borrado TODA la base de datos de producción** (todas las tablas, no solo la nueva).

La causa: este proyecto nunca tuvo una carpeta `prisma/migrations` — siempre sincronizó el esquema con `prisma db push` directamente contra la base real. `migrate dev` intenta reconciliar contra un historial de migraciones que simplemente no existe, y por eso lo malinterpreta como "esto no coincide, hay que resetear".

**Regla a aplicar en cualquier proyecto:** antes de correr `prisma migrate dev` por primera vez en un proyecto que no conoces bien, verificar si existe `prisma/migrations/`:
- Si existe → `migrate dev` es seguro, es el flujo normal.
- Si NO existe → el proyecto usa `db push`; usar siempre `npx prisma db push` (o el script `npm run db:push` si existe) para sincronizar cambios de esquema, y NUNCA correr `migrate dev`/`migrate reset` sin antes confirmar con el equipo si se quiere migrar formalmente a un historial de migraciones (lo cual es una decisión aparte, no algo a hacer de paso al agregar una tabla).

```bash
ls prisma/migrations 2>&1 || echo "NO existe — usar db push, no migrate dev"
```

---

## Checklist rápido para replicar todo esto en otra webapp

- [ ] Definir `ESTADO_LABEL` / `ESTADO_DOT` / `ESTADO_BADGE` / `ESTADO_BORDER` como único punto de verdad de color por estado.
- [ ] Si hay vistas de resumen con muchos pares label/valor, usar el patrón `GridField` + `GridSection` con `gap-px` para las líneas divisorias.
- [ ] Reutilizar `LoadingScreen` (logo + barra animada) tanto para loading de sesión como para transición entre rutas del panel protegido.
- [ ] Antes de tocar el esquema de Prisma en un proyecto nuevo: `ls prisma/migrations` para saber si usar `db push` o `migrate dev`.
- [ ] Para 2FA por OTP: modelo `LoginOtp` con `codeHash` + `attempts`, endpoint `send-otp` separado de la verificación, OTP verificado dentro de `authorize()` como tercer campo de credenciales (no un endpoint `verify-otp` aparte).
- [ ] Si el proyecto separa config Edge-safe de config completo (para compartir con `middleware.ts`): SIEMPRE componer `callbacks: { ...configBase.callbacks, jwt: async (...) => {...} }`, nunca reemplazar el objeto `callbacks` a secas.
- [ ] Decidir conscientemente la postura anti-enumeración vs UX inmediata en el endpoint de envío de OTP (sección 7.3) — no es un default, es una decisión de producto.
- [ ] Middleware: si hay página de login, redirigir ahí mismo (Edge) a usuarios ya logueados, para evitar parpadeo — no depender solo de un efecto en cliente.
