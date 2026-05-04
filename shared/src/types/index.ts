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
