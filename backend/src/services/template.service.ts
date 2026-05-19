import { Prisma } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { RegisterConfigSnapshot } from "../types/configSnapshot.js";
import { recordAuditEvent } from "./audit.service.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mapTemplatePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ApiError(409, "CONFLICT", "A template with this name already exists");
  }
  throw error;
}

// ---------------------------------------------------------------------------
// PM4-09: Template Management
// ---------------------------------------------------------------------------

export async function listTemplates(includeInactive = false) {
  const templates = await prisma.registerTemplate.findMany({
    where: includeInactive ? undefined : { isActive: true },
    include: {
      versions: {
        where: { status: "PUBLISHED" },
        orderBy: { versionNumber: "desc" },
        take: 1
      }
    },
    orderBy: { name: "asc" }
  });

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    isActive: t.isActive,
    createdByUserId: t.createdByUserId,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    latestPublishedVersion: t.versions[0] ?? null
  }));
}

export async function getTemplate(templateId: string) {
  const template = await prisma.registerTemplate.findUnique({
    where: { id: templateId },
    include: {
      versions: {
        orderBy: { versionNumber: "asc" }
      }
    }
  });

  if (!template) {
    throw new ApiError(404, "NOT_FOUND", "Template not found");
  }

  return template;
}

export async function createTemplate(
  data: { name: string; description?: string; snapshotJson: RegisterConfigSnapshot },
  actorId: string,
  actorName: string,
  actorEmail: string
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const now = new Date();

      const template = await tx.registerTemplate.create({
        data: {
          name: data.name,
          description: data.description,
          createdByUserId: actorId
        }
      });

      const version = await tx.registerTemplateVersion.create({
        data: {
          templateId: template.id,
          versionNumber: 1,
          status: "PUBLISHED",
          snapshotJson: data.snapshotJson as unknown as Prisma.InputJsonValue,
          createdByUserId: actorId,
          publishedAt: now
        }
      });

      await recordAuditEvent(
        {
          action: auditActions.templateCreated,
          actor: { id: actorId, name: actorName, email: actorEmail },
          objectType: "REGISTER_TEMPLATE",
          objectId: template.id,
          objectDisplayName: template.name,
          scopeType: "SYSTEM",
          summary: `Template created: "${template.name}"`
        },
        tx
      );

      return { ...template, versions: [version] };
    });
  } catch (error) {
    mapTemplatePrismaError(error);
  }
}

export async function createTemplateFromRegister(
  registerId: string,
  data: { name: string; description?: string },
  actorId: string,
  actorName: string,
  actorEmail: string
) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: {
      id: true,
      name: true,
      currentConfigVersionId: true,
      currentConfigVersion: {
        select: { snapshotJson: true }
      }
    }
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  if (!register.currentConfigVersion) {
    throw new ApiError(
      422,
      "UNPROCESSABLE",
      "Register must have a current config version before creating a template from it"
    );
  }

  const snapshotJson = register.currentConfigVersion.snapshotJson as unknown as RegisterConfigSnapshot;

  const result = await createTemplate({ name: data.name, description: data.description, snapshotJson }, actorId, actorName, actorEmail);

  // Link the register to the new template version
  const newVersionId = result!.versions[0]?.id;
  if (newVersionId) {
    await prisma.register.update({
      where: { id: registerId },
      data: { linkedTemplateVersionId: newVersionId }
    });
  }

  return result;
}

export async function updateTemplate(
  templateId: string,
  data: { name?: string; description?: string | null },
  actorId: string,
  actorName: string,
  actorEmail: string
) {
  const existing = await prisma.registerTemplate.findUnique({
    where: { id: templateId }
  });

  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Template not found");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.registerTemplate.update({
        where: { id: templateId },
        data: {
          name: data.name,
          description: data.description
        }
      });

      await recordAuditEvent(
        {
          action: auditActions.templateUpdated,
          actor: { id: actorId, name: actorName, email: actorEmail },
          objectType: "REGISTER_TEMPLATE",
          objectId: updated.id,
          objectDisplayName: updated.name,
          scopeType: "SYSTEM",
          summary: `Template updated: "${updated.name}"`
        },
        tx
      );

      return updated;
    });
  } catch (error) {
    mapTemplatePrismaError(error);
  }
}

