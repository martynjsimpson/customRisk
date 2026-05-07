# Custom Risk - Phase 6 Audit Coverage Checklist

**Status:** P6-03 implementation checklist

This checklist records the MVP audit coverage review for Phase 6. It is scoped to the MVP routes, permissions, and exclusions in `docs/product/MVP_Scope.md`.

## Coverage Reviewed

| Area | Required MVP evidence | Implementation status |
|---|---|---|
| Authentication | Login success/failure, lockout, refresh token reuse, logout | Covered in `auth.service.ts`; refresh rotation success is intentionally not logged to avoid high-volume audit noise allowed by the Audit Model. |
| User management | Create/update/activate/deactivate, System Admin grant/removal, field changes | Covered in `users.service.ts`. |
| Register management | Register create/update, settings field changes | Covered in `registers.service.ts`. |
| Register permissions | Register Admin/Viewer add/remove | Covered in `registers.service.ts`; last Register Admin protection is tested in P6-02 coverage. |
| Custom fields | Field and dropdown option create/update/deactivate, update field changes | Covered in `customFields.service.ts`. |
| Scoring configuration | Likelihood, impact, risk level, and matrix mutation events | Covered in `scoringConfig.service.ts`. |
| Risks | Create/update/delete; update field changes | Covered in `risks.service.ts`. |
| Reviews | Review completion and next review date update | Covered in `reviews.service.ts`. |
| Exports | Register risk export event with filter and row metadata | Covered in `export.service.ts`. |
| Audit read permissions | System, register, risk, event detail, and snapshot routes permissioned | Covered in `audit.routes.ts` and `audit.service.ts`. |
| Hard delete snapshot | Full denormalised snapshot before risk delete | Covered in `snapshotBuilder.ts` and `risks.service.ts`. |
| Secret redaction | Passwords, tokens, API keys, cookies, authorization, and secret field values redacted | Covered in `auditWriter.ts`. |

## Scope Notes

- Response strategy configuration mutations are post-MVP; seeded default values are in scope, but dedicated create/update/deactivate audit events are not required for MVP.
- API key management is post-MVP; API key redaction remains present defensively.
- The review did not add background jobs, imports, webhooks, email delivery, templates, attachments, or advanced reporting.
