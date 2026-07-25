# Guía de referencia — patrones de esta sesión para replicar en otra webapp

Este documento resume, con código real y verificado del proyecto Coopvalili_WebApp, todo lo que se implementó en esta sesión: desde el sistema de colores/badges de estado hasta el 2FA por correo (OTP) completo, incluyendo su versión final como preferencia opcional por usuario. La idea es que sirva como checklist y fuente de copia/pega al llevar estos mismos patrones a otro proyecto Next.js.

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

## 7. 2FA por código OTP al correo — obligatorio (versión inicial)

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

### 7.7. Limitación conocida de NextAuth v5 beta.31: los códigos de error no llegan confiables al cliente

Con `signIn("credentials", { ..., redirect: false })`, en esta versión beta, **todo error de `CredentialsSignin` (incluidas subclases custom con su propio `code`) colapsa al string genérico `"CredentialsSignin"`** en `result.error` del lado del cliente — el `code` real (`"InactiveAccount"`, `"OtpRequired"`, etc.) NO se propaga de forma confiable. Por eso:

- El caso "cuenta inactiva" se resuelve con una llamada EXTRA a `/api/auth/account-status` DESPUÉS de que `signIn()` falla, para desambiguar sin depender del `code`.
- Los mensajes de OTP incorrecto/expirado se mantienen genéricos en pantalla ("Código inválido o expirado. Solicita uno nuevo.") en vez de intentar diferenciar "incorrecto" de "expirado" — no hay forma confiable de saberlo en el cliente con esta versión de NextAuth.

### 7.8. Rate limiting — valores usados

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

**Limitación conocida y aceptada:** este `Map` es en memoria, por proceso. Si la app corre en más de una instancia, el límite efectivo real es `max × número de instancias`. Para un volumen bajo de usuarios esto es aceptable; para escala mayor, reemplazar por Redis o similar.

### 7.9. Middleware — evitar el parpadeo de `/login` cuando ya hay sesión

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

---

## 8. 2FA opcional por usuario — evolución del punto 7, controlado desde "Mi Perfil"

**Motivo del cambio:** tras implementar el OTP obligatorio (sección 7), el usuario pidió que dejara de ser "todo o nada". Algunas cuentas (ej. cuentas de prueba, correos que no reciben mensajes reales) no deberían tener que pasar por el código. La decisión final: **cada usuario controla su propio OTP desde su perfil** — nadie más lo activa/desactiva por otra persona, ni siquiera un admin sobre otros usuarios. Por defecto queda **desactivado**.

Este patrón es la forma correcta de convertir un 2FA obligatorio en opcional sin reescribir el flujo de login desde cero — solo hay que tocar 6 puntos de forma quirúrgica.

### 8.1. Campo nuevo en el modelo `User`

```prisma
model User {
  // ...
  otpEnabled Boolean @default(false)
}
```

### 8.2. `send-otp/route.ts` — responder si el usuario necesita el código

El endpoint ya valida email+contraseña antes de decidir si envía el código — es el lugar natural para consultar la preferencia y devolver un flag explícito:

```ts
const user = await withPrismaRetry(() =>
  prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, active: true, passwordHash: true, otpEnabled: true },
  }),
);

// ... validar passwordHash / active / password como siempre ...

// El usuario tiene la verificación en dos pasos desactivada: no hace
// falta generar ni enviar ningún código.
if (!user.otpEnabled) {
  return NextResponse.json({ ok: true, otpRequired: false });
}

// ... resto del flujo (generar código, guardar, enviar) sin cambios ...
return NextResponse.json({ ok: true, otpRequired: true });
```

No tiene sentido gastar un envío de correo (ni crear la fila `LoginOtp`) para un usuario que no va a usar el código.

### 8.3. `authorize()` — saltar la verificación de OTP condicionalmente

Dos cambios clave en `auth.ts`:

1. El campo `otp` del schema Zod pasa a **opcional** (antes era obligatorio de 6 dígitos):
   ```ts
   const loginSchema = z.object({
     email: z.string().email(),
     password: z.string().min(1),
     otp: z.string().length(6).regex(/^\d{6}$/).optional(),
   });
   ```