export async function deactivateTemplate(
  templateId: string,
  actorId: string,
  actorName: string,
  actorEmail: string
) {
  const existing = await prisma.registerTemplate.findUnique({
    where: { id: templateId }
  });

  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Template not found");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.registerTemplate.update({
      where: { id: templateId },
      data: { isActive: false }
    });

    await recordAuditEvent(
      {
        action: auditActions.templateDeleted,
        actor: { id: actorId, name: actorName, email: actorEmail },
        objectType: "REGISTER_TEMPLATE",
        objectId: updated.id,
        objectDisplayName: updated.name,
        scopeType: "SYSTEM",
        summary: `Template deactivated: "${updated.name}"`
      },
      tx
    );

    return updated;
  });
}

export async function publishTemplateVersion(
  templateId: string,
  data: { snapshotJson: RegisterConfigSnapshot },
  actorId: string,
  actorName: string,
  actorEmail: string
) {
  const template = await prisma.registerTemplate.findUnique({
    where: { id: templateId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1
      }
    }
  });

  if (!template) {
    throw new ApiError(404, "NOT_FOUND", "Template not found");
  }

  const maxVersionNumber = template.versions[0]?.versionNumber ?? 0;

  return prisma.$transaction(async (tx) => {
    const now = new Date();

    const version = await tx.registerTemplateVersion.create({
      data: {
        templateId,
        versionNumber: maxVersionNumber + 1,
        status: "PUBLISHED",
        snapshotJson: data.snapshotJson as unknown as Prisma.InputJsonValue,
        createdByUserId: actorId,
        publishedAt: now
      }
    });

    await recordAuditEvent(
      {
        action: auditActions.templateUpdated,
        actor: { id: actorId, name: actorName, email: actorEmail },
        objectType: "REGISTER_TEMPLATE",
        objectId: template.id,
        objectDisplayName: template.name,
        scopeType: "SYSTEM",
        summary: `Template version ${version.versionNumber} published for "${template.name}"`
      },
      tx
    );

    return version;
  });
}

// ---------------------------------------------------------------------------
// PM4-11: Template Comparison and Migration Planning
// ---------------------------------------------------------------------------

export async function compareRegisterToTemplate(registerId: string, templateVersionId: string) {
  const [register, templateVersion] = await Promise.all([
    prisma.register.findUnique({
      where: { id: registerId },
      select: {
        id: true,
        currentConfigVersion: {
          select: { snapshotJson: true }
        }
      }
    }),
    prisma.registerTemplateVersion.findUnique({
      where: { id: templateVersionId },
      select: {
        id: true,
        versionNumber: true,
        status: true,
        publishedAt: true,
        snapshotJson: true
      }
    })
  ]);

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  if (!templateVersion) {
    throw new ApiError(404, "NOT_FOUND", "Template version not found");
  }

  if (!register.currentConfigVersion) {
    throw new ApiError(422, "UNPROCESSABLE", "Register has no current config version to compare");
  }

  const registerSnapshot = register.currentConfigVersion.snapshotJson as unknown as RegisterConfigSnapshot;
  const templateSnapshot = templateVersion.snapshotJson as unknown as RegisterConfigSnapshot;

  // Compare register-level settings
  const registerSettingsKeys: Array<keyof RegisterConfigSnapshot["register"]> = [
    "riskIdPrefix",
    "riskIdZeroPaddingEnabled",
    "riskIdZeroPaddingWidth",
    "defaultNewRiskState",
    "reviewsEnabled",
    "defaultReviewFrequencyMonths",
    "reviewAttestationText",
    "allowViewerExport"
  ];

  const registerSettings: string[] = [];
  for (const key of registerSettingsKeys) {
    const regVal = JSON.stringify(registerSnapshot.register[key] ?? null);
    const tplVal = JSON.stringify(templateSnapshot.register[key] ?? null);
    if (regVal !== tplVal) {
      registerSettings.push(key);
    }
  }

  // Custom fields comparison by fieldName
  const regFieldMap = new Map(registerSnapshot.customFields.map((f) => [f.fieldName, f]));
  const tplFieldMap = new Map(templateSnapshot.customFields.map((f) => [f.fieldName, f]));

  const customFieldsAdded = templateSnapshot.customFields
    .filter((f) => !regFieldMap.has(f.fieldName))
    .map((f) => f.fieldName);

  const customFieldsRemoved = registerSnapshot.customFields
    .filter((f) => !tplFieldMap.has(f.fieldName))
    .map((f) => f.fieldName);

  const customFieldsChanged = registerSnapshot.customFields
    .filter((f) => {
      const tplField = tplFieldMap.get(f.fieldName);
      if (!tplField) return false;
      // Compare fields ignoring IDs
      const regCopy = { ...f, id: undefined, options: f.options.map((o) => ({ ...o, id: undefined })) };
      const tplCopy = { ...tplField, id: undefined, options: tplField.options.map((o) => ({ ...o, id: undefined })) };
      return JSON.stringify(regCopy) !== JSON.stringify(tplCopy);
    })
    .map((f) => f.fieldName);

  // Simple name-based comparisons for other config types
  function compareByName(
    regItems: Array<{ name: string }>,
    tplItems: Array<{ name: string }>
  ): { added: string[]; removed: string[] } {
    const regNames = new Set(regItems.map((i) => i.name));
    const tplNames = new Set(tplItems.map((i) => i.name));
    return {
      added: tplItems.filter((i) => !regNames.has(i.name)).map((i) => i.name),
      removed: regItems.filter((i) => !tplNames.has(i.name)).map((i) => i.name)
    };
  }

  const likelihood = compareByName(registerSnapshot.likelihoodValues, templateSnapshot.likelihoodValues);
  const impact = compareByName(registerSnapshot.impactValues, templateSnapshot.impactValues);
  const riskLevels = compareByName(registerSnapshot.riskLevels, templateSnapshot.riskLevels);
  const responseStrategies = compareByName(
    registerSnapshot.responseStrategies,
    templateSnapshot.responseStrategies
  );

  const differences = {
    registerSettings,
    customFieldsAdded,
    customFieldsRemoved,
    customFieldsChanged,
    likelihoodValuesAdded: likelihood.added,
    likelihoodValuesRemoved: likelihood.removed,
    impactValuesAdded: impact.added,
    impactValuesRemoved: impact.removed,
    riskLevelsAdded: riskLevels.added,
    riskLevelsRemoved: riskLevels.removed,
    responseStrategiesAdded: responseStrategies.added,
    responseStrategiesRemoved: responseStrategies.removed
  };

  const hasDifferences = Object.values(differences).some((arr) => arr.length > 0);

  return {
    templateVersion: {
      id: templateVersion.id,
      versionNumber: templateVersion.versionNumber,
      publishedAt: templateVersion.publishedAt
    },
    differences,
    hasDifferences
  };
}

