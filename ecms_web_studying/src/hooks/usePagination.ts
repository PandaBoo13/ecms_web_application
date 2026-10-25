import { useState, useCallback } from 'react';

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  reset: () => void;
}

export const usePagination = (initialPage = 0, initialSize = 20): UsePaginationReturn => {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialSize);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return { page, pageSize, setPage, setPageSize, reset };
};