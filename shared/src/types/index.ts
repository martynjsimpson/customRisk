export type ApiEnvelope<TData, TMeta = undefined> = TMeta extends undefined
  ? { data: TData }
  : { data: TData; meta: TMeta };

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

// ─── Review Comment Mode (PM8-CORE) ──────────────────────────────────────────

export type ReviewCommentMode = "DISABLED" | "OPTIONAL" | "MANDATORY";

// ─── Response Actions (PM7-CORE) ─────────────────────────────────────────────

export type ResponseActionStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "IMPLEMENTED"
  | "DEFERRED"
  | "CANCELLED";

export type ResponseActionMode = "SIMPLE" | "CHILD_RECORDS";

export interface ResponseActionOwner {
  personId:    string | null;
  userId:      string | null;
  email:       string | null;
  displayName: string | null;
}

export interface ResponseAction {
  id:        string;
  response:  string;
  status:    ResponseActionStatus;
  owner:     ResponseActionOwner;
  isDeleted: boolean;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
  updatedAt: string;
  updatedBy: { id: string; name: string; email: string };
}
