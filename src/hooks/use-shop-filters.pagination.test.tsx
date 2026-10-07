import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Product } from "~/types";

import { useShopFilters } from "./use-shop-filters";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/shop",
  useSearchParams: () => new URLSearchParams(search),
}));

const products = Array.from({ length: 30 }, (_, i) => ({
  id: `p${i}`,
  name: `Product ${i}`,
  slug: `p-${i}`,
  description: null,
  price: (i + 1) * 100,
  trackInventory: false,
  images: [],
  variants: [],
  collectionProducts: [],
})) as unknown as Product[];

describe("useShopFilters pagination", () => {
  beforeEach(() => {
    replace.mockClear();
    search = "";
    window.scrollTo = vi.fn() as never;
  });

  it("treats ?page=foo as page 1 and floors fractional pages", () => {
    search = "page=foo";
    const a = renderHook(() => useShopFilters(products, { pageSize: 12 }));
    expect(a.result.current.currentPage).toBe(1);
    expect(a.result.current.paginated).toHaveLength(12);

    search = "page=2.5";
    const b = renderHook(() => useShopFilters(products, { pageSize: 12 }));
    expect(b.result.current.currentPage).toBe(2);
  });

  it("exposes the unclamped requested page and clamps currentPage", () => {
    search = "page=99";
    const { result } = renderHook(() =>
      useShopFilters(products, { pageSize: 12 }),
    );
    expect(result.current.requestedPage).toBe(99);
    expect(result.current.currentPage).toBe(3);
  });

  it("exposes crawlable page links", () => {
    search = "sort_by=newest";
    const { result } = renderHook(() =>
      useShopFilters(products, { pageSize: 12 }),
    );
    expect(result.current.pageHref(2)).toBe("/shop?sort_by=newest&page=2");
    expect(result.current.pageLinkProps(2).href).toBe(
      "/shop?sort_by=newest&page=2",
    );
  });

  it("handlePage keeps today's behaviour", () => {
    const { result } = renderHook(() =>
      useShopFilters(products, { pageSize: 12 }),
    );
    act(() => result.current.handlePage(2));
    expect(replace).toHaveBeenCalledWith("/shop?page=2", { scroll: false });
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("committing a price max clears page", () => {
    search = "page=2";
    const { result } = renderHook(() =>
      useShopFilters(products, { pageSize: 12 }),
    );
    act(() => result.current.commitPriceMax(500));
    expect(replace).toHaveBeenCalledWith("/shop?price_max=500", {
      scroll: false,
    });
  });

  it("changing the collection clears page only when past page 1", () => {
    search = "page=2";
    const a = renderHook(() => useShopFilters(products, { pageSize: 12 }));
    act(() => a.result.current.setActiveCollectionId("c1"));
    expect(replace).toHaveBeenCalledWith("/shop", { scroll: false });
    expect(a.result.current.activeCollectionId).toBe("c1");

    replace.mockClear();
    search = "";
    const b = renderHook(() => useShopFilters(products, { pageSize: 12 }));
    act(() => b.result.current.setActiveCollectionId("c1"));
    expect(replace).not.toHaveBeenCalled();
  });
});
