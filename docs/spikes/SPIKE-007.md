# SPIKE-007: Attachment Implementation Architecture for PM12-CORE

**Status:** Complete  
**Date:** 2026-06-25  
**Author:** Principal Architect  
**Applies to:** PM12-CORE (risk attachments first slice) and subsequent attachment phases

---

## Context

Phase 12 adds file attachments to risks, Risk Response Actions, and review records. ADR-0006 (accepted 2026-05-07) fixed the storage backend as local filesystem with a `StorageProvider` abstraction. This spike translates ADR-0006 into a concrete implementation architecture and defines the smallest coherent first slice — risk attachments only — that can be delivered in one release as PM12-CORE.

---

## Findings

### 1. What storage decisions are fixed by ADR-0006, and what remains open?

ADR-0006 fixed the following — none of these are open for reconsideration in PM12-CORE:

- **Storage mechanism:** local filesystem, named Docker volume (`attachments`), no S3 or MinIO.
- **`StorageProvider` interface:** defined in `backend/src/services/storage/`. The four-method contract (`put`, `get`, `delete`, `exists`) is binding for `LocalFileStorageProvider` and any future `S3StorageProvider`.
- **Storage key scheme:** UUID keys only. Original filename is stored in the `Attachment` metadata table (`originalName`). No filename-derived paths on disk.
- **Download mechanism:** proxied through Express. No signed URL redirect. Permission check happens in the Express route before the `StorageProvider.get()` call.
- **Link table topology:** three typed link tables (`RiskAttachment`, `ActionAttachment`, `ReviewAttachment`), not a polymorphic table.
- **Soft delete mechanism:** `Attachment.deletedAt` nullable timestamp. Physical file deletion is deferred to an orphan cleanup job (PM12-06).
- **Environment variables:** `ATTACHMENT_STORAGE_PROVIDER`, `ATTACHMENT_STORAGE_LOCAL_PATH`, `ATTACHMENT_MAX_SIZE_MB`, `ATTACHMENT_ALLOWED_MIME_TYPES` — values and semantics are fixed.
- **MIME validation stance:** server-side detected MIME type using a library such as `file-type`, not the client-supplied `Content-Type` header.
- **Docker Compose additions:** `attachments` named volume, mounted at `/app/storage` in the `app` service.

What remains open for implementation design (not fixed by ADR-0006):

- Which middleware library handles `multipart/form-data` parsing (e.g. `multer` — see recommendation below).
- Exact Express router nesting and file naming conventions.
- The precise Prisma schema (column names, indexes, FK behaviour, cascade rules).
- Permission matrix detail for attachments (upload, download, soft-delete, hard-delete — not specified in ADR-0006).
- Audit event set and audit level for attachment operations.
- Whether `LocalFileStorageProvider` stores files in subdirectories or a flat layout under `ATTACHMENT_STORAGE_LOCAL_PATH`.
- File extension allow/block list enforcement in addition to MIME type checking.
- Whether `ATTACHMENT_MAX_SIZE_MB` is enforced at middleware parse time, in service logic, or both.

### 2. Does the current schema have any attachment-related tables?

No. The current `backend/prisma/schema.prisma` contains no attachment-related models, columns, or enums. This is entirely greenfield. The `AuditObjectType` enum does not include an `ATTACHMENT` value. The schema additions described in the recommendations below are the complete first-schema footprint.

---

## Recommendations

### 1. Prisma Schema

The following schema additions are required for PM12-CORE. `ActionAttachment` and `ReviewAttachment` are included as stubs to keep the migration path open; they carry no routes or logic in PM12-CORE.

**New enum value — add to `AuditObjectType`:**

```prisma
ATTACHMENT
```

**New model — `Attachment`:**

