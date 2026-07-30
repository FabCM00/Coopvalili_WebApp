# ZapSign — Firma electrónica de documentos

> **Estado: diseño aprobado, sin implementar.** No hay código de ZapSign en el
> repo todavía. Este documento recopila las decisiones tomadas.

## 1. Objetivo

Que un colaborador, desde el menú de 3 puntitos de un documento ya subido,
elija **"Firmar"** y el sistema envíe el documento a firma electrónica,
avisando al cliente por correo y/o WhatsApp.

Flujo:

1. Colaborador abre los 3 puntitos → **Firmar**
2. Modal pide/confirma email y celular del firmante + canales de aviso
3. Backend baja el PDF del blob → lo convierte a base64
4. `POST` a ZapSign con `base64_pdf` + `signers[]`
5. ZapSign avisa al cliente (si `send_automatic_email` / `send_automatic_whatsapp`)
6. Cliente firma → ZapSign notifica por **webhook** → se guarda el PDF firmado

## 2. Lo que YA existe (no hay que escribirlo)

| Necesidad | Ya resuelto en |
|---|---|
| Bajar el PDF del blob | `getDocumentBuffer()` — [azure-blob.ts:259](../src/lib/azure-blob.ts#L259) |
| Convertir a base64 | `doc.buffer.toString("base64")` — una línea |
| Validar que el blob es de esa cédula | dentro de `getDocumentBuffer` — [azure-blob.ts:265](../src/lib/azure-blob.ts#L265) |
| Guardar el PDF firmado (idempotente) | `materializeBlob()` — [azure-blob.ts:191](../src/lib/azure-blob.ts#L191) |
| Límite de 10 MB (= el de ZapSign) | `MAX_DOCUMENT_BYTES` — [azure-blob.ts:15](../src/lib/azure-blob.ts#L15) |
| Datos del firmante (nombre/email/celular) | `mapValida1()` — [bandeja-mappers.ts:59-64](../src/lib/bandeja-mappers.ts#L59-L64) |
| Menú de 3 puntitos (dropdown) | [DocumentList.tsx:106-148](../src/components/bandeja/documentos/DocumentList.tsx#L106-L148) |
| Patrón de servicio externo a copiar | [mailer.tsx](../src/lib/mailer.tsx) |

## 3. Archivos nuevos

Solo dos para el flujo base. Sin carpeta nueva, sin subarchivos.

```
src/lib/zapsign.ts                              ← cliente + tipos + lógica
src/app/api/usuario/documentos/firmar/route.ts  ← endpoint
```

`/firmar` va en subcarpeta porque el `POST` de
[documentos/route.ts:44](../src/app/api/usuario/documentos/route.ts#L44) ya está
ocupado por el upload.

## 4. Variables de entorno

```bash
# ZapSign — firma electrónica de documentos
ZAPSIGN_API_URL=https://api.zapsign.com.br/api/v1
ZAPSIGN_TOKEN=c7f35c84-7893-4087-b4fb-d1f06c23
```

Decisiones:

- **Prefijo `ZAPSIGN_`**, no sufijo `_ZAP` — agrupa por servicio al inicio igual
  que `AZURE_BLOB_*` y `AZURE_EMAIL_*`, así se leen juntas en el `.env`.
- **URL base sin `/docs/`** — después se necesitan más endpoints (detalle del
  documento, webhooks). Guardar la ruta completa amarra el cliente a uno solo.
- **`ZAPSIGN_TOKEN` nunca lleva `NEXT_PUBLIC_`** — ese prefijo compila la
  variable dentro del bundle del navegador y el token queda público. Todo el
  consumo de ZapSign es del lado servidor.

## 5. Estructura de `lib/zapsign.ts`

Molde de [mailer.tsx](../src/lib/mailer.tsx): env vars arriba, helper privado de
transporte, funciones exportadas con nombre de negocio.

```ts
const API_URL = (process.env.ZAPSIGN_API_URL ?? "").replace(/\/$/, "");
const TOKEN = process.env.ZAPSIGN_TOKEN!;
```

El `.replace(/\/$/, "")` es el mismo truco de
[mailer.tsx:12](../src/lib/mailer.tsx#L12): da igual si en `.env` quedó con
slash final.

Tres piezas dentro:

1. **Helper privado de transporte** (no exportado) — centraliza el header
   `Authorization: Bearer ${TOKEN}` y el manejo de errores:
   ```ts
   async function zapFetch(path: string, body: unknown) { … }
   ```
   Todo pasa por acá. Si cambian el header o hay que agregar reintentos, es un
   solo punto.

2. **Tipos del contrato** — `ZapSignSigner`, `ZapSignDocument` (respuesta con
   `token`, `status`, `signers[].sign_url`).

3. **Una función de negocio exportada** — lo único que consume el route:
   ```ts
   export async function enviarDocumentoAFirma({
     cedula, documentoId, radicado, firmante, canales
   }): Promise<ZapSignDocument>
   ```
   Adentro: `getDocumentBuffer()` → base64 → payload → `zapFetch("/docs/", …)`.

**Clave del diseño:** el route no sabe que ZapSign existe, solo llama
`enviarDocumentoAFirma(...)`. Si cambian de proveedor, se toca un archivo.

## 6. Payload — de dónde sale cada campo

| Campo ZapSign | Origen |
|---|---|
| `base64_pdf` | `getDocumentBuffer()` → `.toString("base64")` |
| `name` | `doc.name` (nombre original del blob) |
| `external_id` | **el `radicado`** — amarra la firma a la solicitud |
| `lang` | `"es"` fijo |
| `signers[0].name` | `v1.nombre` + `v1.primer_apellido` |
| `signers[0].email` | `v1.email` |
| `signers[0].phone_number` | `v1.celular` |
| `signers[0].phone_country` | `"57"` fijo (Colombia) |
| `require_document_data` | `{document_country:"co", document_type:"national_id", document_number: cedula}` |

`base64_pdf` (no `url_pdf`) porque los documentos están en Azure Blob privado —
con `url_pdf` habría que exponerlos públicamente.

`external_id` con el radicado es lo que hace el flujo rastreable después.

## 7. Endpoint

```
POST /api/usuario/documentos/firmar?cedula=X&id=Y
body: { radicado, canales: { email: bool, whatsapp: bool } }
```

Copia la estructura de
[documentos/route.ts:44-81](../src/app/api/usuario/documentos/route.ts#L44-L81):
`auth()` primero, `sanitizeCedula()`, `try/catch` devolviendo `{ok, message}`.

## 8. Persistencia (sin esto no sirve de nada)

La respuesta trae `token` y `sign_url`. Si no se guardan, al cerrar el modal
nadie sabe qué se mandó a firmar ni puede reenviar el link.

```
firma_solicitudes: radicado, documento_id (blob), zapsign_token,
                   status, sign_url, firmante_email, enviado_por,
                   created_at, signed_at
```

> **Prisma: `db push` únicamente.** Nunca `prisma migrate dev/reset` en este
> repo — riesgo de tumbar datos de producción.

## 9. Webhook (la otra mitad del flujo)

Sin webhook nunca se sabe que el cliente firmó.

```
POST /api/webhooks/zapsign     ← público, FUERA de auth()
```

Recibe el evento, busca por `external_id` / `token`, actualiza el estado.

**Advertencia de la doc oficial:** `signed_file` y `original_file` **expiran a
los 60 minutos**. No se pueden guardar esas URLs en BD. Al llegar el webhook de
firmado hay que descargar el PDF y meterlo al blob con `materializeBlob()`
(que además es idempotente, no duplica).

La documentación de webhooks está en otra página, no en la de "Crear documento
via Upload".

## 10. UI

Un componente nuevo en
[components/bandeja/documentos/](../src/components/bandeja/documentos/), al lado
de `UploadDocumentModal.tsx` que ya sigue ese patrón.

- Entrada: nuevo `DropdownMenuItem` "Firmar" en
  [DocumentList.tsx:140](../src/components/bandeja/documentos/DocumentList.tsx#L140)
  (junto al separador, antes de "Eliminar")
- Modal: email y celular prellenados desde `valida1_results`, editables
- Checkboxes de canal (email / WhatsApp)

## 11. Costos y autenticación del firmante

| Concepto | Costo |
|---|---|
| Email (`send_automatic_email`) | Gratis |
| `auth_mode: "assinaturaTela"` / `"tokenEmail"` / `"tokenSms"` | Gratis |
| WhatsApp (`send_automatic_whatsapp`) | Créditos comprados |
| `auth_mode: "tokenWhatsapp"` | 5 créditos ≈ USD $0.10 |
| `selfie_validation_type: "identity-verification"` (CO) | 55 créditos ≈ USD $1.00 |

**Recomendación:** WhatsApp detrás de un checkbox **apagado por defecto**, y
validar el plan/créditos con ZapSign antes de habilitarlo. Arrancar con email.

## 12. Orden de implementación

1. Env vars + `lib/zapsign.ts` + route → probar que ZapSign responde
2. Tabla `firma_solicitudes` (`db push`) → persistir token y `sign_url`
3. Modal en los 3 puntitos
4. Webhook + descarga del PDF firmado

Los pasos 1–3 ya sirven solos: se manda a firmar y el cliente recibe el correo.
El paso 4 es el que cierra el ciclo.

## 13. Pendientes de decidir

- ¿Un solo firmante (el asociado) o varios (codeudor, testigo)? El diseño actual
  asume uno; `signers` es un array y soporta más con `order_group` +
  `signature_order_active`.
- ¿Qué `auth_mode` se exige? Afecta costo y fricción del firmante.
- ¿El documento firmado reemplaza el original en el blob o se guarda aparte?
- ¿Se permite reenviar el link de firma si el cliente no firmó?

## Referencias

- Crear documento via Upload: `POST https://api.zapsign.com.br/api/v1/docs/`
- Créditos: Ajustes > Planes > Créditos en la cuenta de ZapSign
- Base64: enviar **sin** el prefijo `data:application/pdf;base64,`
