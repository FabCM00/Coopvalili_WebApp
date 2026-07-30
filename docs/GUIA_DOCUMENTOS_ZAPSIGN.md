# Documentos en Blob + Firma electrónica (ZapSign)

Guía paso a paso para replicar en otro proyecto el módulo de documentos con
almacenamiento en Azure Blob y firma electrónica vía ZapSign.

**Stack de referencia:** Next.js 15 (App Router) · Prisma 6 + PostgreSQL ·
Auth.js v5 · Azure Blob Storage · React Query · lucide-react · Tailwind.

---

## 1. El modelo mental

**La BD guarda el puntero, el blob guarda los bytes.** Es el mismo patrón que S3:

| S3 | Azure Blob | Aquí |
|---|---|---|
| `bucket` | `container` | columna `container` |
| `key` | `blob_name` | columna `blob_name` |
| `version_id` | `etag` | columna `etag` |

Todo lo consultable —estado, tipo, quién subió, a qué solicitud pertenece— vive
en una tabla de Postgres. El archivo nunca se guarda en la BD.

### Por qué no usar la metadata del blob

El diseño anterior guardaba el estado y la categoría como metadata del blob y
organizaba por prefijo de cédula. Tres problemas que motivaron el cambio:

1. **No se puede consultar.** Listar exigía recorrer todos los blobs del prefijo
   y filtrar en memoria. No existía "los pendientes de firma de esta solicitud".
2. **No había relación con la solicitud.** Si una persona pedía tres créditos,
   sus documentos se mezclaban todos bajo su cédula.
3. **El webhook no tendría dónde buscar.** Llega con un token; sin tabla habría
   que escanear blobs para encontrar el documento.

---

## 2. Dependencias

```bash
npm i @azure/storage-blob
# ya presentes en un proyecto Next + Prisma:
#   @prisma/client prisma next next-auth @tanstack/react-query lucide-react
```

Versiones de referencia: `@azure/storage-blob ^12.33`, `prisma ^6.19`,
`next ^15.5`, `next-auth ^5.0.0-beta`, `@tanstack/react-query ^5.101`.

---

## 3. Variables de entorno

```bash
# Azure Blob Storage
AZURE_BLOB_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...

# ZapSign — firma electrónica
ZAPSIGN_API_URL=https://api.zapsign.com.br/api/v1
ZAPSIGN_TOKEN=<token de acceso de tu cuenta>
ZAPSIGN_WEBHOOK_SECRET=<genera uno: openssl rand -hex 24>
```

**Decisiones y por qué:**

- **Prefijo `ZAPSIGN_`**, no sufijo `_ZAP`: agrupa por servicio al inicio, igual
  que `AZURE_*`, y así se leen juntas en el archivo.
- **URL base sin `/docs/`**: se necesitan más endpoints (detalle del documento).
  Guardar la ruta completa amarra el cliente a uno solo.
- **Nunca `NEXT_PUBLIC_` en el token.** Ese prefijo compila la variable dentro
  del bundle del navegador y el token queda público. Todo el consumo es del
  lado servidor.
- `ZAPSIGN_WEBHOOK_SECRET` es **tuyo**, no de ZapSign: es lo único que protege
  un endpoint público.

---

## 4. Schema de Prisma

Dos tablas. `documentos` es el índice de archivos; `firma_solicitudes` registra
los envíos a firma.