```prisma
model Attachment {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  storageKey   String    @unique @map("storage_key")         // UUID used as on-disk filename
  originalName String    @map("original_name")               // original filename for Content-Disposition
  mimeType     String    @map("mime_type")                   // server-detected MIME type
  sizeBytes    Int       @map("size_bytes")

  uploadedByUserId String   @map("uploaded_by_user_id") @db.Uuid
  uploadedAt       DateTime @default(now()) @map("uploaded_at") @db.Timestamptz(6)

  deletedAt       DateTime? @map("deleted_at") @db.Timestamptz(6)
  deletedByUserId String?   @map("deleted_by_user_id") @db.Uuid

  uploadedBy User  @relation("AttachmentUploadedBy", fields: [uploadedByUserId], references: [id], onDelete: Restrict)
  deletedBy  User? @relation("AttachmentDeletedBy", fields: [deletedByUserId], references: [id], onDelete: SetNull)

  riskLinks   RiskAttachment[]

  @@index([uploadedByUserId])
  @@index([deletedAt])
  @@map("attachment")
}
```

**New model — `RiskAttachment` (PM12-CORE link table):**

```prisma
model RiskAttachment {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  riskId       String   @map("risk_id") @db.Uuid
  registerId   String   @map("register_id") @db.Uuid
  attachmentId String   @map("attachment_id") @db.Uuid
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  createdByUserId String @map("created_by_user_id") @db.Uuid

  risk       Risk       @relation(fields: [riskId], references: [id], onDelete: Cascade)
  register   Register   @relation(fields: [registerId], references: [id], onDelete: Cascade)
  attachment Attachment @relation(fields: [attachmentId], references: [id], onDelete: Cascade)
  createdBy  User       @relation("RiskAttachmentCreatedBy", fields: [createdByUserId], references: [id], onDelete: Restrict)

  @@unique([riskId, attachmentId])
  @@index([riskId])
  @@index([registerId])
  @@index([attachmentId])
  @@map("risk_attachment")
}
```

**Stub models for follow-on phases (no routes in PM12-CORE — include in schema migration now to avoid a later destructive migration):**

```prisma
model ActionAttachment {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  responseActionId String   @map("response_action_id") @db.Uuid
  registerId       String   @map("register_id") @db.Uuid
  attachmentId     String   @map("attachment_id") @db.Uuid
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  createdByUserId  String   @map("created_by_user_id") @db.Uuid

  responseAction ResponseAction @relation(fields: [responseActionId], references: [id], onDelete: Cascade)
  register       Register       @relation(fields: [registerId], references: [id], onDelete: Cascade)
  attachment     Attachment     @relation(fields: [attachmentId], references: [id], onDelete: Cascade)
  createdBy      User           @relation("ActionAttachmentCreatedBy", fields: [createdByUserId], references: [id], onDelete: Restrict)

  @@unique([responseActionId, attachmentId])
  @@index([responseActionId])
  @@index([attachmentId])
  @@map("action_attachment")
}

model ReviewAttachment {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  riskReviewId String   @map("risk_review_id") @db.Uuid
  registerId   String   @map("register_id") @db.Uuid
  attachmentId String   @map("attachment_id") @db.Uuid
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  createdByUserId String @map("created_by_user_id") @db.Uuid

  riskReview RiskReview @relation(fields: [riskReviewId], references: [id], onDelete: Cascade)
  register   Register   @relation(fields: [registerId], references: [id], onDelete: Cascade)
  attachment Attachment @relation(fields: [attachmentId], references: [id], onDelete: Cascade)
  createdBy  User       @relation("ReviewAttachmentCreatedBy", fields: [createdByUserId], references: [id], onDelete: Restrict)

  @@unique([riskReviewId, attachmentId])
  @@index([riskReviewId])
  @@index([attachmentId])
  @@map("review_attachment")
}
```

**Back-references required on existing models:**

- `Risk` — add `attachments RiskAttachment[]`
- `Register` — add `riskAttachments RiskAttachment[]`, `actionAttachments ActionAttachment[]`, `reviewAttachments ReviewAttachment[]`
- `ResponseAction` — add `attachments ActionAttachment[]`
- `RiskReview` — add `attachments ReviewAttachment[]`
- `User` — add the four new `@relation` back-references for upload, delete, and link-created relationships

**Notes on design choices:**

