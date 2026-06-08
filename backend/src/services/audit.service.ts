import type {
  AuditObjectType,
  AuditScopeType,
  AuditValueType,
  Prisma
} from "@prisma/client";

import type { AuditAction } from "../audit/auditActions.js";
import { getAuditIpAddress } from "../audit/auditContext.js";
import { getAuditClient, safeAuditValue, type PrismaAuditClient } from "../audit/auditWriter.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import { canManageRegister } from "../permissions/registerAccess.js";
import { canViewRisk } from "../permissions/riskAccess.js";
import type { AuthenticatedActor } from "../types/express.js";
import { buildCsv } from "../utils/csv.js";
import type { AuditQuery } from "../validators/audit.schemas.js";

export interface AuditActorInput {
  id?: string | null;
  name?: string | null;
  email?: string | null;
}

export interface AuditFieldChangeInput {
  fieldName: string;
  fieldLabel?: string;
  previousValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  valueType?: AuditValueType;
}

export interface RecordAuditEventInput {
  action: AuditAction | string;
  objectType: AuditObjectType;
  objectId: string;
  summary: string;
  scopeType: AuditScopeType;
  actor?: AuditActorInput | null;
  objectDisplayName?: string | null;
  registerId?: string | null;
  registerDisplayName?: string | null;
  riskId?: string | null;
  displayRiskId?: string | null;
  metadataJson?: Prisma.InputJsonValue | null;
  fieldChanges?: AuditFieldChangeInput[];
}