```prisma
/// Índice de los archivos subidos. El contenido vive en Azure Blob Storage; aquí
/// solo se guarda el puntero (container + blob_name, al estilo bucket + key de
/// S3) junto con los metadatos y el estado.
model documentos {
  id       BigInt @id @default(autoincrement())
  radicado String   // ← cámbialo por tu clave de negocio
  cedula   String

  // Puntero al blob
  container String @default("documentos")
  blob_name String

  // Metadatos del archivo
  nombre_original String
  mime_type       String?
  size_bytes      BigInt?
  /// SHA-256 del contenido: permite detectar que se subió dos veces lo mismo.
  sha256          String? @db.Char(64)
  /// Versión del blob en Azure (cambia con cada sobrescritura).
  etag            String?

  tipo_documento String @default("Documentos generales")

  /// pendiente | revision | validado (manuales)
  /// pendiente_firma | firmado (los pone el sistema)
  estado String @default("pendiente")

  // Borrado lógico: nunca se borra el blob ni la fila.
  eliminado  Boolean   @default(false)
  deleted_at DateTime? @db.Timestamptz(6)

  subido_por String?
  created_at DateTime @default(now()) @db.Timestamptz(6)
  updated_at DateTime @updatedAt @db.Timestamptz(6)

  // FK a la entidad padre: impide adjuntar a algo que no existe.
  valida1_results   valida1_results     @relation(fields: [radicado], references: [radicado], onUpdate: NoAction, map: "fk_documentos_valida1")
  firma_solicitudes firma_solicitudes[]

  @@unique([container, blob_name], map: "uq_documentos_blob")
  @@index([radicado], map: "idx_documentos_radicado")
  @@index([cedula], map: "idx_documentos_cedula")
  @@index([radicado, estado], map: "idx_documentos_radicado_estado")
}

/// Envíos a firma electrónica. Un documento puede tener varios (reenvíos): el
/// vigente es el más reciente. El webhook localiza la fila por `zapsign_token`.
model firma_solicitudes {
  id           BigInt @id @default(autoincrement())
  documento_id BigInt
  radicado     String

  /// Token del documento en ZapSign. Es la llave que trae el webhook.
  zapsign_token   String  @unique
  zapsign_open_id Int?
  /// URL de firma: se reenvía si el firmante no recibió el correo.
  sign_url        String?
  signer_token    String?

  // Lo solicitado (el firmante puede editarlo en ZapSign).
  firmante_nombre String
  firmante_email  String?
  firmante_phone  String?

  canal_email    Boolean @default(true)
  canal_whatsapp Boolean @default(false)

  /// pending | signed | refused | error
  status String @default("pending")

  /// etag del blob antes de sobrescribirlo con el firmado: deja rastro de que
  /// existió una versión sin firmar (el contenido no se conserva).
  etag_original String?
  /// Payload crudo del último webhook (auditoría y diagnóstico).
  webhook_json  Json?

  enviado_por String?
  created_at  DateTime  @default(now()) @db.Timestamptz(6)
  updated_at  DateTime  @updatedAt @db.Timestamptz(6)
  signed_at   DateTime? @db.Timestamptz(6)

  documento documentos @relation(fields: [documento_id], references: [id], onDelete: Cascade, map: "fk_firma_documento")

  @@index([documento_id], map: "idx_firma_documento")
  @@index([radicado], map: "idx_firma_radicado")
  @@index([status], map: "idx_firma_status")
}
```

Y en la entidad padre, agregar el lado inverso:

```prisma
model valida1_results {
  // ...
  documentos documentos[]
}
```

### Aplicar el schema — verificar ANTES

```bash
# 1. Ver el SQL exacto sin aplicar nada
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script

# 2. Debe mostrar SOLO CREATE TABLE + CreateIndex + AddForeignKey.
#    Si aparece cualquier DROP o ALTER sobre tablas existentes, NO aplicar.

# 3. Aplicar
npx prisma db push
npx prisma generate
```

> **En Windows** `prisma generate` puede fallar con `EPERM ... query_engine-windows.dll.node`
> si el dev server tiene el archivo tomado. Solución: cerrar el dev server,
> borrar los `.tmp*` de `node_modules/.prisma/client/` y reintentar.

---

## 5. Decisiones de diseño (el porqué)

Estas son las que importan al replicar; saltarlas produce bugs sutiles.

### 5.1 La cédula se deriva del radicado, no llega del cliente

```ts
const solicitud = await prisma.valida1_results.findUnique({
  where: { radicado }, select: { cedula: true },
});
const cedula = sanitizeCedula(solicitud.cedula ?? "");
```

Si la cédula viniera por query string, un cliente podría subir documentos a
nombre de otra persona. La fuente de verdad es la BD.

### 5.2 Orden en la subida: blob primero, INSERT después

```ts
const upload = await blob.uploadData(buffer, {...});
try {
  const row = await prisma.documentos.create({...});
} catch (error) {
  await blob.deleteIfExists().catch(() => {/* log */});  // compensación
  throw error;
}
```