- `storageKey` is unique at the `attachment` table level. One physical file, one `Attachment` row. Each link table row connects a parent record to an `Attachment`. This means a single file can appear on multiple risks via separate `RiskAttachment` rows if the product ever needs it (unlikely, but the schema supports it without change).
- `sizeBytes` is stored as `Int` (PostgreSQL `integer`, max ~2.1 GB). This is sufficient given the `ATTACHMENT_MAX_SIZE_MB` default of 25. If the default is raised to a very large value in future, this column type should be revisited; `BigInt` is the fallback.
- `onDelete: Cascade` on the link tables means deleting a `Risk` cascades to `RiskAttachment` rows. The `Attachment` row itself is not deleted by cascade — it waits for the orphan cleanup job. This is correct: the physical file should not disappear synchronously during a risk delete.
- `registerId` is denormalised onto `RiskAttachment` to enable efficient register-scoped queries without joining through `risk`. This matches the pattern used on `RiskResponseAction`.

---

### 2. Permission Model

The following permission matrix applies to risk attachments in PM12-CORE. All enforcement is on the backend; the frontend may mirror the rules but must not be the sole gatekeeper.

| Operation | System Admin | Register Admin | Register Viewer | Risk Owner |
|---|:---:|:---:|:---:|:---:|
| Upload attachment to risk | Yes | Yes | No | Yes (own risk only) |
| List attachments on risk | Yes | Yes | Yes | Yes (own risk only) |
| Download attachment from risk | Yes | Yes | Yes | Yes (own risk only) |
| Soft-delete own upload | Yes | Yes | No | Yes (own upload, own risk) |
| Soft-delete any attachment on risk | Yes | Yes | No | No |
| Hard-delete (orphan cleanup) | System process only | — | — | — |

**Rules and rationale:**

- **Register Viewer** has list and download access. Attachments are contextual evidence for risks; a Viewer who can read the risk can read its attachments. Viewers cannot upload or delete.
- **Risk Owner** has upload and download for their own risk. A Risk Owner can soft-delete an attachment they uploaded on their own risk. They cannot delete attachments uploaded by other users on the same risk.
- **Upload permission check path:** verify risk-edit access (System Admin, Register Admin, or Risk Owner for the specific risk), then proceed with upload. This reuses the existing risk-edit access check defined in the permission model.
- **Download permission check path:** verify risk-view access (System Admin, Register Admin, Register Viewer, or Risk Owner for the specific risk). This reuses the existing risk-view access check.
- **Soft-delete permission check path:** verify risk-edit access AND (actor is System Admin OR actor is Register Admin OR `attachment.uploadedByUserId === actor.id`).
- **Hard delete** is not exposed as a user-facing route in PM12-CORE. The orphan cleanup job in PM12-06 performs physical file deletion; it runs as a system process with no user permission check path. Physical deletion of a non-orphaned attachment (one with an active link row) must be refused by the cleanup job.
- **Soft-deleted attachments:** once `deletedAt` is set, the attachment must not appear in list responses and must return `404` on download attempts. The link row is retained for the duration of the soft-delete window to support the orphan cleanup job's eligibility check.

---

### 3. API Shape

All routes are under `/api/v1/registers/:registerId/risks/:riskId/attachments`. This nesting is consistent with the resource-ownership hierarchy already used in the codebase (risks are owned by registers).

**Upload — POST `/api/v1/registers/:registerId/risks/:riskId/attachments`**

- Content-Type: `multipart/form-data`
- Form field: `file` (single file per request)
- Required permission: risk-edit access
- Processing:
  1. Parse with `multer` (memory storage, enforcing `ATTACHMENT_MAX_SIZE_MB` limit at parse time)
  2. Detect MIME type from the parsed buffer using `file-type` library
  3. Validate detected MIME type against `ATTACHMENT_ALLOWED_MIME_TYPES`
  4. Validate file extension against the allow list (see Recommendation 4)
  5. Generate UUID storage key
  6. Call `storageProvider.put(storageKey, buffer, mimeType)`
  7. Create `Attachment` row and `RiskAttachment` row in a Prisma transaction
  8. Write `RISK_ATTACHMENT_UPLOADED` audit event in the same transaction
