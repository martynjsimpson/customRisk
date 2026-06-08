import type { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import { recordAuditEvent, type RecordAuditEventInput } from "./audit.service.js";

type TxClient = Prisma.TransactionClient;

interface NamedScoringValue {
  id: string;
  name: string;
  isActive: boolean;
}

interface ScoringValueCrudConfig<TValue extends NamedScoringValue, TCreateInput, TUpdateInput> {
  notFoundMessage: string;
  duplicateErrorMapper: (error: unknown) => never;
  activeEntityLabel: string;
  activeEntityFieldError: string;
  findMany: (registerId: string) => Promise<TValue[]>;
  findOne: (registerId: string, valueId: string) => Promise<TValue | null>;
  countActive: (registerId: string, excludeId?: string) => Promise<number>;
  createValue: (tx: TxClient, registerId: string, input: TCreateInput) => Promise<TValue>;
  updateValue: (tx: TxClient, valueId: string, input: TUpdateInput) => Promise<TValue>;
  deactivateValue: (tx: TxClient, valueId: string) => Promise<TValue>;
  buildCreatedAuditEvent: (
    actor: AuthenticatedActor,
    registerId: string,
    value: TValue
  ) => RecordAuditEventInput;
  buildUpdatedAuditEvent: (
    actor: AuthenticatedActor,
    registerId: string,
    existing: TValue,
    updated: TValue
  ) => RecordAuditEventInput;
  buildDeactivatedAuditEvent: (
    actor: AuthenticatedActor,
    registerId: string,
    existing: TValue,
    updated: TValue
  ) => RecordAuditEventInput;
}

async function assertRegisterExists(registerId: string) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: { id: true }
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }
}

export function createScoringValueCrud<TValue extends NamedScoringValue, TCreateInput, TUpdateInput>(
  config: ScoringValueCrudConfig<TValue, TCreateInput, TUpdateInput>
) {
  async function findExisting(registerId: string, valueId: string) {
    const value = await config.findOne(registerId, valueId);

    if (!value) {
      throw new ApiError(404, "NOT_FOUND", config.notFoundMessage);
    }

    return value;
  }

  async function assertWillKeepActiveValue(registerId: string, excludeId?: string) {
    const activeCount = await config.countActive(registerId, excludeId);

    if (activeCount === 0) {
      throw new ApiError(
        422,
        "UNPROCESSABLE",
        `At least one active ${config.activeEntityLabel} must remain`,
        { isActive: config.activeEntityFieldError }
      );
    }
  }

  return {
    async list(registerId: string) {
      await assertRegisterExists(registerId);
      return config.findMany(registerId);
    },

    async create(actor: AuthenticatedActor, registerId: string, input: TCreateInput) {
      await assertRegisterExists(registerId);

      try {
        return await prisma.$transaction(async (tx) => {
          const value = await config.createValue(tx, registerId, input);
          await recordAuditEvent(config.buildCreatedAuditEvent(actor, registerId, value), tx);
          return value;
        });
      } catch (error) {
        config.duplicateErrorMapper(error);
      }
    },

    async update(actor: AuthenticatedActor, registerId: string, valueId: string, input: TUpdateInput & { isActive?: boolean }) {
      const existing = await findExisting(registerId, valueId);

      if (input.isActive === false && existing.isActive) {
        await assertWillKeepActiveValue(registerId, valueId);
      }

      try {
        return await prisma.$transaction(async (tx) => {
          const updated = await config.updateValue(tx, valueId, input);
          await recordAuditEvent(
            config.buildUpdatedAuditEvent(actor, registerId, existing, updated),
            tx
          );
          return updated;
        });
      } catch (error) {
        config.duplicateErrorMapper(error);
      }
    },

    async deactivate(actor: AuthenticatedActor, registerId: string, valueId: string) {
      const existing = await findExisting(registerId, valueId);

      if (existing.isActive) {
        await assertWillKeepActiveValue(registerId, valueId);
      }

      return prisma.$transaction(async (tx) => {
        const updated = await config.deactivateValue(tx, valueId);
        await recordAuditEvent(
          config.buildDeactivatedAuditEvent(actor, registerId, existing, updated),
          tx
        );
        return updated;
      });
    }
  };
}