2. Se agrega `otpEnabled` al `select` del `findUnique`, y todo el bloque de verificación de `LoginOtp` (buscar fila, chequear expiración/intentos, comparar código) queda envuelto en `if (user.otpEnabled) { ... }`. Si el usuario tiene el OTP desactivado, se salta ese bloque entero y se retorna el usuario directamente — el mismo camino feliz que existía antes de que el OTP existiera:

   ```ts
   if (user.otpEnabled) {
     const otpRow = await withPrismaRetry(() =>
       prisma.loginOtp.findFirst({ where: { userId: user.id, used: false }, orderBy: { createdAt: "desc" } }),
     );
     if (!otpRow) throw new OtpRequiredError();
     // ... expiración, attempts, comparar código (igual que antes) ...
     if (!otp) throw new OtpRequiredError(); // otp no vino en el payload
     // ... bcrypt.compare(otp, otpRow.codeHash) y marcar used:true ...
   }

   return {
     id: user.id,
     // ...
     otpEnabled: user.otpEnabled, // se propaga para el siguiente paso
   };
   ```

**Detalle fácil de pasar por alto:** dentro del bloque `if (user.otpEnabled)`, después de encontrar una fila `LoginOtp` válida (no expirada, intentos bajo el tope), hay que verificar explícitamente `if (!otp) throw new OtpRequiredError()` ANTES de comparar — porque ahora `otp` puede llegar `undefined` incluso cuando el usuario SÍ tiene el OTP activado (ej. si el cliente tiene un bug y no lo mandó). Sin este chequeo, `bcrypt.compare(undefined, ...)` fallaría de forma menos clara.

### 8.4. Propagar la preferencia al JWT/sesión

Mismo patrón exacto ya usado para `role`/`id` en el config Edge-safe (`auth.config.ts`) — el valor ya viene en el objeto que retornó `authorize()`, así que no hace falta tocar Prisma aquí:

```ts
// auth.config.ts
jwt({ token, user }) {
  if (user) {
    const u = user as { role?: string; id?: string; otpEnabled?: boolean };
    token.role = u.role;
    token.id = u.id ?? token.sub;
    token.otpEnabled = u.otpEnabled ?? false;
  }
  return token;
},
session({ session, token }) {
  const u = session.user as any;
  u.id = token.id ?? token.sub;
  u.role = token.role;
  u.otpEnabled = token.otpEnabled ?? false;
  return session;
},
```

**Limitación aceptada, inherente a las sesiones JWT (no a este feature):** si el usuario cambia el toggle en su perfil, el JWT ya emitido (la cookie actual) no se actualiza solo — reflejará el valor nuevo recién en el próximo login. La UI del toggle debe manejar su propio estado local tras guardar el cambio, no releer del JWT en caliente, y puede aclarar "esto aplica desde tu próximo inicio de sesión" si hace falta.

**Ojo con duplicados de `mapToProfile`:** si tu proyecto tiene más de un lugar que mapea `session.user` a un objeto `Profile` (por ejemplo, uno en el contexto de auth global y otro en un hook de protección de rutas usado solo para el guard cliente), hay que actualizar **todos**, no solo el "principal" — de lo contrario el compilador señalará el objeto incompleto en el segundo lugar, o peor, si no usas TypeScript estricto, quedará silenciosamente `undefined` ahí.

### 8.5. Endpoint para que el propio usuario cambie su preferencia

Sigue el molde de cualquier endpoint "el usuario modifica su propia cuenta" (mismo patrón que un endpoint de cambio de contraseña): usa `session.user.id` del lado del servidor, nunca un id que venga del body/cliente.

```ts
// src/app/api/auth/toggle-otp/route.ts
import { auth } from "../../../../../auth"; // ruta relativa hasta auth.ts en la raíz
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { isRateLimited } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ enabled: z.boolean() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimited(`toggle-otp:${session.user.id}:${ip}`, 10, 60 * 1000)) {
    return NextResponse.json({ ok: false, message: "Demasiados intentos." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });
  }

  await withPrismaRetry(() =>
    prisma.user.update({ where: { id: session.user.id }, data: { otpEnabled: parsed.data.enabled } }),
  );

  return NextResponse.json({ ok: true });
}
```

