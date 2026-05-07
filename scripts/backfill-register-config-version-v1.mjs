import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.info("PM4-01 backfill: creating published version 1 rows and tagging existing register configuration.");

  const [insertedVersions, updatedRegisters, taggedLikelihoods, taggedImpacts, taggedRiskLevels, taggedMatrixCells, taggedResponseStrategies, taggedCustomFields] =
    await prisma.$transaction([
      prisma.$executeRawUnsafe(`
        INSERT INTO "register_config_version" (
          "id",
          "register_id",
          "version_number",
          "status",
          "created_at",
          "created_by_user_id",
          "updated_at",
          "published_at",
          "published_by_user_id"
        )
        SELECT
          gen_random_uuid(),
          r."id",
          1,
          'PUBLISHED'::"RegisterConfigVersionStatus",
          r."created_at",
          r."created_by_user_id",
          r."updated_at",
          r."updated_at",
          r."updated_by_user_id"
        FROM "register" r
        WHERE NOT EXISTS (
          SELECT 1
          FROM "register_config_version" rcv
          WHERE rcv."register_id" = r."id"
            AND rcv."version_number" = 1
        );
      `),
      prisma.$executeRawUnsafe(`
        UPDATE "register" r
        SET "current_config_version_id" = rcv."id"
        FROM "register_config_version" rcv
        WHERE rcv."register_id" = r."id"
          AND rcv."version_number" = 1
          AND r."current_config_version_id" IS DISTINCT FROM rcv."id";
      `),
      prisma.$executeRawUnsafe(`
        UPDATE "likelihood_value" lv
        SET "config_version_id" = rcv."id"
        FROM "register_config_version" rcv
        WHERE rcv."register_id" = lv."register_id"
          AND rcv."version_number" = 1
          AND lv."config_version_id" IS NULL;
      `),
      prisma.$executeRawUnsafe(`
        UPDATE "impact_value" iv
        SET "config_version_id" = rcv."id"
        FROM "register_config_version" rcv
        WHERE rcv."register_id" = iv."register_id"
          AND rcv."version_number" = 1
          AND iv."config_version_id" IS NULL;
      `),
      prisma.$executeRawUnsafe(`
        UPDATE "risk_level" rl
        SET "config_version_id" = rcv."id"
        FROM "register_config_version" rcv
        WHERE rcv."register_id" = rl."register_id"
          AND rcv."version_number" = 1
          AND rl."config_version_id" IS NULL;
      `),
      prisma.$executeRawUnsafe(`
        UPDATE "risk_matrix_cell" rmc
        SET "config_version_id" = rcv."id"
        FROM "register_config_version" rcv
        WHERE rcv."register_id" = rmc."register_id"
          AND rcv."version_number" = 1
          AND rmc."config_version_id" IS NULL;
      `),
      prisma.$executeRawUnsafe(`
        UPDATE "response_strategy" rs
        SET "config_version_id" = rcv."id"
        FROM "register_config_version" rcv
        WHERE rcv."register_id" = rs."register_id"
          AND rcv."version_number" = 1
          AND rs."config_version_id" IS NULL;
      `),
      prisma.$executeRawUnsafe(`
        UPDATE "custom_field_definition" cfd
        SET "config_version_id" = rcv."id"
        FROM "register_config_version" rcv
        WHERE rcv."register_id" = cfd."register_id"
          AND rcv."version_number" = 1
          AND cfd."config_version_id" IS NULL;
      `)
    ]);

  const [registersWithoutCurrentVersion, versionsMissingConfigRows] = await prisma.$transaction([
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "register"
      WHERE "current_config_version_id" IS NULL
    `,
    prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT "register_id" FROM "likelihood_value" WHERE "config_version_id" IS NULL
        UNION ALL
        SELECT "register_id" FROM "impact_value" WHERE "config_version_id" IS NULL
        UNION ALL
        SELECT "register_id" FROM "risk_level" WHERE "config_version_id" IS NULL
        UNION ALL
        SELECT "register_id" FROM "risk_matrix_cell" WHERE "config_version_id" IS NULL
        UNION ALL
        SELECT "register_id" FROM "response_strategy" WHERE "config_version_id" IS NULL
        UNION ALL
        SELECT "register_id" FROM "custom_field_definition" WHERE "config_version_id" IS NULL
      ) untagged;
    `)
  ]);

  const missingCurrentVersionCount = Number(registersWithoutCurrentVersion[0]?.count ?? 0);
  const untaggedConfigRowCount = Number(versionsMissingConfigRows[0]?.count ?? 0);

  if (missingCurrentVersionCount > 0 || untaggedConfigRowCount > 0) {
    throw new Error(
      `Backfill verification failed: ${missingCurrentVersionCount} registers without current version, ${untaggedConfigRowCount} untagged config rows.`
    );
  }

  console.info("PM4-01 backfill complete.", {
    insertedVersions,
    updatedRegisters,
    taggedLikelihoods,
    taggedImpacts,
    taggedRiskLevels,
    taggedMatrixCells,
    taggedResponseStrategies,
    taggedCustomFields
  });
}

run()
  .catch((error) => {
    console.error("PM4-01 backfill failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
