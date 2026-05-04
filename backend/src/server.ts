import { Socket } from "node:net";

import { createApp } from "./app.js";
import { logger } from "./config/logger.js";
import { disconnectPrisma } from "./db/prisma.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

async function waitForDatabase(databaseUrl: string, timeoutMs = 30_000) {
  const { hostname, port: databasePort } = new URL(databaseUrl);
  const socketPort = Number.parseInt(databasePort || "5432", 10);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const canConnect = await new Promise<boolean>((resolve) => {
      const socket = new Socket();

      socket.setTimeout(1_000);
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => {
        socket.destroy();
        resolve(false);
      });
      socket.once("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(socketPort, hostname);
    });

    if (canConnect) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error("Database was not reachable before startup timeout");
}

const app = createApp({ logger });

try {
  if (process.env.DATABASE_URL) {
    await waitForDatabase(process.env.DATABASE_URL);
  }

  const server = app.listen(port, () => {
    logger.info({ port }, "Custom Risk backend listening");
  });

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Shutting down backend");

    server.close(async (error) => {
      if (error) {
        logger.error({ error }, "Error while closing HTTP server");
        process.exitCode = 1;
      }

      await disconnectPrisma();
      process.exit();
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
} catch (error) {
  logger.error({ error }, "Backend startup failed");
  process.exit(1);
}
