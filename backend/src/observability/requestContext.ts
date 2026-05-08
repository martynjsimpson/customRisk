import crypto from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

export interface ObservabilityContext {
  requestId: string;
  correlationId: string;
  traceId: string;
  source: "request" | "job";
  jobName?: string;
  jobId?: string;
}

interface JobContextOptions {
  jobId?: string;
  jobName: string;
  parentCorrelationId?: string;
  parentRequestId?: string;
  parentTraceId?: string;
}

const storage = new AsyncLocalStorage<ObservabilityContext>();
const safeHeaderValuePattern = /^[A-Za-z0-9._:-]{1,128}$/;
const traceParentPattern = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/i;

function asSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toSafeHeaderValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return safeHeaderValuePattern.test(trimmed) ? trimmed : undefined;
}

export function createRequestId() {
  return crypto.randomUUID();
}

export function parseTraceParent(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.trim().match(traceParentPattern);
  return match?.[1]?.toLowerCase();
}

export function createRequestContext(headers: Record<string, string | string[] | undefined>): ObservabilityContext {
  const requestId = createRequestId();
  const incomingRequestId = toSafeHeaderValue(asSingleValue(headers["x-request-id"]));
  const incomingCorrelationId = toSafeHeaderValue(asSingleValue(headers["x-correlation-id"]));
  const traceId = parseTraceParent(asSingleValue(headers.traceparent)) ?? requestId.replaceAll("-", "");

  return {
    requestId,
    correlationId: incomingCorrelationId ?? incomingRequestId ?? requestId,
    traceId,
    source: "request"
  };
}

export function runWithObservabilityContext<T>(context: ObservabilityContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function getObservabilityContext(): ObservabilityContext | undefined {
  return storage.getStore();
}

export function getObservabilityBindings() {
  const context = getObservabilityContext();

  if (!context) {
    return {};
  }

  return {
    correlationId: context.correlationId,
    jobId: context.jobId,
    jobName: context.jobName,
    requestId: context.requestId,
    source: context.source,
    traceId: context.traceId
  };
}

export async function runWithJobContext<T>(
  options: JobContextOptions,
  callback: (context: ObservabilityContext) => Promise<T> | T
) {
  const requestId = options.jobId ?? createRequestId();
  const context: ObservabilityContext = {
    requestId,
    correlationId: options.parentCorrelationId ?? options.parentRequestId ?? requestId,
    traceId: options.parentTraceId ?? requestId.replaceAll("-", ""),
    source: "job",
    jobId: requestId,
    jobName: options.jobName
  };

  return storage.run(context, () => callback(context));
}
