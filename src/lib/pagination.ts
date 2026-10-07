/**
 * Parses a page parameter, handling arrays and invalid values.
 * Returns 1 for invalid input (non-finite, < 1, or missing).
 */
export function parsePageParam(
  raw: string | string[] | null | undefined,
): number {
  // Take first element if array
  const value = Array.isArray(raw) ? raw[0] : raw;

  const num = Math.floor(Number(value));

  // Return 1 if not finite or < 1
  if (!Number.isFinite(num) || num < 1) return 1;

  return num;
}

/**
 * Builds a URL with updated page parameter.
 * Removes page param when page <= 1, sets it when page >= 2.
 * Preserves other params and their order.
 */
export function buildPageHref(
  pathname: string,
  params: URLSearchParams | string,
  page: number,
): string {
  const searchParams = new URLSearchParams(params);

  if (page <= 1) {
    searchParams.delete("page");
  } else {
    searchParams.set("page", String(page));
  }

  const qs = searchParams.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Returns a paginated path with page parameter in query string.
 * Page 1 returns just the path; page >= 2 includes ?page=N.
 */
export function paginatedPath(path: string, page: number): string {
  if (page <= 1) return path;
  return `${path}?page=${page}`;
}

/**
 * Checks if an event is a plain left click (button 0, no modifiers).
 * Returns false for middle/right click, modifier keys, or prevented events.
 */
export function isPlainLeftClick(e: {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}): boolean {
  return (
    e.button === 0 &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.shiftKey &&
    !e.altKey &&
    !e.defaultPrevented
  );
}
