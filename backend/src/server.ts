import { createServer } from "node:http";
import { Socket } from "node:net";

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

const server = createServer((request, response) => {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(
    JSON.stringify({
      data: {
        service: "custom-risk-backend",
        status: "bootstrapped",
        path: request.url
      }
    })
  );
});

try {
  if (process.env.DATABASE_URL) {
    await waitForDatabase(process.env.DATABASE_URL);
  }

  server.listen(port, () => {
    console.log(`Custom Risk backend listening on port ${port}`);
  });
} catch (error) {
  console.error(error);
  process.exit(1);
}
