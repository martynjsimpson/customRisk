import { performance } from "node:perf_hooks";

import { runWithJobContext, type ObservabilityContext } from "./requestContext.js";

const requestDurationBucketsMs = [25, 50, 100, 250, 500, 1_000, 2_500, 5_000];
const jobDurationBucketsMs = [100, 250, 500, 1_000, 5_000, 15_000, 60_000];

function makeKey(labels: Record<string, string>) {
  return Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("|");
}

function escapeLabelValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function formatLabels(labels: Record<string, string>) {
  const entries = Object.entries(labels);

  if (entries.length === 0) {
    return "";
  }

  return `{${entries.map(([key, value]) => `${key}="${escapeLabelValue(value)}"`).join(",")}}`;
}

class CounterMetric {
  readonly #values = new Map<string, { labels: Record<string, string>; value: number }>();

  add(labels: Record<string, string>, increment = 1) {
    const key = makeKey(labels);
    const existing = this.#values.get(key);

    if (existing) {
      existing.value += increment;
      return;
    }

    this.#values.set(key, { labels: { ...labels }, value: increment });
  }

  lines(name: string, help: string) {
    const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} counter`];

    for (const { labels, value } of this.#values.values()) {
      lines.push(`${name}${formatLabels(labels)} ${value}`);
    }

    return lines;
  }
}

class GaugeMetric {
  readonly #values = new Map<string, { labels: Record<string, string>; value: number }>();

  add(labels: Record<string, string>, delta: number) {
    const key = makeKey(labels);
    const existing = this.#values.get(key);

    if (existing) {
      existing.value += delta;
      return;
    }

    this.#values.set(key, { labels: { ...labels }, value: delta });
  }

  lines(name: string, help: string) {
    const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} gauge`];

    for (const { labels, value } of this.#values.values()) {
      lines.push(`${name}${formatLabels(labels)} ${value}`);
    }

    return lines;
  }
}

class HistogramMetric {
  readonly #series = new Map<string, {
    buckets: number[];
    counts: number[];
    labels: Record<string, string>;
    sum: number;
    totalCount: number;
  }>();

  constructor(private readonly buckets: number[]) {}

  observe(labels: Record<string, string>, value: number) {
    const key = makeKey(labels);
    const existing = this.#series.get(key) ?? {
      buckets: [...this.buckets],
      counts: new Array(this.buckets.length).fill(0),
      labels: { ...labels },
      sum: 0,
      totalCount: 0
    };

    existing.sum += value;
    existing.totalCount += 1;

    for (let index = 0; index < existing.buckets.length; index += 1) {
      const bucketUpperBound = existing.buckets[index];

      if (bucketUpperBound !== undefined && value <= bucketUpperBound) {
        existing.counts[index] += 1;
      }
    }

    this.#series.set(key, existing);
  }

  lines(name: string, help: string) {
    const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} histogram`];

    for (const series of this.#series.values()) {
      for (let index = 0; index < series.buckets.length; index += 1) {
        lines.push(
          `${name}_bucket${formatLabels({ ...series.labels, le: String(series.buckets[index]) })} ${series.counts[index]}`
        );
      }

      lines.push(`${name}_bucket${formatLabels({ ...series.labels, le: "+Inf" })} ${series.totalCount}`);
      lines.push(`${name}_sum${formatLabels(series.labels)} ${series.sum}`);
      lines.push(`${name}_count${formatLabels(series.labels)} ${series.totalCount}`);
    }

    return lines;
  }
}

class ObservabilityMetricsRegistry {
  readonly #startedAt = Date.now();
  readonly #httpRequestsTotal = new CounterMetric();
  readonly #httpRequestErrorsTotal = new CounterMetric();
  readonly #httpRequestDurationMs = new HistogramMetric(requestDurationBucketsMs);
  readonly #jobsStartedTotal = new CounterMetric();
  readonly #jobsCompletedTotal = new CounterMetric();
  readonly #jobsActive = new GaugeMetric();
  readonly #jobDurationMs = new HistogramMetric(jobDurationBucketsMs);

  observeHttpRequest(input: {
    durationMs: number;
    method: string;
    route: string;
    statusCode: number;
  }) {
    const baseLabels = {
      method: input.method.toUpperCase(),
      route: input.route,
      status_code: String(input.statusCode)
    };

    this.#httpRequestsTotal.add(baseLabels);
    this.#httpRequestDurationMs.observe(
      {
        method: baseLabels.method,
        route: baseLabels.route
      },
      input.durationMs
    );

    if (input.statusCode >= 400) {
      this.#httpRequestErrorsTotal.add(baseLabels);
    }
  }

  startJob(jobName: string) {
    const labels = { job_name: jobName };
    this.#jobsStartedTotal.add(labels);
    this.#jobsActive.add(labels, 1);
  }

  finishJob(jobName: string, status: "success" | "error", durationMs: number) {
    const labels = { job_name: jobName };
    this.#jobsActive.add(labels, -1);
    this.#jobsCompletedTotal.add({ ...labels, status });
    this.#jobDurationMs.observe(labels, durationMs);
  }

  render() {
    const uptimeSeconds = (Date.now() - this.#startedAt) / 1_000;
    const lines = [
      "# HELP custom_risk_process_uptime_seconds Process uptime in seconds",
      "# TYPE custom_risk_process_uptime_seconds gauge",
      `custom_risk_process_uptime_seconds ${uptimeSeconds}`,
      ...this.#httpRequestsTotal.lines(
        "custom_risk_http_requests_total",
        "Total HTTP requests handled by route template and status code"
      ),
      ...this.#httpRequestErrorsTotal.lines(
        "custom_risk_http_request_errors_total",
        "Total HTTP requests that returned an error status code"
      ),
      ...this.#httpRequestDurationMs.lines(
        "custom_risk_http_request_duration_ms",
        "HTTP request duration in milliseconds by route template"
      ),
      ...this.#jobsStartedTotal.lines(
        "custom_risk_jobs_started_total",
        "Total observed background jobs started"
      ),
      ...this.#jobsCompletedTotal.lines(
        "custom_risk_jobs_completed_total",
        "Total observed background jobs completed by outcome"
      ),
      ...this.#jobsActive.lines(
        "custom_risk_jobs_active",
        "Current number of observed background jobs running"
      ),
      ...this.#jobDurationMs.lines(
        "custom_risk_job_duration_ms",
        "Observed background job duration in milliseconds"
      )
    ];

    return `${lines.join("\n")}\n`;
  }
}

export const metricsRegistry = new ObservabilityMetricsRegistry();

export function startTimer() {
  const startedAt = performance.now();
  return () => performance.now() - startedAt;
}

export function normaliseHttpRoute(route: string | undefined) {
  return route && route.length > 0 ? route : "unmatched";
}

export async function runObservedJob<T>(
  options: {
    context?: Partial<Pick<ObservabilityContext, "correlationId" | "requestId" | "traceId">>;
    jobName: string;
    jobId?: string;
  },
  callback: (context: ObservabilityContext) => Promise<T> | T
) {
  metricsRegistry.startJob(options.jobName);
  const stop = startTimer();

  try {
    const result = await runWithJobContext(
      {
        jobId: options.jobId,
        jobName: options.jobName,
        parentCorrelationId: options.context?.correlationId,
        parentRequestId: options.context?.requestId,
        parentTraceId: options.context?.traceId
      },
      callback
    );

    metricsRegistry.finishJob(options.jobName, "success", stop());
    return result;
  } catch (error) {
    metricsRegistry.finishJob(options.jobName, "error", stop());
    throw error;
  }
}
