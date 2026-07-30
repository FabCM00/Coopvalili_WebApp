# CLAUDE.md

Portal web de Coopvalili (`portal-want`): bandeja de solicitudes de crédito con
validación de identidad, motor de decisión y firma electrónica de documentos.

## Stack

- **Next.js 15** (App Router) + **React 19** + TypeScript
- **Prisma 6** sobre **PostgreSQL** (Azure)
- **NextAuth v5 beta** (Credentials + OTP por correo)
- **Tailwind v4** + Radix UI (`components.json` — estilo shadcn)
- **TanStack Query** para estado de servidor en cliente
- **Azure**: Blob Storage (documentos) + Communication Services (correo)
- **ZapSign** para firma electrónica
- Gestor de paquetes: **pnpm** (ver "Lockfile" abajo)

## Comandos

```bash
pnpm dev                # desarrollo
pnpm build              # prisma generate && next build
pnpm lint               # next lint
pnpm db:push            # aplicar schema a la BD  ← usar este
pnpm db:studio          # explorador de la BD
pnpm seed:admins        # siembra admins desde seed/admins.yml
pnpm seed:test-users    # siembra usuarios de prueba
```

### Base de datos: solo `db push`

**Nunca correr `prisma migrate dev` ni `prisma migrate reset`.** No hay carpeta
de migraciones y la BD es compartida con datos reales — `migrate` puede
borrarlos. El script `db:migrate` existe en `package.json` pero no debe usarse.
Para cambios de schema: editar `prisma/schema.prisma` y correr `pnpm db:push`.

### Lockfile

El proyecto usa **pnpm**, y Vercel corre `pnpm install` con `--frozen-lockfile`
(automático en CI). Si `package.json` y `pnpm-lock.yaml` se desincronizan, el
build falla con `ERR_PNPM_OUTDATED_LOCKFILE` antes de compilar nada.

**Al tocar dependencias, commitear siempre `package.json` y `pnpm-lock.yaml`
juntos.** Si se editan dependencias a mano, correr `pnpm install` después.

Existe un `package-lock.json` versionado por herencia; el que manda es
`pnpm-lock.yaml`.

## Arquitectura

### Rutas

```
src/app/
  (protected)/          # requiere sesión — layout.tsx aplica el guard
    admin/              # role = ADMIN: usuarios, asociados, perfil
    usuario/            # role = USER: bandeja, perfil
  api/
    auth/               # login, OTP, invitación, reset de contraseña
    usuario/bandeja/    # lista, detalle por radicado, conteo por estado
    usuario/documentos/ # subida, firma, descarga, sincronización
    webhooks/zapsign/   # callback de firma
  login/ forgot-password/ set-password/    # públicas
```

`middleware.ts` protege todo salvo `api/auth`, estáticos e imágenes. Corre en
Edge Runtime, por eso usa solo `auth.config.ts` (**sin Prisma ni bcrypt** — no
funcionan en Edge). La lógica pesada de login vive en `auth.ts`, que sí es Node.

Alias de imports: `@/*` → `./src/*`.

## La bandeja (núcleo del proyecto)

Es la parte más grande y la que más se replica a otros clientes. Flujo:

```
valida1_results (tabla raíz, una fila por radicado)
   └── motor_data_results · motor_process_results
       identity_validations · credito_decisiones
                    ↓
   bandeja-query.ts    where/include/paginación de Prisma
                    ↓
   bandeja-mappers.ts  aplana los JSON → SolicitudResumen / SolicitudUI
                    ↓
   bandeja-estados.ts  deriva el estado (7 reglas en orden)
                    ↓
   BandejaView.tsx → DetailContent.tsx
```

### La BD guarda JSON, no columnas

Las tablas del flujo de crédito solo persisten `request_json` / `response_json`
(JSONB). **Ningún dato de negocio está en columnas tipadas** — todo se extrae en
`src/lib/bandeja-mappers.ts`, que aplana esos payloads a las formas que consume
el frontend. Si falta un campo en la UI, el problema casi siempre está ahí, no
en el schema.

### Estados

`src/lib/bandeja-estados.ts` es la **única fuente de verdad** del estado de una
solicitud. Son 7 reglas evaluadas en orden — gana la primera que se cumple — y
el archivo abre con la tabla de reglas y su mapeo a los campos JSON reales.
`revision` es el fallback cuando los datos están incompletos.

Los valores "ok"/"falla" llegan inconsistentes desde los servicios externos
(numéricos `1`/`2` o textos `"success"`/`"failed"`); los helpers `isSuccess()` /
`isFailed()` normalizan eso. No comparar contra literales sueltos.