export interface AuditQueryInput {
  scopeType?: AuditScopeType;
  registerId?: string;
  riskId?: string;
  actorUserId?: string;
  actorName?: string;
  action?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

function endOfDate(date: Date) {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function buildAuditWhere(input: Partial<AuditQuery> = {}): Prisma.AuditEventWhereInput {
  const where: Prisma.AuditEventWhereInput = {
    occurredAt:
      input.dateFrom || input.dateTo
        ? {
            gte: input.dateFrom,
            lte: input.dateTo ? endOfDate(input.dateTo) : undefined
          }
        : undefined,
    actorUserId: input.actorUserId,
    action: input.action,
    objectType: input.objectType,
    registerId: input.registerId,
    riskId: input.riskId,
    displayRiskId: input.displayRiskId,
    ipAddress: input.ipAddress
  };

  const andConditions: Prisma.AuditEventWhereInput[] = [];

  if (input.search) {
    andConditions.push({
      OR: [
        { summary: { contains: input.search, mode: "insensitive" } },
        { objectDisplayName: { contains: input.search, mode: "insensitive" } },
        { displayRiskId: { contains: input.search, mode: "insensitive" } }
      ]
    });
  }

  if (input.actorName) {
    andConditions.push({
      OR: [
        { actorDisplayName: { contains: input.actorName, mode: "insensitive" } },
        { actorEmail: { contains: input.actorName, mode: "insensitive" } }
      ]
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

function mapAuditEvent(event: Prisma.AuditEventGetPayload<{ include: { fieldChanges: true; riskSnapshot: true } }>) {
  return {
    id: event.id,
    occurredAt: event.occurredAt,
    actor: event.actorUserId
      ? {
          id: event.actorUserId,
          name: event.actorDisplayName,
          email: event.actorEmail
        }
      : null,
    action: event.action,
    objectType: event.objectType,
    objectId: event.objectId,
    objectDisplayName: event.objectDisplayName,
    scopeType: event.scopeType,
    registerId: event.registerId,
    registerDisplayName: event.registerDisplayName,
    riskId: event.riskId,
    displayRiskId: event.displayRiskId,
    summary: event.summary,
    metadataJson: event.metadataJson,
    ipAddress: event.ipAddress,
    fieldChanges: event.fieldChanges,
    hasSnapshot: Boolean(event.riskSnapshot)
  };
}

async function assertCanReadAuditEvent(actor: AuthenticatedActor, event: {
  scopeType: AuditScopeType;
  registerId: string | null;
  riskId: string | null;
}) {
  if (actor.isSystemAdmin) {
    return;
  }

  if (event.scopeType === "SYSTEM") {
    throw new ApiError(404, "NOT_FOUND", "Audit event not found");
  }

  if (event.scopeType === "RISK" && event.registerId && event.riskId) {
    if (await canViewRisk(actor, event.registerId, event.riskId)) {
      return;
    }
    throw new ApiError(404, "NOT_FOUND", "Audit event not found");
  }

  if (event.registerId && (await canManageRegister(actor, event.registerId))) {
    return;
  }

  throw new ApiError(404, "NOT_FOUND", "Audit event not found");
}

export async function listSystemAuditEvents(actor: AuthenticatedActor, query: AuditQuery) {
  if (!actor.isSystemAdmin) {
    throw new ApiError(403, "FORBIDDEN", "System Admin permission is required");
  }

  return listAuditEvents(query);
}

export async function listRegisterAuditEvents(
  _actor: AuthenticatedActor,
  registerId: string,
  query: AuditQuery
) {
  return listAuditEvents({
    ...query,
    registerId
  });
}

export async function listRiskAuditEvents(
  _actor: AuthenticatedActor,
  registerId: string,
  riskId: string,
  query: AuditQuery
) {
  return listAuditEvents({
    ...query,
    registerId,
    riskId
  });
}

export async function getAuditEvent(actor: AuthenticatedActor, auditEventId: string) {
  const event = await prisma.auditEvent.findUnique({
    where: { id: auditEventId },
    include: { fieldChanges: true, riskSnapshot: true }
  });

  if (!event) {
    throw new ApiError(404, "NOT_FOUND", "Audit event not found");
  }

  await assertCanReadAuditEvent(actor, event);
  return mapAuditEvent(event);
}

export async function getAuditEventSnapshot(actor: AuthenticatedActor, auditEventId: string) {
  const event = await prisma.auditEvent.findUnique({
    where: { id: auditEventId },
    include: { riskSnapshot: true }
  });

  if (!event?.riskSnapshot) {
    throw new ApiError(404, "NOT_FOUND", "Audit snapshot not found");
  }

  if (!actor.isSystemAdmin && !(await canManageRegister(actor, event.riskSnapshot.registerId))) {
    throw new ApiError(404, "NOT_FOUND", "Audit snapshot not found");
  }

  return {
    id: event.riskSnapshot.id,
    auditEventId: event.riskSnapshot.auditEventId,
    riskInternalId: event.riskSnapshot.riskInternalId,
    registerId: event.riskSnapshot.registerId,
    displayRiskId: event.riskSnapshot.displayRiskId,
    snapshotJson: event.riskSnapshot.snapshotJson,
    deletionReason: event.riskSnapshot.deletionReason,
    createdAt: event.riskSnapshot.createdAt
  };
}

export async function recordAuditEvent(input: RecordAuditEventInput, client?: PrismaAuditClient) {
  const auditClient = getAuditClient(client);

  let registerDisplayName = input.registerDisplayName ?? null;
  if (!registerDisplayName && input.registerId) {
    const register = await prisma.register.findUnique({
      where: { id: input.registerId },
      select: { name: true }
    });
    registerDisplayName = register?.name ?? null;
  }

  const event = await auditClient.auditEvent.create({
    data: {
      actorUserId: input.actor?.id,
      actorDisplayName: input.actor?.name,
      actorEmail: input.actor?.email,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId,
      objectDisplayName: input.objectDisplayName,
      scopeType: input.scopeType,
      registerId: input.registerId,
      registerDisplayName,
      riskId: input.riskId,
      displayRiskId: input.displayRiskId,
      summary: input.summary,
      metadataJson: input.metadataJson ?? undefined,
      ipAddress: getAuditIpAddress() ?? null
    }
  });

  if (input.fieldChanges && input.fieldChanges.length > 0) {
    await recordFieldChanges(event.id, input.fieldChanges, auditClient);
  }

  return event;
}

export async function recordFieldChanges(
  auditEventId: string,
  changes: AuditFieldChangeInput[],
  client?: PrismaAuditClient
) {
  const auditClient = getAuditClient(client);
  const safeChanges = changes.filter((change) => {
    const previousValue = safeAuditValue(change.fieldName, change.previousValue);
    const newValue = safeAuditValue(change.fieldName, change.newValue);
    return previousValue !== newValue;
  });

  if (safeChanges.length === 0) {
    return { count: 0 };
  }

  return auditClient.auditFieldChange.createMany({
    data: safeChanges.map((change) => ({
      auditEventId,
      fieldName: change.fieldName,
      fieldLabel: change.fieldLabel,
      previousValue: safeAuditValue(change.fieldName, change.previousValue),
      newValue: safeAuditValue(change.fieldName, change.newValue),
      valueType: change.valueType
    }))
  });
}

export function buildFieldChanges<T extends Record<string, unknown>>(
  previous: T,
  next: T,
  fields: Array<{ name: keyof T & string; label?: string; valueType?: AuditValueType }>
) {
  return fields
    .filter((field) => previous[field.name] !== next[field.name])
    .map((field) => ({
      fieldName: field.name,
      fieldLabel: field.label,
      previousValue: previous[field.name] as Prisma.InputJsonValue,
      newValue: next[field.name] as Prisma.InputJsonValue,
      valueType: field.valueType
    }));
}

export async function listAuditEvents(input: AuditQueryInput = {}, client?: PrismaAuditClient) {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 25;
  const where: Prisma.AuditEventWhereInput = {
    ...buildAuditWhere(input as AuditQuery),
    scopeType: input.scopeType
  };

  const auditClient = getAuditClient(client);
  const [data, total] = await Promise.all([
    auditClient.auditEvent.findMany({
      where,
      include: { fieldChanges: true, riskSnapshot: true },
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    auditClient.auditEvent.count({ where })
  ]);

  return {
    data: data.map(mapAuditEvent),
    meta: { total, page, pageSize }
  };
}

const EXPORT_LIMIT = 5000;
const EXPORT_CSV_HEADERS = [
  "Event ID",
  "Date/Time",
  "Actor Name",
  "Actor Email",
  "IP Address",
  "Action",
  "Object Type",
  "Object",
  "Scope",
  "Register",
  "Risk ID",
  "Summary",
  "Changed Fields",
  "Metadata"
];

type AuditEventWithFieldChanges = Prisma.AuditEventGetPayload<{ include: { fieldChanges: true } }>;

function eventToCsvRow(event: AuditEventWithFieldChanges): unknown[] {
  return [
    event.id,
    event.occurredAt.toISOString(),
    event.actorDisplayName ?? "",
    event.actorEmail ?? "",
    event.ipAddress ?? "",
    event.action,
    event.objectType,
    event.objectDisplayName ?? "",
    event.scopeType,
    event.registerDisplayName ?? "",
    event.displayRiskId ?? "",
    event.summary,
    event.fieldChanges.map((fc) => fc.fieldName).join(", "),
    event.metadataJson !== null && event.metadataJson !== undefined ? JSON.stringify(event.metadataJson) : ""
  ];
}

export async function exportSystemAuditEvents(actor: AuthenticatedActor, query: AuditQuery): Promise<string> {
  if (!actor.isSystemAdmin) {
    throw new ApiError(403, "FORBIDDEN", "System Admin permission is required");
  }

  const where = buildAuditWhere(query);
  const count = await prisma.auditEvent.count({ where });

  if (count > EXPORT_LIMIT) {
    throw new ApiError(422, "UNPROCESSABLE", "Export limit of 5,000 rows exceeded. Apply filters to narrow the results.");
  }

  const events = await prisma.auditEvent.findMany({
    where,
    include: { fieldChanges: true },
    orderBy: { occurredAt: "desc" }
  });

  return buildCsv(EXPORT_CSV_HEADERS, events.map(eventToCsvRow));
}

export async function exportRegisterAuditEvents(
  actor: AuthenticatedActor,
  registerId: string,
  query: AuditQuery
): Promise<string> {
  if (!(await canManageRegister(actor, registerId))) {
    throw new ApiError(403, "FORBIDDEN", "Register Admin permission is required");
  }

  const where: Prisma.AuditEventWhereInput = {
    ...buildAuditWhere(query),
    registerId
  };

  const count = await prisma.auditEvent.count({ where });

  if (count > EXPORT_LIMIT) {
    throw new ApiError(422, "UNPROCESSABLE", "Export limit of 5,000 rows exceeded. Apply filters to narrow the results.");
  }

  const events = await prisma.auditEvent.findMany({
    where,
    include: { fieldChanges: true },
    orderBy: { occurredAt: "desc" }
  });

  return buildCsv(EXPORT_CSV_HEADERS, events.map(eventToCsvRow));
}
