"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";

type AdminPaginationProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  /** Route to navigate within, e.g. "/admin/collections". */
  basePath: string;
  /** Singular/plural noun for the "Showing X–Y of Z" readout, e.g. { one: "collection", many: "collections" }. */
  itemNoun: { one: string; many: string };
};

/** Build a windowed page list with ellipses, e.g. 1 … 4 5 6 … 12. */
function getPageItems(current: number, total: number): (number | "ellipsis")[] {
  const delta = 1;
  const items: (number | "ellipsis")[] = [1];
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  if (left > 2) items.push("ellipsis");
  for (let i = left; i <= right; i++) items.push(i);
  if (right < total - 1) items.push("ellipsis");
  if (total > 1) items.push(total);

  return items;
}

export function AdminPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  basePath,
  itemNoun,
}: AdminPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const hrefFor = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage === 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const goToPage = (nextPage: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    router.push(hrefFor(nextPage));
  };

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalCount);
  const items = getPageItems(page, totalPages);
  const noun = totalCount === 1 ? itemNoun.one : itemNoun.many;

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 px-1 sm:flex-row">
      <p className="text-muted-foreground text-sm">
        Showing {firstItem}–{lastItem} of {totalCount} {noun}
      </p>

      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={hrefFor(page - 1)}
              onClick={goToPage(page - 1)}
              aria-disabled={page <= 1}
              className={
                page <= 1 ? "pointer-events-none opacity-50" : undefined
              }
            />
          </PaginationItem>

          {items.map((item, i) =>
            item === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink
                  href={hrefFor(item)}
                  onClick={goToPage(item)}
                  isActive={item === page}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationNext
              href={hrefFor(page + 1)}
              onClick={goToPage(page + 1)}
              aria-disabled={page >= totalPages}
              className={
                page >= totalPages
                  ? "pointer-events-none opacity-50"
                  : undefined
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