- Success response: `201` with `{ "data": { "id": "...", "originalName": "...", "mimeType": "...", "sizeBytes": ..., "uploadedAt": "...", "uploadedBy": { "id": "...", "name": "..." } } }`
- Storage write happens before the transaction commit. If the transaction fails after `storageProvider.put()`, the orphan cleanup job will collect the dangling file. This is acceptable and documented in ADR-0006.

**List — GET `/api/v1/registers/:registerId/risks/:riskId/attachments`**

- Required permission: risk-view access
- Returns all non-soft-deleted attachments for the risk, ordered by `uploadedAt` ascending
- Response shape: `{ "data": [ { "id", "originalName", "mimeType", "sizeBytes", "uploadedAt", "uploadedBy": { "id", "name" }, "canDelete": boolean } ] }`
- `canDelete` is computed server-side per the soft-delete permission rules and returned as a client hint; it must not be trusted as the sole enforcement mechanism
- No pagination required in PM12-CORE (practical attachment count per risk is small)

**Download — GET `/api/v1/registers/:registerId/risks/:riskId/attachments/:attachmentId/download`**

- Required permission: risk-view access
- Processing:
  1. Load `RiskAttachment` row (verify `riskId` and `registerId` match, verify `attachment.deletedAt` is null)
  2. Call `storageProvider.get(attachment.storageKey)`
  3. Stream response with:
     - `Content-Type: <attachment.mimeType>`
     - `Content-Disposition: attachment; filename="<attachment.originalName>"`
     - `Content-Length: <attachment.sizeBytes>`
- Returns `404` if the link row does not exist, the attachment is soft-deleted, or the risk does not belong to the register
- Returns `500` (mapped to `INTERNAL_ERROR`) if `storageProvider.get()` fails — do not expose the storage path or error detail

**Soft-delete — DELETE `/api/v1/registers/:registerId/risks/:riskId/attachments/:attachmentId`**

- Required permission: see permission matrix above (risk-edit + ownership or admin)
- Sets `Attachment.deletedAt` and `Attachment.deletedByUserId` in a transaction with the audit event
- Response: `200` with `{ "data": { "id": "..." } }`
- Does not remove the physical file or the `RiskAttachment` link row — the orphan cleanup job handles physical deletion

---

### 4. File Safety Controls

**MIME type validation (required, server-side):**

Use the `file-type` npm package to detect MIME type from the first bytes of the file buffer. Do not trust the client-supplied `Content-Type` header in the multipart form data. If `file-type` cannot detect a type (returns `undefined`), reject the upload with `422 UNPROCESSABLE`.

The allowed MIME list from ADR-0006 (read from `ATTACHMENT_ALLOWED_MIME_TYPES` env var, defaulting to the value in ADR-0006) is the accept list. If the detected type is not in the list, reject with `422`.

**File extension validation (defence in depth):**

Before MIME detection, check that the original filename extension maps to an expected extension for the allowed MIME types. The mapping to enforce (not exhaustive — extend as MIME list grows):