Un blob huérfano es basura silenciosa; una fila apuntando a un blob inexistente
**revienta la UI al descargar**. Si el INSERT falla, se borra el blob.

### 5.3 Dos niveles de permiso en el estado

```
pendiente | revision | validado   → los cambia el colaborador
pendiente_firma | firmado         → los pone el SISTEMA
```

`cambiarEstado` rechaza los de sistema salvo `permitirSistema: true`, reservado
para el flujo de firma. Y un documento ya en flujo de firma no admite cambio
manual (409).

**Por qué importa:** sin esto un colaborador podría marcar "Firmado" sin que
nadie haya firmado, y eso vacía de valor legal el estado.

En el frontend, el array del dropdown (`STATUS_OPTIONS`) contiene solo los
manuales; los de sistema están en `STATUS_CONFIG` para pintar el badge pero
nunca se ofrecen como acción.

### 5.4 Control de acceso: el radicado como segunda llave

```ts
function assertPertenece(radicadoFila: string, radicadoEsperado?: string) {
  if (!radicadoEsperado) return;
  if (radicadoFila !== sanitizeRadicado(radicadoEsperado)) {
    throw new DocumentoError("El documento no pertenece a la solicitud indicada.", 403);
  }
}
```

Toda operación (`obtenerBuffer`, `cambiarEstado`, `eliminarDocumento`) exige el
radicado además del id. Así un id suelto no alcanza para tocar documentos de
otra persona.

**Ponerlo en el lib, no en cada route:** si la verificación vive en las rutas,
basta que una se olvide para abrir una fuga.

### 5.5 Borrado lógico

`eliminado = true` + `deleted_at`. El blob y la fila se conservan. Además, un
documento en `pendiente_firma`/`firmado` **no se puede eliminar** (409): tiene
valor probatorio.

### 5.6 El PDF firmado expira en 60 minutos

`signed_file` de ZapSign es una URL temporal. **No se puede guardar en BD** — hay
que descargar el archivo durante el webhook y subirlo al blob.

### 5.7 Idempotencia del webhook

ZapSign reintenta si tu servidor falla. Si el mismo evento llega dos veces, el
segundo no debe volver a descargar ni sobrescribir:

```ts
if (firma.status === "signed" && firma.documento.estado === "firmado") {
  return { handled: true, action: "sin_cambio", detail: "Ya procesada." };
}
```

### 5.8 El webhook responde 200 aunque no procese

Un 4xx/5xx hace que ZapSign reintente en bucle. Solo devolver error cuando el
reintento tiene sentido (BD caída, fallo al bajar el PDF). Token desconocido →
200 con `ignored`.

---

## 6. Estructura de archivos

```
src/lib/
  documentos.ts          ← cliente de Azure + operaciones sobre la tabla
  zapsign.ts             ← transporte HTTP a ZapSign + envío y webhook

src/app/api/usuario/documentos/
  guardar/route.ts                    POST   subir
  radicado/[radicado]/route.ts        GET    listar por radicado
  download/route.ts                   GET    servir el archivo (proxy)
  [id]/route.ts                       PATCH  cambiar estado
                                      DELETE borrado lógico
  [id]/firmar/route.ts                POST   enviar a firma
  [id]/sincronizar-firma/route.ts     POST   consultar estado (respaldo)

src/app/api/webhooks/
  zapsign/route.ts                    POST   público, valida secret

src/components/
  BusyOverlay.tsx                     velo de "trabajando" (logo + barra)
  bandeja/documentos/
    DocumentosTab.tsx                 orquesta: estados, modales, notificaciones
    DocumentList.tsx                  lista agrupada por tipo
    UploadDocumentModal.tsx           subir (drag & drop + progreso)
    SignDocumentModal.tsx             firmante + canales
    useDocumentos.ts                  datos + acciones + polling
    useDocumentUpload.ts              subida con progreso (XHR)
    utils.tsx                         tipos, STATUS_CONFIG, helpers
```

**Regla de oro:** las rutas de API no conocen Azure ni ZapSign. Solo llaman al
lib y traducen errores de dominio a códigos HTTP. Si mañana cambias de proveedor,
tocas un archivo.

---

## 7. API pública del lib

### `src/lib/documentos.ts`

