/**
 * BUG-054: Feature flag middleware runtime behaviour tests.
 *
 * These tests spin up a minimal Express app that wires requireFeature()
 * middleware in the same way as the real router (router.use + sub-router),
 * and verify that disabled-flag requests receive a clean 404 response rather
 * than a 500 or an unhandled exception.
 *
 * Because featureFlags.ts evaluates process.env at module-load time, the
 * requireFeature middleware was changed in BUG-054 to read process.env
 * dynamically per request. These tests rely on that dynamic read.
 */

import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";

import express from "express";

import { requireFeature } from "../src/middleware/requireFeature.ts";
import { errorHandler } from "../src/middleware/errorHandler.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/**
 * Build a minimal app that mirrors the real pattern:
 *   router.use("/some-path", requireFeature(flag), subRouter)
 *
 * The sub-router has a single GET "/" handler that returns 200 { ok: true }.
 * If requireFeature blocks, the sub-router is never reached.
 */
function makeGatedApp(flagKey, envKey) {
  const app = express();

  const subRouter = express.Router();
  subRouter.get("/", (_req, res) => res.json({ ok: true }));

  // Mirror the real usage: router.use(path, requireFeature(flag), subRouter)
  app.use("/gated", requireFeature(flagKey), subRouter);
  app.use(errorHandler({ error: () => {} }));

  return app;
}

// ---------------------------------------------------------------------------
// requireFeature returns 404 when flag is disabled
// ---------------------------------------------------------------------------

test("requireFeature returns 404 NOT_FOUND when flag is disabled (apiKeys)", async () => {
  const saved = process.env.FEATURE_API_KEYS;
  try {
    process.env.FEATURE_API_KEYS = "false";
    const app = makeGatedApp("apiKeys", "FEATURE_API_KEYS");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/gated`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error.code, "NOT_FOUND");
      assert.ok(!("stack" in body), "Response must not expose a stack trace");
    });
  } finally {
    if (saved === undefined) delete process.env.FEATURE_API_KEYS;
    else process.env.FEATURE_API_KEYS = saved;
  }
});

test("requireFeature returns 404 NOT_FOUND when flag is disabled (savedViews)", async () => {
  const saved = process.env.FEATURE_SAVED_VIEWS;
  try {
    process.env.FEATURE_SAVED_VIEWS = "false";
    const app = makeGatedApp("savedViews", "FEATURE_SAVED_VIEWS");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/gated`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error.code, "NOT_FOUND");
      assert.ok(!("stack" in body));
    });
  } finally {
    if (saved === undefined) delete process.env.FEATURE_SAVED_VIEWS;
    else process.env.FEATURE_SAVED_VIEWS = saved;
  }
});

test("requireFeature returns 404 NOT_FOUND when flag is disabled (draftConfig)", async () => {
  const saved = process.env.FEATURE_DRAFT_CONFIG;
  try {
    process.env.FEATURE_DRAFT_CONFIG = "false";
    const app = makeGatedApp("draftConfig", "FEATURE_DRAFT_CONFIG");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/gated`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error.code, "NOT_FOUND");
      assert.ok(!("stack" in body));
    });
  } finally {
    if (saved === undefined) delete process.env.FEATURE_DRAFT_CONFIG;
    else process.env.FEATURE_DRAFT_CONFIG = saved;
  }
});

test("requireFeature returns 404 NOT_FOUND when flag is disabled (userPreferences)", async () => {
  const saved = process.env.FEATURE_USER_PREFERENCES;
  try {
    process.env.FEATURE_USER_PREFERENCES = "false";
    const app = makeGatedApp("userPreferences", "FEATURE_USER_PREFERENCES");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/gated`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error.code, "NOT_FOUND");
      assert.ok(!("stack" in body));
    });
  } finally {
    if (saved === undefined) delete process.env.FEATURE_USER_PREFERENCES;
    else process.env.FEATURE_USER_PREFERENCES = saved;
  }
});