export async function applyTemplateUpdateToDraft(
  registerId: string,
  templateVersionId: string,
  actorId: string,
  actorName: string,
  actorEmail: string
) {
  const [register, templateVersion] = await Promise.all([
    prisma.register.findUnique({
      where: { id: registerId },
      select: {
        id: true,
        name: true,
        draftConfigVersionId: true,
        currentConfigVersion: {
          select: { versionNumber: true }
        }
      }
    }),
    prisma.registerTemplateVersion.findUnique({
      where: { id: templateVersionId },
      select: {
        id: true,
        templateId: true,
        versionNumber: true,
        status: true,
        snapshotJson: true,
        template: {
          select: { id: true, name: true }
        }
      }
    })
  ]);

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  if (!templateVersion) {
    throw new ApiError(404, "NOT_FOUND", "Template version not found");
  }

  if (templateVersion.status !== "PUBLISHED") {
    throw new ApiError(422, "UNPROCESSABLE", "Cannot apply a DRAFT template version");
  }

  if (register.draftConfigVersionId) {
    throw new ApiError(409, "CONFLICT", "Register already has an existing draft config version");
  }

  const templateSnapshot = templateVersion.snapshotJson as unknown as RegisterConfigSnapshot;

  // Preserve the register's own name in the snapshot
  const draftSnapshot: RegisterConfigSnapshot = {
    ...templateSnapshot,
    register: {
      ...templateSnapshot.register,
      name: register.name
    }
  };

  const currentVersionNumber = register.currentConfigVersion?.versionNumber ?? 0;

  return prisma.$transaction(async (tx) => {
    const draft = await tx.registerConfigVersion.create({
      data: {
        registerId,
        versionNumber: currentVersionNumber + 1,
        status: "DRAFT",
        snapshotJson: draftSnapshot as unknown as Prisma.InputJsonValue,
        createdByUserId: actorId,
        sourceTemplateVersionId: templateVersionId
      }
    });

    await tx.register.update({
      where: { id: registerId },
      data: { draftConfigVersionId: draft.id }
    });

    await recordAuditEvent(
      {
        action: auditActions.configDraftCreated,
        actor: { id: actorId, name: actorName, email: actorEmail },
        objectType: "CONFIG_VERSION",
        objectId: draft.id,
        objectDisplayName: register.name,
        scopeType: "REGISTER",
        registerId,
        summary: `Config draft created from template "${templateVersion.template.name}" v${templateVersion.versionNumber}`,
        metadataJson: {
          source: "template",
          templateId: templateVersion.template.id,
          templateVersionId: templateVersion.id
        }
      },
      tx
    );

    return draft;
  });
}
