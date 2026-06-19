# ADR-0006 — Attachment Storage: Local Filesystem with StorageProvider Abstraction

**Status:** Accepted  
**Date:** 2026-05-07  
**Applies to:** Custom Risk — post-MVP attachments and evidence (PM12-01 to PM12-06)  
**Related documents:** PM0-02 Data Model Extension Plan (Phase 12 section), Technical Architecture v1.0

---

## 1. Context

Phase 12 adds file attachments to risks, Risk Response Actions, and review records. Before any upload or download logic can be written, the storage backend must be decided — it affects the deployment model, local development setup, environment variables, Docker Compose configuration, and the shape of the upload/download service.

Three candidates were considered:

1. **Local filesystem** — files written to a path inside the app container, persisted via a named Docker volume.
2. **Object storage (S3 or S3-compatible MinIO)** — files stored in a bucket, accessed via the AWS SDK or an S3-compatible API.
3. **PostgreSQL BYTEA** — file content stored as binary data directly in the database.

The product is self-hosted, single-tenant, and deployed via Docker Compose with two current services (`app` + `db`).

---

## 2. Decision

Use **local filesystem storage** backed by a named Docker volume as the default and shipped implementation. Write a **`StorageProvider` TypeScript interface** so that a future S3-compatible backend can be added without changing the upload/download service.

**`StorageProvider` interface (defined in `backend/src/services/storage/`):**

```typescript
export interface StorageProvider {
  put(key: string, data: Buffer, mimeType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```

`LocalFileStorageProvider` ships in Phase 12. `S3StorageProvider` is the anticipated Phase 14 addition and is not implemented now. The active provider is selected at startup from `ATTACHMENT_STORAGE_PROVIDER` and injected into the upload/download service.

**Storage keys are UUIDs.** The original filename is stored only in the `Attachment` metadata table (`originalName` column). The file on disk is stored under `<ATTACHMENT_STORAGE_LOCAL_PATH>/<uuid>`. This prevents path traversal, filename collisions, and information leakage from storage key inspection.

**Downloads are proxied through Express.** The download endpoint verifies permissions, resolves the `storageKey` from the `Attachment` record, reads from the `StorageProvider`, and streams the response with `Content-Disposition: attachment; filename="<originalName>"` and the stored `Content-Type`. No signed URL redirect is used; this approach works identically for local filesystem and a future proxied S3 path.

**Docker Compose additions:**

```yaml
services:
  app:
    volumes:
      - attachments:/app/storage

volumes:
  pgdata:
  attachments:
```

**New environment variables:**

