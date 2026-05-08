import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";

import express from "express";

import { createApp } from "../src/app.ts";
import { errorHandler } from "../src/middleware/errorHandler.ts";
import { requestContextMiddleware } from "../src/middleware/observability.ts";
import { metricsRegistry, runObservedJob } from "../src/observability/metrics.ts";
import { getObservabilityContext } from "../src/observability/requestContext.ts";

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

test("request observability sets correlation headers and request IDs on error responses", async () => {
  const app = express();

  app.use(requestContextMiddleware());
  app.get("/boom", () => {
    throw new Error("boom");
  });
  app.use(errorHandler({
    error: () => {}
  }));

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/boom`, {
      headers: {
        "X-Correlation-Id": "customer-visible-case-123"
      }
    });
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.match(response.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/i);
    assert.equal(response.headers.get("x-correlation-id"), "customer-visible-case-123");
    assert.equal(body.error.requestId, response.headers.get("x-request-id"));
  });
});

test("metrics endpoint exposes request and error counters without raw paths", async () => {
  await withServer(createApp(), async (baseUrl) => {
    await fetch(`${baseUrl}/api/v1/does-not-exist?email=secret@example.com`);
    const response = await fetch(`${baseUrl}/api/v1/metrics`);
    const body = await response.text();

    assert.equal(response.status, 200);
    const contentType = response.headers.get("content-type") ?? "";
    assert.match(contentType, /^text\/plain;/);
    assert.equal(contentType.includes("version=0.0.4"), true);
    assert.equal(contentType.includes("charset=utf-8"), true);
    assert.match(body, /custom_risk_http_requests_total\{method="GET",route="unmatched",status_code="404"\} \d+/);
    assert.match(body, /custom_risk_http_request_errors_total\{method="GET",route="unmatched",status_code="404"\} \d+/);
    assert.equal(body.includes("secret@example.com"), false);
    assert.equal(body.includes("does-not-exist?"), false);
  });
});

test("observed jobs inherit trace context and emit job metrics", async () => {
  const result = await runObservedJob(
    {
      jobName: "notifications_dispatch",
      context: {
        correlationId: "req-correlation-1",
        requestId: "req-parent-1",
        traceId: "0123456789abcdef0123456789abcdef"
      }
    },
    async () => {
      const context = getObservabilityContext();

      assert.ok(context);
      assert.equal(context?.source, "job");
      assert.equal(context?.jobName, "notifications_dispatch");
      assert.equal(context?.correlationId, "req-correlation-1");
      assert.equal(context?.traceId, "0123456789abcdef0123456789abcdef");

      return "ok";
    }
  );

  assert.equal(result, "ok");

  const metrics = metricsRegistry.render();
  assert.match(metrics, /custom_risk_jobs_started_total\{job_name="notifications_dispatch"\} \d+/);
  assert.match(metrics, /custom_risk_jobs_completed_total\{job_name="notifications_dispatch",status="success"\} \d+/);
});
