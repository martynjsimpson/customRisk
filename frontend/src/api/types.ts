export interface ApiResponse<TData, TMeta = undefined> {
  data: TData;
  meta: TMeta;
}

export interface ListMeta {
  total: number;
  page: number;
  pageSize: number;
}
