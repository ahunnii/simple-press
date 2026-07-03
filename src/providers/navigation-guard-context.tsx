"use client";

/**
 * In-app "unsaved changes" navigation guard.
 *
 * Next.js App Router has no client-side route-change events to hook into
 * (no equivalent of the old Pages Router `routeChangeStart`), so we can't
 * intercept navigation the "normal" way. Instead this provider listens for
 * clicks on `<a>` elements in the capture phase, decides whether the click
 * would navigate away from the current page, and — if a form has registered
 * itself as "dirty" — asks the user to confirm before letting the click
 * through.
 *
 * Known limitations (intentional, out of scope for this pass):
 *  - Only click-driven `<a>` navigations are guarded. Programmatic
 *    `router.push()` calls (e.g. the command palette, filter controls) are
 *    NOT intercepted — callers that navigate programmatically while a form
 *    could be dirty are responsible for their own UX.
 *  - Browser back/forward (`popstate`) is NOT intercepted. Reliably blocking
 *    back/forward in the App Router requires pushing extra history entries
 *    and fighting the browser's own back gesture, which is its own can of
 *    worms — left for a future pass if it's actually needed.
 *  - Tab/window close is still handled separately by the existing
 *    `beforeunload` listener in `useDirtyForm`; this provider only covers
 *    in-app link clicks.
 */

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

const DEFAULT_MESSAGE =
  "You have unsaved changes that will be lost if you leave this page.";

type NavigationGuardContextValue = {
  registerBlocker: (id: string, message?: string) => void;
  unregisterBlocker: (id: string) => void;
};

const NavigationGuardContext =
  createContext<NavigationGuardContextValue | null>(null);

type NavigationInterceptInput = {
  /** Whether at least one blocker is currently registered. */
  hasActiveBlocker: boolean;
  defaultPrevented: boolean;
  /** MouseEvent.button — 0 is the primary (left) button. */
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  /** The clicked anchor's `target` attribute, or null if absent. */
  target: string | null;
  hasDownload: boolean;
  /** The clicked anchor's resolved href, or null if it has no href attribute. */
  href: string | null;
  /** The current page's full URL (window.location.href). */
  currentHref: string;
};

export type NavigationInterceptDecision =
  | { intercept: true; path: string }
  | { intercept: false };

/**
 * Pure decision function for whether a click on an anchor should be
 * intercepted and turned into a confirmation dialog. Kept side-effect free
 * and exported so the rules can be unit tested without touching the DOM
 * event system.
 */
export function computeNavigationIntercept(
  input: NavigationInterceptInput,
): NavigationInterceptDecision {
  const {
    hasActiveBlocker,
    defaultPrevented,
    button,
    metaKey,
    ctrlKey,
    shiftKey,
    altKey,
    target,
    hasDownload,
    href,
    currentHref,
  } = input;

  if (!hasActiveBlocker) return { intercept: false };
  if (defaultPrevented) return { intercept: false };
  if (button !== 0) return { intercept: false };
  if (metaKey || ctrlKey || shiftKey || altKey) return { intercept: false };
  if (hasDownload) return { intercept: false };
  if (target !== null && target !== "" && target !== "_self") {
    return { intercept: false };
  }
  if (!href) return { intercept: false };

  let destUrl: URL;
  let currentUrl: URL;
  try {
    destUrl = new URL(href, currentHref);
    currentUrl = new URL(currentHref);
  } catch {
    return { intercept: false };
  }

  if (destUrl.origin !== currentUrl.origin) return { intercept: false };

  const samePath = destUrl.pathname === currentUrl.pathname;
  const sameSearch = destUrl.search === currentUrl.search;

  // Same pathname + search means this is a same-page hash link (or an
  // identical URL) — not a real navigation, so let it pass through
  // untouched (no dialog, no router.push).
  if (samePath && sameSearch) return { intercept: false };

  return {
    intercept: true,
    path: `${destUrl.pathname}${destUrl.search}${destUrl.hash}`,
  };
}

type PendingNavigation = { path: string } | null;

export function NavigationGuardProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const blockersRef = useRef<Map<string, string | undefined>>(new Map());
  const [hasBlockers, setHasBlockers] = useState(false);
  const [pending, setPending] = useState<PendingNavigation>(null);
  const [dialogMessage, setDialogMessage] = useState(DEFAULT_MESSAGE);

  const registerBlocker = useCallback((id: string, message?: string) => {
    blockersRef.current.set(id, message);
    setHasBlockers(true);
  }, []);

  const unregisterBlocker = useCallback((id: string) => {
    blockersRef.current.delete(id);
    setHasBlockers(blockersRef.current.size > 0);
  }, []);

  // Only pay for a document-level capture listener while something is
  // actually dirty.
  useEffect(() => {
    if (!hasBlockers) return;

    function handleClick(event: MouseEvent) {
      if (blockersRef.current.size === 0) return;

      const targetEl = event.target;
      if (!(targetEl instanceof Element)) return;

      const anchor = targetEl.closest("a");
      if (!anchor) return;

      const decision = computeNavigationIntercept({
        hasActiveBlocker: true,
        defaultPrevented: event.defaultPrevented,
        button: event.button,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        target: anchor.getAttribute("target"),
        hasDownload: anchor.hasAttribute("download"),
        href: anchor.hasAttribute("href") ? anchor.href : null,
        currentHref: window.location.href,
      });

      if (!decision.intercept) return;

      event.preventDefault();
      event.stopPropagation();

      let message: string | undefined;
      for (const blockerMessage of blockersRef.current.values()) {
        if (blockerMessage) {
          message = blockerMessage;
          break;
        }
      }

      setDialogMessage(message ?? DEFAULT_MESSAGE);
      setPending({ path: decision.path });
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [hasBlockers]);

  const handleCancel = useCallback(() => {
    setPending(null);
  }, []);

  const handleConfirm = useCallback(() => {
    const destination = pending?.path;
    // Clear every blocker first so the client-side navigation isn't
    // immediately re-intercepted and so any beforeunload listeners see a
    // clean state (client nav doesn't fire beforeunload anyway, but this
    // keeps the two guards consistent).
    blockersRef.current.clear();
    setHasBlockers(false);
    setPending(null);
    if (destination) router.push(destination);
  }, [pending, router]);

  const value = useMemo(
    () => ({ registerBlocker, unregisterBlocker }),
    [registerBlocker, unregisterBlocker],
  );

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>{dialogMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Stay</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirm}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </NavigationGuardContext.Provider>
  );
}

/**
 * Registers `dirty` as an active navigation blocker while true. No-ops
 * gracefully if no `NavigationGuardProvider` is mounted above the caller
 * (e.g. storefront contact forms outside the admin shell) — the context
 * default is `null`, so nothing is registered and behavior is unchanged.
 */
export function useNavigationGuard(dirty: boolean, message?: string) {
  const context = useContext(NavigationGuardContext);
  const id = useId();

  useEffect(() => {
    if (!context) return;

    if (dirty) {
      context.registerBlocker(id, message);
    } else {
      context.unregisterBlocker(id);
    }

    return () => {
      context.unregisterBlocker(id);
    };
  }, [context, dirty, id, message]);
}