test("requireFeature returns 404 NOT_FOUND when env var is absent (treated as disabled)", async () => {
  const saved = process.env.FEATURE_WEBHOOKS;
  try {
    delete process.env.FEATURE_WEBHOOKS;
    const app = makeGatedApp("webhooks", "FEATURE_WEBHOOKS");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/gated`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error.code, "NOT_FOUND");
    });
  } finally {
    if (saved === undefined) delete process.env.FEATURE_WEBHOOKS;
    else process.env.FEATURE_WEBHOOKS = saved;
  }
});

// ---------------------------------------------------------------------------
// requireFeature passes through when flag is enabled
// ---------------------------------------------------------------------------

test("requireFeature calls next() and reaches sub-router when flag is enabled (apiKeys)", async () => {
  const saved = process.env.FEATURE_API_KEYS;
  try {
    process.env.FEATURE_API_KEYS = "true";
    const app = makeGatedApp("apiKeys", "FEATURE_API_KEYS");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/gated`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.ok, true);
    });
  } finally {
    if (saved === undefined) delete process.env.FEATURE_API_KEYS;
    else process.env.FEATURE_API_KEYS = saved;
  }
});

test("requireFeature calls next() when flag is enabled (savedViews)", async () => {
  const saved = process.env.FEATURE_SAVED_VIEWS;
  try {
    process.env.FEATURE_SAVED_VIEWS = "true";
    const app = makeGatedApp("savedViews", "FEATURE_SAVED_VIEWS");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/gated`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.ok, true);
    });
  } finally {
    if (saved === undefined) delete process.env.FEATURE_SAVED_VIEWS;
    else process.env.FEATURE_SAVED_VIEWS = saved;
  }
});

// ---------------------------------------------------------------------------
// Case-insensitivity: "TRUE" and "True" should also enable the flag
// ---------------------------------------------------------------------------

test("requireFeature is case-insensitive — 'TRUE' enables the flag", async () => {
  const saved = process.env.FEATURE_CSV_IMPORT;
  try {
    process.env.FEATURE_CSV_IMPORT = "TRUE";
    const app = makeGatedApp("csvImport", "FEATURE_CSV_IMPORT");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/gated`);
      assert.equal(res.status, 200);
    });
  } finally {
    if (saved === undefined) delete process.env.FEATURE_CSV_IMPORT;
    else process.env.FEATURE_CSV_IMPORT = saved;
  }
});

test("requireFeature is case-insensitive — 'False' disables the flag", async () => {
  const saved = process.env.FEATURE_CSV_IMPORT;
  try {
    process.env.FEATURE_CSV_IMPORT = "False";
    const app = makeGatedApp("csvImport", "FEATURE_CSV_IMPORT");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/gated`);
      assert.equal(res.status, 404);
    });
  } finally {
    if (saved === undefined) delete process.env.FEATURE_CSV_IMPORT;
    else process.env.FEATURE_CSV_IMPORT = saved;
  }
});

// ---------------------------------------------------------------------------
// Verify response shape contains no stack trace under any flag state
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Registers router: non-flagged routes must not be blocked by a disabled flag
//
// This covers the bug where router.use("/", requireFeature(...), subRouter)
// intercepted ALL requests in the registers router — not just those belonging
// to the sub-router — causing GET /:registerId and other unflagged routes to
// receive a 404 when a flag was disabled.
//
// The fix mounts each flagged sub-router at its specific path prefix so that
// requireFeature only fires for requests that belong to that sub-router.
// ---------------------------------------------------------------------------

/**
 * Build a minimal app that mirrors the fixed registers router pattern:
 *
 *   router.use("/:registerId/saved-views", requireFeature("savedViews"), savedViewsSubRouter)
 *   router.get("/:registerId", mainHandler)
 *
 * When savedViews is disabled, GET /:registerId must still reach mainHandler.
 */
function makeRegistersLikeApp(flagKey, mountPath) {
  const app = express();

  const flaggedSubRouter = express.Router({ mergeParams: true });
  flaggedSubRouter.get("/", (_req, res) => res.json({ subRouter: true }));

  app.use(mountPath, requireFeature(flagKey), flaggedSubRouter);
  app.get("/:registerId", (_req, res) => res.json({ register: true }));
  app.use(errorHandler({ error: () => {} }));

  return app;
}

test("registers router: GET /:registerId is reachable when savedViews flag is disabled", async () => {
  const saved = process.env.FEATURE_SAVED_VIEWS;
  try {
    process.env.FEATURE_SAVED_VIEWS = "false";
    const app = makeRegistersLikeApp("savedViews", "/:registerId/saved-views");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/some-uuid`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.register, true);
    });
  } finally {
    if (saved === undefined) delete process.env.FEATURE_SAVED_VIEWS;
    else process.env.FEATURE_SAVED_VIEWS = saved;
  }
});

