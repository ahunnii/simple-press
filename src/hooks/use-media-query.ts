import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query.
 *
 * Backed by `useSyncExternalStore`, so the value is read synchronously on the
 * client (no mount flash) and never tears. During SSR — and during hydration,
 * where React reuses the server snapshot — the hook returns `initialValue`
 * (default `false`). Pass a server-derived guess (e.g. from the request's
 * user agent) so the first paint matches the device and hydration doesn't
 * flip the layout. React re-renders with the real value right after hydrating.
 */
export function useMediaQuery(query: string, initialValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  const getServerSnapshot = useCallback(() => initialValue, [initialValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
