import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePageParam } from "./use-page-param";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/shop",
  useSearchParams: () => new URLSearchParams(search),
}));

function click(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    preventDefault: vi.fn(),
    ...overrides,
  } as never;
}

describe("usePageParam", () => {
  beforeEach(() => {
    replace.mockClear();
    search = "";
    window.scrollTo = vi.fn() as never;
  });

  it("parses the page and tolerates junk", () => {
    search = "page=3";
    expect(renderHook(() => usePageParam()).result.current.page).toBe(3);
    search = "page=foo";
    expect(renderHook(() => usePageParam()).result.current.page).toBe(1);
    search = "page=2.5";
    expect(renderHook(() => usePageParam()).result.current.page).toBe(2);
  });

  it("builds hrefs that keep other params and drop page for 1", () => {
    search = "sort_by=newest&page=2";
    const { result } = renderHook(() => usePageParam());
    expect(result.current.pageHref(3)).toBe("/shop?sort_by=newest&page=3");
    expect(result.current.pageHref(1)).toBe("/shop?sort_by=newest");
  });

  it("goToPage replaces without router scroll, then smooth-scrolls", () => {
    const { result } = renderHook(() => usePageParam());
    act(() => result.current.goToPage(2));
    expect(replace).toHaveBeenCalledWith("/shop?page=2", { scroll: false });
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("goToPage skips scrolling when asked", () => {
    const { result } = renderHook(() => usePageParam());
    act(() => result.current.goToPage(2, { scroll: false }));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("pageLinkProps intercepts a plain click but not modified clicks", () => {
    const { result } = renderHook(() => usePageParam());
    const props = result.current.pageLinkProps(2);
    expect(props.href).toBe("/shop?page=2");

    const plain = click();
    props.onClick(plain);
    expect(
      (plain as { preventDefault: () => void }).preventDefault,
    ).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/shop?page=2", { scroll: false });

    replace.mockClear();
    const meta = click({ metaKey: true });
    props.onClick(meta);
    expect(
      (meta as { preventDefault: () => void }).preventDefault,
    ).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("pageLinkProps forwards the scroll option", () => {
    const { result } = renderHook(() => usePageParam());
    act(() =>
      result.current.pageLinkProps(2, { scroll: false }).onClick(click()),
    );
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
