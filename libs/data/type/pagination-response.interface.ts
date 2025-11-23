export interface PaginationMetadata {
  pageSize: number;
  pageNumber: number;
  totalRecords: number;
}

export interface PaginatedResponseInterface<T> {
  data: T[];
  metadata: PaginationMetadata;
}
