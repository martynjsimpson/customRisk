import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";

import express from "express";

import { createApp } from "../src/app.ts";
import { errorHandler } from "../src/middleware/errorHandler.ts";

async function withServer(app, callback) {
  const server = app.listen(0);

  try {
    await once(server, "listening");
    const address = server.address();
    assert.equal(typeof address, "object");
    assert.notEqual(address, null);

    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("GET /api/v1/health returns a valid health response", async () => {
  await withServer(createApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = await response.json();

    assert.ok([200, 503].includes(response.status), `unexpected status: ${response.status}`);
    assert.ok(["ok", "degraded"].includes(body.data?.status), `unexpected status field: ${body.data?.status}`);
    assert.ok(["ok", "unreachable"].includes(body.data?.database), `unexpected database field: ${body.data?.database}`);

    if (response.status === 200) {
      assert.equal(body.data.status, "ok");
      assert.equal(body.data.database, "ok");
    } else {
      assert.equal(body.data.status, "degraded");
      assert.equal(body.data.database, "unreachable");
    }
  });
});

test("central error handler returns standard errors without stack traces", async () => {
  let logged = false;
  const app = express();

  app.get("/boom", () => {
    throw new Error("Sensitive internal detail");
  });
  app.use(
    errorHandler({
      error: () => {
        logged = true;
      }
    })
  );

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/boom`);
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.deepEqual(body, {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred"
      }
    });
    assert.equal(JSON.stringify(body).includes("Sensitive internal detail"), false);
    assert.equal(JSON.stringify(body).includes("stack"), false);
    assert.equal(logged, true);
  });
});