### 8.6. Cliente — `login()` con `otp` opcional, `requestOtp()` que informa si hace falta

```ts
// src/contexts/AuthContext.tsx
interface RequestOtpResult { ok: boolean; message?: string; otpRequired?: boolean; }

const requestOtp = useCallback(async (email, password): Promise<RequestOtpResult> => {
  const res = await fetch("/api/auth/send-otp", { method: "POST", /* ... */ body: JSON.stringify({ email, password }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) return { ok: false, message: data.message ?? "Correo o contraseña incorrectos." };
  return { ok: true, otpRequired: data.otpRequired ?? true }; // default true por seguridad si el campo no viniera
}, []);

const login = useCallback(async (email: string, password: string, otp?: string) => {
  const result = await signIn("credentials", {
    email, password,
    ...(otp ? { otp } : {}), // NO mandar otp:"" — el schema Zod opcional-con-6-dígitos lo rechazaría
    redirect: false,
  });
  // ... resto igual ...
}, [router]);
```

### 8.7. Formulario de login — saltar el Step 3 por completo

En el paso donde hoy se pide la contraseña y luego se envía el código, la lógica pasa de "siempre avanzar a Step 3" a "avanzar solo si `otpRequired` es `true`":

```ts
const handleSendOtp = async () => {
  const valid = await trigger("password");
  if (!valid) return;

  const result = await requestOtp(email, password);
  if (!result.ok) {
    setError("password", { type: "server", message: result.message });
    return;
  }

  // El usuario tiene el OTP desactivado: login directo, sin Step 3.
  if (!result.otpRequired) {
    await login(email, password); // sin tercer argumento
    return;
  }

  setStep(3); // solo aquí se muestra la pantalla de código
};
```

El campo `otp` del schema Zod del propio formulario también pasa a `.optional()` — en el camino "sin OTP" nunca se llena ni se valida, porque el `login()` se dispara directamente desde el paso de la contraseña, sin pasar por el formulario del Step 3.

### 8.8. UI del toggle — acordeón en "Mi Perfil"

Si ya existe un patrón de acordeón en la página de perfil (ej. uno para "Cambiar contraseña"), el toggle de OTP debería copiar exactamente esa estructura visual (card blanca, header clicable con ícono + chevron rotable, contenido condicional) para sentirse consistente, cambiando solo el contenido interno por un switch en vez de un formulario:

```tsx
// Requiere un componente Switch tipo Radix (checked / onCheckedChange / disabled)
const [otpEnabled, setOtpEnabled] = useState(profile?.otpEnabled ?? false);

useEffect(() => {
  if (profile) setOtpEnabled(profile.otpEnabled);
}, [profile]);

const handleToggleOtp = async (checked: boolean) => {
  const res = await fetch("/api/auth/toggle-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: checked }),
  });
  const data = await res.json();
  if (data.ok) setOtpEnabled(checked);
  // mostrar mensaje de éxito/error, aclarando que el cambio aplica desde
  // el próximo login si tu sesión es JWT (ver limitación en 8.4)
};

<Switch checked={otpEnabled} onCheckedChange={handleToggleOtp} />
```

Si el componente `Switch` de tu design system ya existe en el proyecto pero nunca se usó (pasa más seguido de lo que parece con librerías tipo shadcn/Radix instaladas "por si acaso"), este es un buen primer caso de uso real para verificar que su theming encaja con el resto de la app.

### 8.9. Checklist de los 6+1 puntos a tocar para hacer opcional un 2FA que ya era obligatorio

1. Campo booleano en el modelo de usuario (`otpEnabled`, default acorde a tu política).
2. El endpoint de "enviar código" consulta el campo y responde un flag explícito (`otpRequired`), sin generar/enviar nada si está apagado.
3. `authorize()`: el campo del segundo factor pasa a opcional en el schema, y todo el bloque de verificación se envuelve en un condicional sobre el flag — con el chequeo extra de "¿de verdad vino el segundo factor?" antes de comparar, porque ahora puede faltar aun con el flag encendido.
4. Propagar el flag al JWT/sesión con el mismo patrón ya usado para otros campos derivados del usuario (`role`, `id`) — y revisar si hay más de un lugar en el código que mapea `session.user` a un perfil interno.
5. Endpoint para que el propio usuario cambie el flag, restringido a `session.user.id` (nunca a un id externo).
6. Cliente: la función de "pedir el segundo factor" retorna si hace falta o no, y el flujo de UI se ramifica ahí — saltando por completo la pantalla del segundo factor cuando no aplica, en vez de mostrarla vacía/deshabilitada.
7. La UI para prender/apagar la preferencia va donde el usuario gestiona su propia cuenta (perfil), copiando el patrón visual ya existente ahí para no introducir un estilo nuevo.

