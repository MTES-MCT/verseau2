import { useState } from 'react';

export function usePagination<T>(data: T[], pageSize: number = 10, defaultPage: number = 1) {
  const [currentPage, setCurrentPage] = useState(defaultPage);

  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPageLinkProps = (pageNumber: number) => ({
    href: `#page-${pageNumber}`,
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setCurrentPage(pageNumber);
    },
  });

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedData,
    getPageLinkProps,
  };
}
