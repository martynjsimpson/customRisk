-- PM11-02: Add SAVED_VIEW to AuditObjectType enum
-- Additive migration — no data or constraint changes.
-- Rollback: ALTER TYPE "AuditObjectType" RENAME VALUE 'SAVED_VIEW' TO obsolete;
--           (PostgreSQL does not support DROP VALUE; rename is the safe workaround.)

ALTER TYPE "AuditObjectType" ADD VALUE IF NOT EXISTS 'SAVED_VIEW';
