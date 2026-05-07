type RouteGroup =
  | "health"
  | "auth"
  | "audit"
  | "dashboard"
  | "registers"
  | "users"
  | "api_other"
  | "non_api";

interface RequestMetric {
  count: number;
  errorCount: number;
  durationMsTotal: number;
}

interface MetricLabels {
  method: string;
  routeGroup: RouteGroup;
  statusCode: number;
}

interface HealthStatusSnapshot {
  app: "ok";
  database: "ok" | "unreachable";
}

const startedAtMs = Date.now();
const requestMetrics = new Map<string, RequestMetric>();

function makeMetricKey(labels: MetricLabels) {
  return `${labels.method}:${labels.routeGroup}:${labels.statusCode}`;
}

function getOrCreateMetric(labels: MetricLabels) {
  const key = makeMetricKey(labels);
  const existing = requestMetrics.get(key);

  if (existing) {
    return existing;
  }

  const created: RequestMetric = {
    count: 0,
    errorCount: 0,
    durationMsTotal: 0,
  };
  requestMetrics.set(key, created);
  return created;
}

function toRouteGroup(pathname: string): RouteGroup {
  if (pathname.startsWith("/api/v1/health")) {
    return "health";
  }

  if (pathname.startsWith("/api/v1/auth")) {
    return "auth";
  }

  if (pathname.startsWith("/api/v1/audit")) {
    return "audit";
  }

  if (pathname.startsWith("/api/v1/dashboard")) {
    return "dashboard";
  }

  if (pathname.startsWith("/api/v1/registers")) {
    return "registers";
  }

  if (pathname.startsWith("/api/v1/users")) {
    return "users";
  }

  if (pathname.startsWith("/api/v1/")) {
    return "api_other";
  }

  return "non_api";
}

function formatLabels(labels: Record<string, string | number>) {
  const entries = Object.entries(labels).map(([key, value]) => `${key}="${String(value)}"`);
  return `{${entries.join(",")}}`;
}

function formatMetricLine(name: string, labels: Record<string, string | number>, value: number) {
  return `${name}${formatLabels(labels)} ${value}`;
}

export function recordHttpRequest(method: string, pathname: string, statusCode: number, durationMs: number) {
  if (pathname === "/api/v1/health/metrics") {
    return;
  }

  const labels: MetricLabels = {
    method: method.toUpperCase(),
    routeGroup: toRouteGroup(pathname),
    statusCode,
  };
  const metric = getOrCreateMetric(labels);

  metric.count += 1;
  metric.durationMsTotal += durationMs;

  if (statusCode >= 500) {
    metric.errorCount += 1;
  }
}

export function getProcessUptimeSeconds() {
  return Math.max(0, (Date.now() - startedAtMs) / 1000);
}

export function getHealthDashboardNotes() {
  return {
    metricsPath: "/api/v1/health/metrics",
    notes: [
      "HTTP metrics are aggregated by route group and status code to avoid exposing identifiers or field values.",
      "Background-job metrics remain pending until notification, import, and webhook workers are introduced.",
    ],
    recommendedAlerts: [
      "Alert when health status is degraded or unavailable.",
      "Alert when 5xx request errors increase or request duration rises materially from baseline.",
    ],
  };
}

export function buildHealthPayload(database: HealthStatusSnapshot["database"]) {
  return {
    status: database === "ok" ? "ok" : "degraded",
    database,
    uptimeSeconds: Number(getProcessUptimeSeconds().toFixed(3)),
    observability: getHealthDashboardNotes(),
  };
}

export function renderMetricsText(health: HealthStatusSnapshot) {
  const lines = [
    "# HELP custom_risk_process_uptime_seconds Process uptime in seconds.",
    "# TYPE custom_risk_process_uptime_seconds gauge",
    `custom_risk_process_uptime_seconds ${getProcessUptimeSeconds().toFixed(3)}`,
    "# HELP custom_risk_health_status Health status by component.",
    "# TYPE custom_risk_health_status gauge",
    formatMetricLine(
      "custom_risk_health_status",
      { component: "app", status: health.app },
      1
    ),
    formatMetricLine(
      "custom_risk_health_status",
      { component: "database", status: "ok" },
      health.database === "ok" ? 1 : 0
    ),
    formatMetricLine(
      "custom_risk_health_status",
      { component: "database", status: "unreachable" },
      health.database === "unreachable" ? 1 : 0
    ),
    "# HELP custom_risk_http_requests_total Total HTTP requests processed.",
    "# TYPE custom_risk_http_requests_total counter",
    "# HELP custom_risk_http_request_errors_total Total HTTP requests that completed with 5xx responses.",
    "# TYPE custom_risk_http_request_errors_total counter",
    "# HELP custom_risk_http_request_duration_ms_total Cumulative HTTP request duration in milliseconds.",
    "# TYPE custom_risk_http_request_duration_ms_total counter",
  ];

  for (const [key, metric] of requestMetrics.entries()) {
    const parts = key.split(":");
    const method = parts[0] ?? "UNKNOWN";
    const routeGroup = parts[1] ?? "api_other";
    const statusCode = parts[2] ?? "0";
    const labels = {
      method,
      route_group: routeGroup,
      status_code: statusCode,
      status_class: `${statusCode[0]}xx`,
    };

    lines.push(formatMetricLine("custom_risk_http_requests_total", labels, metric.count));
    lines.push(formatMetricLine("custom_risk_http_request_errors_total", labels, metric.errorCount));
    lines.push(
      formatMetricLine(
        "custom_risk_http_request_duration_ms_total",
        labels,
        Number(metric.durationMsTotal.toFixed(3))
      )
    );
  }

  return `${lines.join("\n")}\n`;
}