---

## 9. Lección operativa importante: `db push` vs `migrate dev` en proyectos sin carpeta de migraciones

Al intentar aplicar el modelo `LoginOtp` nuevo con `npx prisma migrate dev`, Prisma detectó "drift" entre el historial de migraciones esperado y el estado real de la base de datos, y sugirió `prisma migrate reset` — **un comando que habría borrado TODA la base de datos de producción** (todas las tablas, no solo la nueva).

La causa: este proyecto nunca tuvo una carpeta `prisma/migrations` — siempre sincronizó el esquema con `prisma db push` directamente contra la base real. `migrate dev` intenta reconciliar contra un historial de migraciones que simplemente no existe, y por eso lo malinterpreta como "esto no coincide, hay que resetear".

**Regla a aplicar en cualquier proyecto:** antes de correr `prisma migrate dev` por primera vez en un proyecto que no conoces bien, verificar si existe `prisma/migrations/`:
- Si existe → `migrate dev` es seguro, es el flujo normal.
- Si NO existe → el proyecto usa `db push`; usar siempre `npx prisma db push` (o el script `npm run db:push` si existe) para sincronizar cambios de esquema, y NUNCA correr `migrate dev`/`migrate reset` sin antes confirmar con el equipo si se quiere migrar formalmente a un historial de migraciones (lo cual es una decisión aparte, no algo a hacer de paso al agregar una tabla).

```bash
ls prisma/migrations 2>&1 || echo "NO existe — usar db push, no migrate dev"
```

Esta regla se aplicó dos veces en esta sesión (al agregar `LoginOtp` y luego al agregar `otpEnabled`) sin incidentes en la segunda ocasión, precisamente por tenerla presente de antemano.

---

## Checklist rápido para replicar todo esto en otra webapp

- [ ] Definir `ESTADO_LABEL` / `ESTADO_DOT` / `ESTADO_BADGE` / `ESTADO_BORDER` como único punto de verdad de color por estado.
- [ ] Si hay vistas de resumen con muchos pares label/valor, usar el patrón `GridField` + `GridSection` con `gap-px` para las líneas divisorias.
- [ ] Reutilizar `LoadingScreen` (logo + barra animada) tanto para loading de sesión como para transición entre rutas del panel protegido.
- [ ] Antes de tocar el esquema de Prisma en un proyecto nuevo: `ls prisma/migrations` para saber si usar `db push` o `migrate dev`.
- [ ] Para 2FA por OTP: modelo `LoginOtp` con `codeHash` + `attempts`, endpoint `send-otp` separado de la verificación, OTP verificado dentro de `authorize()` como tercer campo de credenciales (no un endpoint `verify-otp` aparte).
- [ ] Decidir desde el inicio si el 2FA es obligatorio para todos o **opcional por usuario** — si es opcional, seguir el checklist de la sección 8.9 en vez de intentar retrofit sobre la marcha.
- [ ] Si el proyecto separa config Edge-safe de config completo (para compartir con `middleware.ts`): SIEMPRE componer `callbacks: { ...configBase.callbacks, jwt: async (...) => {...} }`, nunca reemplazar el objeto `callbacks` a secas.
- [ ] Decidir conscientemente la postura anti-enumeración vs UX inmediata en el endpoint de envío de OTP (sección 7.3) — no es un default, es una decisión de producto.
- [ ] Middleware: si hay página de login, redirigir ahí mismo (Edge) a usuarios ya logueados, para evitar parpadeo — no depender solo de un efecto en cliente.
- [ ] Buscar TODOS los lugares que mapean `session.user` a un perfil interno antes de agregar un campo nuevo a la sesión — es fácil que haya un segundo `mapToProfile` en un hook aparte.