```ts
type DocumentoEstado = "pendiente" | "revision" | "validado"
                     | "pendiente_firma" | "firmado";

class DocumentoError extends Error { status: number }  // HTTP sugerido

guardarDocumento({ radicado, file, tipoDocumento?, subidoPor? }): DocumentoDTO
listarPorRadicado(radicado): DocumentoDTO[]
obtenerBuffer(id, radicadoEsperado?): { buffer, contentType, nombre } | null
reemplazarContenido(id, buffer, contentType): void   // usado por el flujo de firma
cambiarEstado(id, estado, { permitirSistema?, radicadoEsperado? }): DocumentoDTO
eliminarDocumento(id, { radicadoEsperado? }): void
isDocumentoEstado(v): v is DocumentoEstado
```

`DocumentoError` con `status` evita que cada route adivine el código HTTP.

### `src/lib/zapsign.ts`

```ts
enviarDocumentoAFirma({ documentoId, radicado, firmante, canales, enviadoPor? })
  → { firmaId, zapsignToken, signUrl }

procesarWebhook(payload) → WebhookOutcome
sincronizarFirma(zapsignToken) → WebhookOutcome   // respaldo del webhook
```

**Patrón de transporte** (un solo punto de salida):

```ts
async function zapFetch<T>(path, body?, method: "POST" | "GET" = "POST"): Promise<T> {
  if (!API_URL || !TOKEN) throw new DocumentoError("ZapSign no configurado.", 503);
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new DocumentoError(`ZapSign ${res.status}: ${text.slice(0,300)}`, ...);
  return JSON.parse(text) as T;
}
```

Centraliza el header de auth y el manejo de errores. El detalle del error de
ZapSign se propaga recortado para que el usuario vea la causa real.

---

## 8. Payload de creación en ZapSign

```ts
{
  name: nombreOriginal.slice(0, 255),
  base64_pdf: buffer.toString("base64"),   // SIN el prefijo data:...;base64,
  lang: "es",
  external_id: radicado,                   // amarra ZapSign ↔ tu solicitud
  signers: [{
    name, email, blank_email: !email,
    phone_country: "57", phone_number, blank_phone: !celular,
    send_automatic_email: canales.email,
    send_automatic_whatsapp: canales.whatsapp,
    auth_mode: "assinaturaTela",
  }],
}
```

**`base64_pdf` y no `url_pdf`:** el contenedor de Azure es privado, no hay URL
pública que darle. Y ojo: ZapSign rechaza el prefijo `data:application/pdf;base64,`.

**`external_id` con tu clave de negocio** es lo que hace el flujo rastreable
después.

**`auth_mode` sin `-tokenEmail`:** ese sufijo obliga al firmante a copiar un
código que ZapSign le envía al correo. Aquí se quitó porque la identidad ya se
validó antes en el flujo (`identity_validations`), así que el código era un
segundo paso redundante que solo añadía fricción. Los modos se combinan con
guion (`assinaturaTela-tokenEmail`), de modo que reactivarlo es volver a
concatenarlo.

### Costos de `auth_mode`

| Modo | Costo |
|---|---|
| `assinaturaTela`, `tokenEmail`, `tokenSms` | gratis |
| `tokenWhatsapp` | ~5 créditos (USD $0.10) |
| `selfie_validation_type: identity-verification` | ~55 créditos (USD $1.00) |

`send_automatic_email` es gratis; `send_automatic_whatsapp` consume créditos.
Recomendación: WhatsApp detrás de un checkbox **apagado por defecto**.

---

## 9. El webhook — la parte crítica

Es la única forma de saber que el firmante firmó (la alternativa, polling a
ZapSign, es peor: consultas constantes de documentos que no cambiaron).

### 9.1 Exceptuarlo del guard de autenticación

**Este paso se olvida y rompe todo.** Si el middleware devuelve 401 a toda ruta
`/api/` sin sesión, ZapSign nunca llega al handler:

```ts
// auth.config.ts → callbacks.authorized
authorized({ auth, request: { nextUrl } }) {
  // Webhooks de proveedores externos: no tienen sesión en esta app. Cada uno
  // valida su propio secreto compartido.
  const isWebhookRoute = nextUrl.pathname.startsWith("/api/webhooks/");
  const isApiRoute = nextUrl.pathname.startsWith("/api/") && !isWebhookRoute;

  if (isWebhookRoute) return true;
  if (isApiRoute && !isLoggedIn) return new Response(..., { status: 401 });
  // ...
}
```