| MIME type | Permitted extensions |
|---|---|
| `application/pdf` | `.pdf` |
| `image/jpeg` | `.jpg`, `.jpeg` |
| `image/png` | `.png` |
| `image/gif` | `.gif` |
| `image/webp` | `.webp` |
| `text/plain` | `.txt` |
| `application/msword` | `.doc` |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.docx` |
| `application/vnd.ms-excel` | `.xls` |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `.xlsx` |

A mismatched extension (e.g. `malware.exe` renamed to `report.pdf`) will be caught first by the extension check before the MIME detection. Return `422 UNPROCESSABLE` with `error.code = "UNSUPPORTED_FILE_TYPE"`.

**File size limit:**

Enforce at two points:

1. `multer` middleware: set `limits.fileSize` to `ATTACHMENT_MAX_SIZE_MB * 1024 * 1024`. `multer` aborts the upload stream if the limit is exceeded and emits a `LIMIT_FILE_SIZE` error. Handle this in Express error middleware and return `422 UNPROCESSABLE` with `error.code = "FILE_TOO_LARGE"` and a message referencing the configured limit.
2. Service layer: after `multer` parses the buffer, assert `buffer.length <= limit` as a secondary check before calling `storageProvider.put()`. This is a belt-and-suspenders guard.

**Single file per request:**

`multer` is configured to accept exactly one file per upload request (`.single('file')`). Multiple files must be uploaded as separate requests.

**Enforcement location:**

MIME validation and extension validation live in the upload service layer (called by the route handler after `multer` middleware), not in the `multer` `fileFilter` callback. `multer`'s `fileFilter` fires before the full buffer is available for `file-type` detection. The service layer receives the complete buffer and performs both checks before calling `storageProvider.put()`.

---

### 5. Audit Model

**New audit actions required (add to `AuditActions` constants and to `AuditObjectType` enum):**

| Action constant | Scope | Object type | Description |
|---|---|---|---|
| `RISK_ATTACHMENT_UPLOADED` | `RISK` | `ATTACHMENT` | File uploaded to a risk |
| `RISK_ATTACHMENT_DELETED` | `RISK` | `ATTACHMENT` | Attachment soft-deleted from a risk |

Both events are `RISK`-scoped: set `scopeType = RISK`, populate `registerId`, `registerDisplayName`, `riskId`, and `displayRiskId` on the audit event. This makes attachment activity visible in the risk's own audit trail.

**No `ATTACHMENT` deletion snapshot is required.** Soft delete sets `deletedAt` and the original `Attachment` row is retained. The physical file is not removed at soft-delete time. There is no hard-deleted row to snapshot. If a hard-delete route is ever introduced (not in PM12-CORE), a snapshot requirement should be evaluated at that point.

**Event construction for `RISK_ATTACHMENT_UPLOADED`:**

- `objectId`: the new `Attachment.id`
- `objectDisplayName`: the `originalName`
- `summary`: `"Attachment '<originalName>' uploaded to risk <displayRiskId>"` (truncate `originalName` at 80 chars if needed)
- `metadataJson`: `{ mimeType, sizeBytes, storageKey }` — include `storageKey` to support forensic correlation with the filesystem if needed, but this field must never be returned in API responses

**Event construction for `RISK_ATTACHMENT_DELETED`:**

- `objectId`: the `Attachment.id`
- `objectDisplayName`: the `originalName`
- `summary`: `"Attachment '<originalName>' deleted from risk <displayRiskId>"`
- `metadataJson`: `{ deletedAt, originalName, mimeType, sizeBytes }` — record these at deletion time because the row may eventually be physically purged by the cleanup job

**Transaction requirement:** both audit events must commit in the same Prisma transaction as the business change (`Attachment` create / `deletedAt` update). If the audit write fails, the business mutation rolls back.

**Audit access:** attachment audit events are `RISK`-scoped, so they appear in the risk's audit trail. Access follows the existing risk audit access rule: any user with risk-view access can see risk-scoped audit events for that risk. No new audit access rule is required.

---

### 6. First Slice Scope (PM12-CORE)

**In scope for PM12-CORE:**

- `Attachment`, `RiskAttachment`, `ActionAttachment` (stub), `ReviewAttachment` (stub) Prisma models and migration
- `ATTACHMENT` added to `AuditObjectType` enum
- `ATTACHMENT_STORAGE_PROVIDER`, `ATTACHMENT_STORAGE_LOCAL_PATH`, `ATTACHMENT_MAX_SIZE_MB`, `ATTACHMENT_ALLOWED_MIME_TYPES` env vars wired up at application startup
- `StorageProvider` interface at `backend/src/services/storage/storageProvider.ts`
- `LocalFileStorageProvider` implementation (creates storage directory on startup if absent)
- Upload middleware using `multer` (memory storage)
- `file-type` library for server-side MIME detection
- `AttachmentService` in `backend/src/services/attachmentService.ts` (upload, list, download, soft-delete)
- Four routes under `/api/v1/registers/:registerId/risks/:riskId/attachments` (upload, list, download, soft-delete)
- Permission enforcement per the matrix in Recommendation 2
- `RISK_ATTACHMENT_UPLOADED` and `RISK_ATTACHMENT_DELETED` audit events
- Docker Compose `attachments` volume addition
- Frontend: attachment list panel on the risk detail page, upload control, download link per attachment, delete button (shown only when `canDelete = true`)

**Acceptance criteria for PM12-CORE:**

1. A Register Admin can upload a PDF to a risk via the UI. The file appears in the attachment list with correct filename, type, and size.
2. A Register Viewer can see the attachment list and download the file. The downloaded file is byte-identical to the uploaded file.
3. A Risk Owner can upload to their own risk and download their own attachment. They cannot see an attachment list on a risk they do not own.
4. A Register Viewer cannot upload; the upload button is absent in the UI and the POST route returns `403`.
5. Uploading a file with a disallowed extension (e.g. `.exe`) is rejected with `422` before any byte is written to storage.
6. Uploading a file larger than `ATTACHMENT_MAX_SIZE_MB` is rejected with `422`.
7. Uploading a file whose detected MIME type does not match its extension (e.g. an `.exe` renamed to `.pdf`) is rejected with `422`.
8. Soft-deleting an attachment removes it from the list and prevents download. The `Attachment` row exists in the database with `deletedAt` set. No file is removed from the filesystem.
9. The risk audit trail shows `RISK_ATTACHMENT_UPLOADED` and `RISK_ATTACHMENT_DELETED` events with the correct actor and file name.
10. The `attachments` Docker volume survives a `docker compose down` / `docker compose up` cycle with files intact.
11. `ActionAttachment` and `ReviewAttachment` tables exist in the database (created by the migration) and have no routes or UI in PM12-CORE.

**Explicitly deferred to follow-on phases:**

- Action attachments (PM12-04): routes, service logic, UI for `ActionAttachment`
- Review attachments (PM12-05): routes, service logic, UI for `ReviewAttachment`
- Orphan cleanup job (PM12-06): physical file deletion for soft-deleted and link-orphaned attachments; job scheduling
- Hard-delete route: not planned; do not implement
- S3 / MinIO `StorageProvider`: Phase 14 concern
- Attachment count or storage-usage display in register settings
- Bulk download (zip)
- Attachment search or filtering across registers

---

### 7. Operational Consequences

The following items must appear in the PM12-CORE release documentation (release notes and updated operator README):

1. **New Docker Compose volume.** Operators must recreate their Docker Compose stack after pulling the new release to pick up the `attachments` volume declaration: `docker compose down && docker compose up -d`. No data is lost by this operation. Container rebuilds without `docker compose down` will not fail but will not have a named persistent volume for attachments.

2. **Backup scope expansion.** The `attachments` volume must now be included in operator backup procedures alongside `pgdata`. Both volumes must be backed up together and restored together — a database restore without the matching filesystem state (or vice versa) will produce broken download links for attachments uploaded between backups. The README must document this explicitly.

3. **`ATTACHMENT_STORAGE_LOCAL_PATH` environment variable.** For Docker deployments, the default (`/app/storage/attachments`) works without configuration. Operators running the backend outside Docker (e.g. bare Node.js on a host) must set this to a writable absolute path. The `LocalFileStorageProvider` creates this directory on startup if it does not exist, so no manual directory creation is required.

4. **`ATTACHMENT_MAX_SIZE_MB` default is 25.** Operators who need a lower or higher limit should set this env var. Changes take effect on the next container restart. Raising the limit does not retroactively affect existing uploads.

5. **`ATTACHMENT_ALLOWED_MIME_TYPES` default.** The shipped default allows PDF, common image formats, plain text, Word, and Excel files. Operators can override with a comma-separated MIME list. Restricting the list takes effect immediately for new uploads; it does not affect files already stored.

6. **Storage path is not exposed in API responses.** The `storageKey` (UUID filename on disk) and `ATTACHMENT_STORAGE_LOCAL_PATH` must not be returned in any API response. Operators should ensure the storage directory is not served by any web server or reverse proxy sitting in front of the application.