Al añadir un estado hay que tocar **dos** sitios: el tipo `SolicitudEstado` en
`src/lib/types.ts` y el array `SOLICITUD_ESTADOS` en `bandeja-query.ts` (el
`satisfies` hace que TypeScript avise si divergen).

### Filtrado por estado: cuidado con la paginación

El estado es **derivado en código**, no una columna, así que no se puede filtrar
en SQL. Cuando llega `?estado=`, [route.ts](src/app/api/usuario/bandeja/route.ts)
trae **todas** las filas, las mapea y filtra en memoria; sin ese parámetro sí
usa `skip`/`take` en la BD. Son dos caminos distintos en el mismo handler — al
modificar la paginación hay que revisar ambos.

## Acceso a datos

**Toda query a Prisma va envuelta en `withPrismaRetry()`** (`src/lib/prisma-retry.ts`).
La BD de Azure se pausa por inactividad y devuelve errores de conexión
transitorios (P1001, P1017, socket cerrado); el helper reconecta y reintenta con
backoff — más largo para un servidor despertando, más corto para un socket
caído. Los demás errores se propagan tal cual.

El pool es pequeño (`connection_limit=3`). En un mismo handler, **las queries van
secuenciales a propósito**, no en `Promise.all` — en paralelo compiten entre sí
y con otras pestañas hasta agotar los slots de Postgres. Ver el comentario en
[route.ts:37-39](src/app/api/usuario/bandeja/route.ts#L37-L39).

`src/lib/prisma.ts` exporta un singleton para sobrevivir al hot reload.

## Convenciones de las rutas API

Respuesta uniforme, siempre con `ok`:

```ts
{ ok: true,  data: {...} }
{ ok: false, message: "..." }   // con status 400/401/500
```

Cada handler abre comprobando sesión:

```ts
const session = await auth();
if (!session?.user) {
  return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
}
```

Los parámetros de query se validan y acotan antes de usarse (p. ej. `limit` va
con `Math.min(100, ...)`). Para cuerpos de request se usa Zod.

## Idioma

**El código y los comentarios están en español**: nombres de campos
(`radicado`, `cedula`, `solicitante`, `gestionado_at`), tipos (`SolicitudUI`),
mensajes de error y comentarios. Mantener ese idioma al escribir código nuevo.

Los comentarios existentes explican **por qué**, no qué hace el código
(ver `prisma-retry.ts` o la cabecera de `bandeja-estados.ts`). Seguir ese
criterio en vez de narrar lo obvio.

## Variables de entorno

```
DATABASE_URL                          # Postgres (con connection_limit=3)
AUTH_SECRET                           # NextAuth
NEXT_PUBLIC_APP_URL                   # base para enlaces en correos
NEXT_PUBLIC_URL_PREFIX
NEXT_PUBLIC_URL_COMMUNICATIONS_APP
AZURE_BLOB_CONNECTION_STRING          # documentos
AZURE_EMAIL_CONNECTION_STRING         # correo saliente
EMAIL_FROM
ZAPSIGN_API_URL / ZAPSIGN_TOKEN / ZAPSIGN_WEBHOOK_SECRET
```

`.env` está en `.gitignore` — no versionar secretos.

## Deuda técnica conocida

- **`DetailContent.tsx` (780 líneas)** mezcla tres cosas: componentes de
  presentación genéricos (`Section`, `GridField`, `GridSection`, `CriterioRow`),
  helpers de formato y el layout específico de Coopvalili. Los tres primeros son
  reutilizables y deberían salir del archivo.
- **`bandeja-mappers.ts`**: las cinco funciones `mapX` repiten el mismo patrón
  (leer JSON → aplanar campos). Es el candidato natural a volverse una sola
  función guiada por configuración.
- Las etiquetas de validaciones están hardcodeadas en
  [bandeja-mappers.ts:249-305](src/lib/bandeja-mappers.ts#L249-L305).
- **`pnpm-workspace.yaml`** tiene un bloque `allowBuilds` con texto de plantilla
  (`"set this to true or false"`) en vez de booleanos, así que pnpm ignora los
  scripts de build de `prisma`, `sharp` y `esbuild`. El build no se rompe porque
  `pnpm build` corre `prisma generate` explícitamente, pero `sharp` (optimización
  de imágenes de Next) queda sin compilar.
- `next.config.ts` usa `module.exports` en un archivo `.ts` y trae
  `swcMinify`, que ya no existe en Next 15 (se ignora).
- `eslint.ignoreDuringBuilds: true` — el lint no bloquea el build.

## Documentación adicional

`docs/` tiene guías de ZapSign y de patrones a replicar. Ojo: hay un
`GUIA_REPLICAR_PATRONES copy.md` duplicado.