### 9.2 Validar el secreto

Al ser público, cualquiera podría hacer `POST` diciendo "ya firmó":

```ts
const secret = req.nextUrl.searchParams.get("secret")
            ?? req.headers.get("x-webhook-secret") ?? "";
if (secret !== WEBHOOK_SECRET) {
  // 404 y no 401: no revela que la ruta existe.
  return NextResponse.json({ ok: false, message: "No encontrado." }, { status: 404 });
}
```

### 9.3 Configurar en ZapSign

`app.zapsign.co` → **Ajustes → Integraciones → API** → sección **Webhooks** →
**Crear webhook**:

```
https://<tu-dominio>/api/webhooks/zapsign?secret=<ZAPSIGN_WEBHOOK_SECRET>
```

Evento: `doc_signed` (o `all`). ZapSign notifica a **todas** las URLs
registradas, así que puedes tener varias sin conflicto.

### 9.4 Nombres de evento

No están fijados en la doc pública, así que se aceptan sinónimos:

```ts
const SIGNED_EVENTS  = new Set(["doc_signed", "signed", "document_signed"]);
const REFUSED_EVENTS = new Set(["doc_refused", "refused", "signature_refused"]);
```

El payload crudo se guarda en `webhook_json`: cuando llegue el primero real,
ahí confirmas el nombre exacto.

### 9.5 Probar en local con ngrok

ZapSign necesita una URL pública; `localhost` no le sirve.

```bash
npm run dev            # terminal 1
ngrok http 3000        # terminal 2
```

Verifica los tres casos antes de configurar en ZapSign:

```bash
URL="https://<sub>.ngrok-free.app/api/webhooks/zapsign"
SECRET="<tu secret>"

# 1. sin secret → 404
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$URL" \
  -H "Content-Type: application/json" -d '{"token":"x"}'

# 2. secret incorrecto → 404
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$URL?secret=malo" \
  -H "Content-Type: application/json" -d '{"token":"x"}'

# 3. secret correcto → 200 {"ok":true,"ignored":"Token desconocido: ..."}
curl -s -X POST "$URL?secret=$SECRET" -H "Content-Type: application/json" \
  -d '{"event_type":"doc_signed","token":"no-existe"}'
```

Inspector de ngrok en `http://127.0.0.1:4040`: ahí ves cada petición con su body
y la respuesta. Si ZapSign llamó y recibió 404, casi seguro es el secret.

> La URL de ngrok **cambia al reiniciarlo** (plan gratis). Hay que actualizar el
> webhook en ZapSign cada vez.

### 9.6 Respaldo: `sincronizarFirma`

Si el webhook se perdió (no estaba configurado, app caída, firma anterior al
montaje), este endpoint pregunta a ZapSign el estado real y aplica el resultado
reutilizando `procesarWebhook`:

```
POST /api/usuario/documentos/{id}/sincronizar-firma?radicado={radicado}
```

Vale la pena tenerlo también en producción como red de seguridad.

---

## 10. Frontend

### 10.1 Lista y estados

`STATUS_CONFIG` centraliza label, colores, dot e icono de los 5 estados; nada de
colores sueltos en los componentes. `STATUS_OPTIONS` contiene solo los manuales
(es lo que itera el dropdown) y `esEstadoDeSistema()` deriva de ahí — no duplica
la lista.

Detalles de UX que valieron la pena:

- **Acento de color** a la izquierda de cada fila: el estado se lee de un vistazo.
- **Badge de `pendiente_firma` con `animate-pulse`**: señala que espera un cambio
  externo.
- **Aviso "Esperando firma · se actualiza solo"** en la barra de resumen. Sin
  esto el usuario no sabe si tiene que recargar.
- **Candado en lugar del menú** cuando el documento está en flujo de firma: la UI
  refleja el bloqueo en vez de dejar que la acción falle con 409.

### 10.2 Auto-actualización sin recargar

El webhook actualiza la BD, pero la pestaña abierta necesita notarlo:

```ts
const esperandoFirma = docs.some((d) => d.estado === "pendiente_firma");

// `load` va por ref: si fuera dependencia, el intervalo se reiniciaría en cada
// render y nunca llegaría a cumplirse.
const loadRef = useRef(load);
loadRef.current = load;

useEffect(() => {
  if (!esperandoFirma) return;
  const timer = setInterval(() => void loadRef.current(true), 15_000);
  return () => clearInterval(timer);
}, [esperandoFirma]);
```

Solo hace polling cuando hay algo esperando firma, y se desmonta al no haberlo.
Más un refresco al volver a la pestaña (`visibilitychange`) para no esperar el
ciclo completo.

### 10.3 Recarga silenciosa vs. con spinner

```ts
refetch()  // con spinner: carga inicial, reintento tras error
refresh()  // silencioso: tras subir, polling
```

En modo silencioso los errores **no** se muestran: si la subida ya fue exitosa,
decirle "error" a alguien cuyo archivo sí se guardó es confuso. Aparecerá en la
próxima recarga.

### 10.4 Velo de trabajo (`BusyOverlay`)

Overlay traslúcido con el logo, en vez de reemplazar la pantalla: el contenido
sigue visible detrás y no se pierde el contexto. Un solo estado
`busy: string | null` — el mensaje *es* la señal, no hace falta un booleano
aparte. Cada handler usa `try/finally` para que el velo se quite incluso si la
petición falla.

Con React Query, si la mutación invalida sin `await`, el velo desaparece antes de
que la lista recargue:

```ts
onSuccess: async () => {
  await Promise.all([
    qc.refetchQueries({ queryKey: ["solicitudes"] }),
    qc.refetchQueries({ queryKey: ["solicitudes-conteo"] }),
  ]);
},
```

### 10.5 Subida con progreso

`XMLHttpRequest`, no `fetch`: es la única forma de tener progreso real
(`xhr.upload.onprogress`). Se aborta en el `useEffect` de limpieza al desmontar.

La validación de tipo y tamaño está **duplicada** a propósito: el frontend para
dar feedback inmediato, el servidor porque el cliente es manipulable.

---

## 11. Contrato HTTP

```
POST   /api/usuario/documentos/guardar
       multipart: file, radicado, tipo_documento?
       → 201 { ok, documento }

GET    /api/usuario/documentos/radicado/{radicado}
       → 200 { ok, documentos: DocumentoDTO[] }

GET    /api/usuario/documentos/download?id={id}&radicado={r}&mode=view|download
       → 200 binario (Content-Disposition inline|attachment)

PATCH  /api/usuario/documentos/{id}?radicado={r}
       body: { "estado": "validado" }
       → 200 { ok, documento }

DELETE /api/usuario/documentos/{id}?radicado={r}
       → 200 { ok }

POST   /api/usuario/documentos/{id}/firmar?radicado={r}
       body: { firmante: { nombre, email?, celular? },
               canales:  { email: bool, whatsapp: bool } }
       → 201 { ok, firmaId, zapsignToken, signUrl }

POST   /api/usuario/documentos/{id}/sincronizar-firma?radicado={r}
       → 200 { ok, action, message }

POST   /api/webhooks/zapsign?secret={secret}      ← público
       → 200 { ok, action } | { ok, ignored }
```

Códigos que devuelve el dominio: `400` datos faltantes · `403` no pertenece /
estado de sistema · `404` no encontrado · `409` ya en firma / ya firmado ·
`413` >10MB · `415` formato no permitido · `422` ZapSign rechazó · `502` ZapSign
no respondió bien · `503` sin configurar.

---

## 12. Orden de implementación sugerido

1. **Schema + `db push`** — verificar el SQL con `migrate diff` antes.
2. **`lib/documentos.ts`** — cliente de Azure y operaciones.
3. **Rutas de guardar / listar / download** — probar con Postman.
4. **UI: lista y subida.**
5. **Rutas de estado / borrado** + dropdown.
6. **`lib/zapsign.ts` + ruta de firmar** — probar que ZapSign responde.
7. **Webhook** + excepción en `auth.config.ts` + ngrok.
8. **Polling y velos de carga.**

Los pasos 1–5 ya dan un módulo de documentos funcional. El 6–7 agrega la firma.

---

## 13. Cómo probar el lib sin HTTP

