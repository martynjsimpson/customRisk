# Observability Notes

This document covers the Phase 14 hardening foundation introduced by `PM14-01` and `PM14-02`.

## Endpoints

- `GET /api/v1/health`
  Returns JSON health status for the app and database reachability, plus process uptime.
- `GET /api/v1/metrics`
  Returns Prometheus-style plaintext metrics for HTTP traffic and observed background jobs.

## Correlation

- Every HTTP request gets a server-generated `X-Request-Id`.
- If a caller sends `X-Correlation-Id`, the app preserves it for logs and response headers after basic character validation.
- If a caller sends a valid W3C `traceparent` header, the trace ID portion is reused for the request context.
- Error responses include `error.requestId` so support teams can match user-visible failures to server logs without exposing internal stack traces.

## HTTP Metrics

The metrics endpoint currently exposes:

- request totals by method, route template, and status code;
- request error totals for `4xx` and `5xx` responses;
- request duration histograms by method and route template;
- process uptime.

Route labels intentionally use route templates or `unmatched` rather than raw URLs, so sensitive IDs, emails, query strings, and business data do not appear in metrics.

## Job Metrics And Tracing

Use `runObservedJob(...)` for background work that should:

- increment job counters and duration histograms;
- preserve correlation and trace context from the triggering request where available;
- create a stable place for future notification, import, and webhook runners to attach logs.

Recommended labels for future jobs:

- `notifications_dispatch`
- `import_run`
- `webhook_delivery`

## Dashboard Notes

Suggested first dashboard panels:

- health status and database reachability;
- request rate by route;
- request error rate split by `4xx` and `5xx`;
- p95 request duration for auth, dashboard, registers, and risks routes;
- active jobs, job failures, and job duration by job name.

## Alerting Recommendations

Suggested initial alerts:

- health endpoint degraded for 2 consecutive minutes;
- any sustained `5xx` rate above normal baseline for 5 minutes;
- p95 latency above agreed thresholds on login or core register/risk routes;
- any job failure count increase for notification, import, or webhook workers once those jobs ship;
- jobs active for unusually long durations, indicating stuck workers or downstream dependency problems.

## Logging Guidance

- Log request, route, status, and duration.
- Do not log secrets, tokens, passwords, refresh tokens, or full business payloads.
- Treat request and correlation IDs as diagnostic identifiers only, not as authentication or authorization material.
