/** Response chuẩn của BE — RequestResponse */
export interface RequestResponse<T = unknown> {
  status: 'success' | 'error';
  timestamp: string;
  message: string | null;
  data: T;
}

/** Response lỗi của BE — ExceptionResponse */
export interface ExceptionResponse {
  status: 'error';
  timestamp: string;
  message: string | Record<string, unknown>;
}

/** Page response (Spring Data) */
export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: { empty: boolean; sorted: boolean; unsorted: boolean };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  sort: { empty: boolean; sorted: boolean; unsorted: boolean };
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

/** Query params cho phân trang */
export interface PageParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}