import { AsyncLocalStorage } from "node:async_hooks";

interface AuditContext {
  ipAddress?: string;
}

const storage = new AsyncLocalStorage<AuditContext>();

export function runWithAuditContext<T>(context: AuditContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function getAuditIpAddress(): string | undefined {
  return storage.getStore()?.ipAddress;
}
