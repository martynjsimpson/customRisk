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
    assert.equal(typeof body.data?.uptimeSeconds, "number");
    assert.equal(body.data?.observability?.metricsPath, "/api/v1/health/metrics");
    assert.equal(Array.isArray(body.data?.observability?.notes), true);
    assert.equal(Array.isArray(body.data?.observability?.recommendedAlerts), true);

    if (response.status === 200) {
      assert.equal(body.data.status, "ok");
      assert.equal(body.data.database, "ok");
    } else {
      assert.equal(body.data.status, "degraded");
      assert.equal(body.data.database, "unreachable");
    }
  });
});

test("GET /api/v1/health/metrics returns operator-safe metrics text", async () => {
  await withServer(createApp(), async (baseUrl) => {
    const healthResponse = await fetch(`${baseUrl}/api/v1/health`);
    const metricsResponse = await fetch(`${baseUrl}/api/v1/health/metrics`);
    const metricsText = await metricsResponse.text();

    assert.ok([200, 503].includes(metricsResponse.status), `unexpected status: ${metricsResponse.status}`);
    assert.match(metricsResponse.headers.get("content-type") ?? "", /^text\/plain/);
    assert.match(metricsText, /custom_risk_process_uptime_seconds/);
    assert.match(metricsText, /custom_risk_health_status\{component="app",status="ok"\} 1/);
    assert.match(metricsText, /custom_risk_http_requests_total/);
    assert.match(metricsText, /custom_risk_http_request_errors_total/);
    assert.match(metricsText, /custom_risk_http_request_duration_ms_total/);
    assert.match(
      metricsText,
      new RegExp(
        `custom_risk_http_requests_total\\{method="GET",route_group="health",status_code="${healthResponse.status}",status_class="${Math.floor(healthResponse.status / 100)}xx"\\} 1`
      )
    );
    assert.doesNotMatch(metricsText, /Sensitive internal detail/);
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
