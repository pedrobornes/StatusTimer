"use client";

import { usePathname, useRouter } from "next/navigation";
import Pagination from "@/components/ui/Pagination";

interface GameNewsPaginationProps {
  currentPage: number;
  totalPages: number;
}

export default function GameNewsPagination({
  currentPage,
  totalPages,
}: GameNewsPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) {
      params.set("page", String(page));
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      className="mt-8"
    />
  );
}