```ini
ATTACHMENT_STORAGE_PROVIDER=local
ATTACHMENT_STORAGE_LOCAL_PATH=/app/storage/attachments
ATTACHMENT_MAX_SIZE_MB=25
ATTACHMENT_ALLOWED_MIME_TYPES=application/pdf,image/jpeg,image/png,image/gif,image/webp,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

**Attachment link tables — no polymorphism.** Three separate typed link tables are used instead of a single polymorphic `attachment_link` table:

- `RiskAttachment` — links `Attachment` to `Risk`
- `ActionAttachment` — links `Attachment` to `RiskResponseAction` (added in Phase 12-04)
- `ReviewAttachment` — links `Attachment` to `RiskReview` (added in Phase 12-05)

This keeps Prisma FK relations explicit, avoids a runtime `objectType` discriminator, and makes permission checks straightforward (each link table has a clear parent relation to check).

**Soft delete.** `Attachment.deletedAt` is a nullable timestamp. Setting it hides the attachment from users immediately. Physical file deletion is deferred to the orphan cleanup job in PM12-06, which provides a safety window and prevents accidental permanent data loss at delete-request time.

---

## 3. Decision Drivers

- **No new infrastructure dependency for operators.** The product is self-hosted. Adding a required S3 bucket or MinIO service increases the operational burden for every operator. A named Docker volume follows the same pattern already used for `pgdata` — operators are already familiar with it, and it survives container rebuilds without extra configuration.
- **Local dev setup stays simple.** Docker Compose currently starts with two commands. Adding MinIO as a third required service would complicate first-run setup and CI. A named volume adds nothing to the startup process.
- **The abstraction removes the lock-in risk.** The single reason to choose S3 over local filesystem for a self-hosted product is horizontal scaling (multiple app container instances cannot share a filesystem). This is a Phase 14 concern. The `StorageProvider` interface means that when Phase 14 introduces horizontal scaling, the storage backend can be switched to S3 by implementing one class, not by rewriting the upload/download service.
- **Proxied download is simpler and more secure at this scale.** Signed URL redirect requires object storage and adds expiry/rotation complexity. Proxied download through Express centralises permission checking in one place and adds no round trips for the single-tenant use case.
- **UUID storage keys are a security baseline.** Deriving file paths from original filenames creates path traversal risk and reveals internal structure. Using a UUID key as the storage identifier, stored separately from the display name, is the correct default regardless of which storage backend is active.
- **Separate typed link tables over polymorphism.** Prisma does not have first-class polymorphic relation support. A polymorphic `attachment_link` table with an `objectType` discriminator requires runtime type-checking and prevents static type inference. Three typed tables are marginally more schema but produce cleaner, fully type-safe Prisma queries.

---

## 4. Alternatives Considered

### 4.1 Object storage (S3 or MinIO) from the start

**Rejected** for the initial implementation because:

- Requires operators to provision an S3 bucket or run MinIO. Neither is part of the current deployment model.
- Adds a third Docker Compose service for local development, increasing setup complexity.
- Signed URL generation adds token lifecycle management that is not needed at single-tenant scale.
- The `StorageProvider` abstraction means this can be added when Phase 14 horizontal scaling genuinely requires it, without changing any upload/download logic.

Remains the expected Phase 14 upgrade path.

### 4.2 PostgreSQL BYTEA storage

**Rejected** because:

- Significantly increases database size with binary data, degrading query performance on unrelated tables.
- Prevents efficient streaming of large files — the entire BYTEA must be read into memory before it can be sent to the client.
- Makes database backups substantially larger and slower.
- Provides no meaningful benefit over filesystem storage for a self-hosted deployment where both the app and database are local.

### 4.3 Single polymorphic `attachment_link` table

**Rejected in favour of typed link tables** because:

- Prisma does not support polymorphic relations natively; a polymorphic table requires a `String objectType` discriminator and manual type narrowing in every query.
- Permission checks for download and delete require joining back to the parent object, which is straightforward with typed FK relations and awkward with a polymorphic discriminator.
- Three typed tables add three migrations and three Prisma models, but each is small and independently comprehensible.

---

## 5. Consequences

- `docker-compose.yml` must be updated to add the `attachments` volume before Phase 12 is deployed. Operators who pull a new release must also recreate their Docker Compose stack to pick up the new volume declaration (standard Docker Compose upgrade behaviour — no data is lost).
- `ATTACHMENT_STORAGE_LOCAL_PATH` must be set in production `.env`. The default (`/app/storage/attachments`) works for Docker deployments; host-based deployments must set an appropriate writable path.
- The `attachments` volume must be included in operator backup procedures alongside `pgdata`. The README should document this when Phase 12 ships.
- File type validation must be performed on the server using the detected MIME type (e.g. `file-type` library), not solely on the `Content-Type` header supplied by the client, to prevent MIME-type spoofing.
- The `LocalFileStorageProvider` must create `ATTACHMENT_STORAGE_LOCAL_PATH` on startup if it does not exist, so a fresh Docker volume works without manual directory creation.
- When Phase 14 introduces `S3StorageProvider`, existing files on local filesystem must be migrated to S3 before the provider is switched. A migration script should be provided at that point.
