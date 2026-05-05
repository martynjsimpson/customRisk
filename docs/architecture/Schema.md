# Custom Risk — MVP Schema

**Version:** 1.0  
**Date:** 2026-05-04  
**Status:** Draft  
**Applies to:** MVP delivery  
**Canonical schema:** `backend/prisma/schema.prisma`

---

## Purpose

This document exists for completeness in the architecture document set.

The drafted MVP database schema is maintained directly in:

```text
backend/prisma/schema.prisma
```

That Prisma schema is the canonical implementation source for the current as-drafted relational model, including users, sessions, registers, permissions, risks, reviews, configuration tables, audit tables, and export metadata.

Do not duplicate the full schema in this document. Update `backend/prisma/schema.prisma` and the relevant architecture/product documents when the data model changes.