Los endpoints exigen sesión, lo que complica probarlos con Postman. Es más
directo ejercitar el lib contra la BD y el blob reales:

```bash
# archivo .ts DENTRO del proyecto (para que resuelva node_modules y el alias @/)
cat > ./_prueba.ts <<'EOF'
const D = require("./src/lib/documentos");
const { prisma } = require("./src/lib/prisma");

async function main() {
  const doc = await D.guardarDocumento({
    radicado: "<uno que exista>",
    file: new File([new Uint8Array(pdfBuffer)], "x.pdf", { type: "application/pdf" }),
  });
  console.log(doc);
  await prisma.documentos.delete({ where: { id: BigInt(doc.id) } });
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
EOF
npx tsx ./_prueba.ts; rm -f ./_prueba.ts
```

> Usar `.ts` con `require`, **no** `.mts` con `import`: en ESM puro el alias `@/`
> del proyecto no resuelve y las clases exportadas fallan al instanciarse.

Para el webhook, un servidor HTTP local hace de `signed_file`:

```ts
const http = require("http");
const srv = http.createServer((_q, s) => {
  s.writeHead(200, { "Content-Type": "application/pdf" });
  s.end(pdfFirmadoBuffer);
});
await new Promise((res) => srv.listen(0, res));
const url = `http://127.0.0.1:${srv.address().port}/f.pdf`;
await Z.procesarWebhook({ event_type: "doc_signed", token: TOKEN, signed_file: url });
```

### Casos que conviene cubrir

- Radicado inexistente → 404 (la FK protege)
- Tipo de archivo no permitido → 415
- Radicado ajeno en cada operación → 403
- Estado de sistema sin `permitirSistema` → 403
- Cambio manual sobre documento en firma → 409
- Eliminar documento en firma → 409
- Borrado lógico: fuera del listado, fila y blob conservados
- Webhook: token desconocido, evento intermedio, firmado, **mismo evento dos
  veces** (idempotencia)

---

## 14. Checklist de seguridad

- [ ] `ZAPSIGN_TOKEN` **sin** `NEXT_PUBLIC_`
- [ ] `/api/webhooks/` exceptuado del guard, y el secret validado
- [ ] El webhook responde 404 (no 401) con secret inválido
- [ ] La cédula se deriva de la BD, no del cliente
- [ ] Toda operación por id verifica también el radicado
- [ ] Tipo MIME y tamaño validados en el **servidor**
- [ ] La cédula se sanea (`replace(/[^0-9]/g, "")`) antes de usarla en un path
- [ ] El contenedor de Azure es privado; los archivos se sirven por proxy
- [ ] Los estados de sistema no son asignables por HTTP público
- [ ] Si expusiste el token de ZapSign (captura, log), **renovarlo**

---

## 15. Errores que costaron tiempo

| Síntoma | Causa |
|---|---|
| Webhook nunca llega, ngrok muestra 401 | `/api/` protegido por el middleware; falta exceptuar `/api/webhooks/` |
| Campo del payload sale vacío en la UI | `Number("$3.500.000")` → `NaN` → `null`. Usar el campo numérico del payload, no el formateado |
| El velo de carga desaparece antes de tiempo | `invalidateQueries` sin `await` en `onSuccess` |
| El polling nunca dispara | `load` como dependencia del `useEffect` reinicia el intervalo en cada render; usar `useRef` |
| `prisma generate` falla con EPERM | El dev server tiene tomado el `.dll`; cerrar y borrar los `.tmp*` |
| Fila que apunta a un blob inexistente | INSERT antes del upload, o sin compensación al fallar |
| Documento "firmado" sin que nadie firmara | Estados de sistema ofrecidos como opción manual |

---

## 16. Limpieza de código muerto

Al final del refactor, `knip` encontró 12 archivos y 15 exports sin uso:

```bash
npx knip --no-progress --reporter compact
```

Interpretar con criterio: marca como muertos los componentes de shadcn que se
agregan por CLI y los emails que se importan por `default`. Lo que sí conviene
borrar son cadenas completas (p. ej. un hook que solo usa un componente que nadie
importa) y los `export` de símbolos que solo se usan dentro de su propio módulo
— quitarles el `export` reduce la API pública sin borrar nada.
