import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";

import express from "express";
import { z } from "zod";

import { errorHandler } from "../src/middleware/errorHandler.ts";
import { validateRequest } from "../src/middleware/validateRequest.ts";

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

function makeApp(method, path, middleware, handler) {
  const app = express();
  app.use(express.json());
  app[method](path, ...middleware, handler);
  app.use(errorHandler({ error: () => {} }));
  return app;
}

test("valid body passes through parsed values to handler", async () => {
  const schema = z.object({ name: z.string(), age: z.number() });
  const app = makeApp("post", "/test", [validateRequest({ body: schema })], (req, res) => {
    res.json({ name: req.body.name, age: req.body.age });
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alice", age: 30 })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { name: "Alice", age: 30 });
  });
});

test("invalid body returns 400 VALIDATION_ERROR with field messages", async () => {
  const schema = z.object({ name: z.string(), age: z.number() });
  const app = makeApp("post", "/test", [validateRequest({ body: schema })], (_req, res) => {
    res.json({ ok: true });
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: 123, age: "not-a-number" })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(typeof body.error.fields.name, "string");
    assert.equal(typeof body.error.fields.age, "string");
  });
});

test("missing required body field returns 400 with field message", async () => {
  const schema = z.object({ title: z.string() });
  const app = makeApp("post", "/test", [validateRequest({ body: schema })], (_req, res) => {
    res.json({ ok: true });
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(typeof body.error.fields.title, "string");
  });
});

test("body validation strips unknown fields via strict schema", async () => {
  const schema = z.object({ name: z.string() }).strict();
  const app = makeApp("post", "/test", [validateRequest({ body: schema })], (_req, res) => {
    res.json({ ok: true });
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alice", extra: "field" })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, "VALIDATION_ERROR");
  });
});

test("valid query passes through to handler", async () => {
  const schema = z.object({ page: z.string().optional() });
  const app = makeApp("get", "/test", [validateRequest({ query: schema })], (req, res) => {
    res.json({ page: req.query.page });
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/test?page=2`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { page: "2" });
  });
});

test("invalid query returns 400 VALIDATION_ERROR with field messages", async () => {
  const schema = z.object({ status: z.enum(["open", "closed"]) });
  const app = makeApp("get", "/test", [validateRequest({ query: schema })], (_req, res) => {
    res.json({ ok: true });
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/test?status=invalid`);
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(typeof body.error.fields.status, "string");
  });
});

test("valid params passes through to handler", async () => {
  const schema = z.object({ id: z.string().uuid() });
  const app = makeApp("get", "/items/:id", [validateRequest({ params: schema })], (req, res) => {
    res.json({ id: req.params.id });
  });
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/items/${validUuid}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { id: validUuid });
  });
});

test("invalid params returns 400 VALIDATION_ERROR with field messages", async () => {
  const schema = z.object({ id: z.string().uuid() });
  const app = makeApp("get", "/items/:id", [validateRequest({ params: schema })], (_req, res) => {
    res.json({ ok: true });
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/items/not-a-uuid`);
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(typeof body.error.fields.id, "string");
  });
});

test("combined body and query schemas both validated", async () => {
  const bodySchema = z.object({ name: z.string() });
  const querySchema = z.object({ format: z.enum(["json", "csv"]).optional() });
  const app = makeApp(
    "post", "/test",
    [validateRequest({ body: bodySchema, query: querySchema })],
    (req, res) => { res.json({ name: req.body.name, format: req.query.format }); }
  );
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/test?format=json`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alice" })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { name: "Alice", format: "json" });
  });
});

test("first failing schema short-circuits — body error returned when body fails", async () => {
  const bodySchema = z.object({ name: z.string() });
  const querySchema = z.object({ page: z.string().optional() });
  const app = makeApp(
    "post", "/test",
    [validateRequest({ body: bodySchema, query: querySchema })],
    (_req, res) => { res.json({ ok: true }); }
  );
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: 999 })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(typeof body.error.fields.name, "string");
  });
});

test("nested field errors use dot-path keys", async () => {
  const schema = z.object({ address: z.object({ city: z.string() }) });
  const app = makeApp("post", "/test", [validateRequest({ body: schema })], (_req, res) => {
    res.json({ ok: true });
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: { city: 123 } })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(typeof body.error.fields["address.city"], "string");
  });
});

test("malformed JSON returns standard validation error without stack trace", async () => {
  const schema = z.object({ name: z.string() });
  const app = makeApp("post", "/test", [validateRequest({ body: schema })], (_req, res) => {
    res.json({ ok: true });
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.deepEqual(body, {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid JSON request body",
        fields: { body: "Request body must be valid JSON" }
      }
    });
    assert.doesNotMatch(JSON.stringify(body), /stack|SyntaxError|Unexpected token/);
  });
});