test("registers router: GET /:registerId/saved-views returns 404 when savedViews flag is disabled", async () => {
  const saved = process.env.FEATURE_SAVED_VIEWS;
  try {
    process.env.FEATURE_SAVED_VIEWS = "false";
    const app = makeRegistersLikeApp("savedViews", "/:registerId/saved-views");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/some-uuid/saved-views`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error.code, "NOT_FOUND");
    });
  } finally {
    if (saved === undefined) delete process.env.FEATURE_SAVED_VIEWS;
    else process.env.FEATURE_SAVED_VIEWS = saved;
  }
});

test("registers router: GET /:registerId is reachable when draftConfig flag is disabled", async () => {
  const saved = process.env.FEATURE_DRAFT_CONFIG;
  try {
    process.env.FEATURE_DRAFT_CONFIG = "false";
    const app = makeRegistersLikeApp("draftConfig", "/:registerId/config-versions");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/some-uuid`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.register, true);
    });
  } finally {
    if (saved === undefined) delete process.env.FEATURE_DRAFT_CONFIG;
    else process.env.FEATURE_DRAFT_CONFIG = saved;
  }
});

test("registers router: GET /:registerId/config-versions returns 404 when draftConfig flag is disabled", async () => {
  const saved = process.env.FEATURE_DRAFT_CONFIG;
  try {
    process.env.FEATURE_DRAFT_CONFIG = "false";
    const app = makeRegistersLikeApp("draftConfig", "/:registerId/config-versions");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/some-uuid/config-versions`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error.code, "NOT_FOUND");
    });
  } finally {
    if (saved === undefined) delete process.env.FEATURE_DRAFT_CONFIG;
    else process.env.FEATURE_DRAFT_CONFIG = saved;
  }
});

// ---------------------------------------------------------------------------
// Verify response shape contains no stack trace under any flag state
// ---------------------------------------------------------------------------

test("disabled-flag response body contains only error.code and error.message — no stack trace", async () => {
  const saved = process.env.FEATURE_NOTIFICATIONS;
  try {
    process.env.FEATURE_NOTIFICATIONS = "false";
    const app = makeGatedApp("notifications", "FEATURE_NOTIFICATIONS");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/gated`);
      assert.equal(res.status, 404);
      const body = await res.json();
      // Only allowed top-level keys: { error: { code, message } }
      assert.deepEqual(Object.keys(body), ["error"]);
      assert.equal(body.error.code, "NOT_FOUND");
      assert.equal(typeof body.error.message, "string");
      assert.ok(!("stack" in body.error), "No stack key in error object");
      assert.ok(!("trace" in body.error), "No trace key in error object");
    });
  } finally {
    if (saved === undefined) delete process.env.FEATURE_NOTIFICATIONS;
    else process.env.FEATURE_NOTIFICATIONS = saved;
  }
});
