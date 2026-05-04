import type {
  AuditObjectType,
  AuditScopeType,
  AuditValueType,
  Prisma
} from "@prisma/client";

import type { AuditAction } from "../audit/auditActions.js";
import { getAuditClient, safeAuditValue, type PrismaAuditClient } from "../audit/auditWriter.js";

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
  action?: string;
  page?: number;
  pageSize?: number;
}

export async function recordAuditEvent(input: RecordAuditEventInput, client?: PrismaAuditClient) {
  const auditClient = getAuditClient(client);
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
      riskId: input.riskId,
      displayRiskId: input.displayRiskId,
      summary: input.summary,
      metadataJson: input.metadataJson ?? undefined
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
    scopeType: input.scopeType,
    registerId: input.registerId,
    riskId: input.riskId,
    actorUserId: input.actorUserId,
    action: input.action
  };

  const auditClient = getAuditClient(client);
  const [data, total] = await Promise.all([
    auditClient.auditEvent.findMany({
      where,
      include: { fieldChanges: true },
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    auditClient.auditEvent.count({ where })
  ]);

  return {
    data,
    meta: { total, page, pageSize }
  };
}
