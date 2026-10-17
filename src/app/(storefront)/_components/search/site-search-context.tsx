"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";

import type { SearchPopularLink } from "./popular";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

/**
 * Site search state (flag `siteSearch`).
 *
 * `SiteSearchProvider` is mounted ONCE per page, inside
 * `StorefrontFlagsProvider`, around the template layout — in
 * `src/app/(storefront)/layout.tsx` and in the homepage `src/app/page.tsx`
 * (the homepage renders its layout outside the storefront route group). It
 * owns the open state, the global `/` and ⌘K / Ctrl-K shortcuts (one listener
 * per page, however many buttons mount), and the dialog itself.
 *
 * With the flag off the provider is a pass-through: no listener, no dialog,
 * and `useSiteSearch().enabled` is false so every button renders nothing.
 *
 * The dialog body is code-split (`next/dynamic`, ssr:false) and only loaded
 * on first open — or on a button's hover/focus via `prefetch()` — so headers
 * ship just the icon.
 */

const loadDialog = () => import("./site-search-dialog");

const SiteSearchDialog = dynamic(
  () => loadDialog().then((m) => m.SiteSearchDialog),
  { ssr: false },
);

export type SiteSearchOpenOptions = {
  /** Seed the input (e.g. a header that already has a typed value). */
  query?: string;
  /**
   * The element that opened the dialog. Used to find the template root the
   * dialog portals into (`closest("[data-sp-template-root]")`). Defaults to
   * the focused element.
   */
  trigger?: HTMLElement | null;
};

export type SiteSearchContextValue = {
  /** Flag on AND a provider is mounted. When false, render nothing. */
  enabled: boolean;
  isOpen: boolean;
  open: (options?: SiteSearchOpenOptions) => void;
  close: () => void;
  /** Warm the dialog bundle (call on hover / focus of a trigger). */
  prefetch: () => void;
};

const noop = () => undefined;

const DISABLED: SiteSearchContextValue = {
  enabled: false,
  isOpen: false,
  open: noop,
  close: noop,
  prefetch: noop,
};

const SiteSearchContext = createContext<SiteSearchContextValue>(DISABLED);

/**
 * `{ enabled, isOpen, open, close, prefetch }`. Safe outside the provider
 * (returns `enabled: false` and no-op actions).
 */
export function useSiteSearch(): SiteSearchContextValue {
  return useContext(SiteSearchContext);
}

/** The template root the dialog portals into, so it keeps the template's
 *  CSS variables and fonts (Radix portals to <body> by default). */
function resolveTemplateRoot(trigger?: HTMLElement | null): HTMLElement {
  const from =
    trigger ??
    (document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null);
  return (
    from?.closest<HTMLElement>("[data-sp-template-root]") ??
    document.querySelector<HTMLElement>("[data-sp-template-root]") ??
    document.body
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function SiteSearchProvider({
  popular = [],
  children,
}: {
  /** Chips for the empty state — `resolveSearchPopular()` on the server. */
  popular?: SearchPopularLink[];
  children: React.ReactNode;
}) {
  const { isEnabled } = useStorefrontFlags();
  const enabled = isEnabled("siteSearch");

  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [seed, setSeed] = useState<{ query: string; nonce: number } | null>(
    null,
  );

  const open = useCallback(
    (options?: SiteSearchOpenOptions) => {
      if (!enabled) return;
      setContainer(resolveTemplateRoot(options?.trigger));
      if (options?.query !== undefined) {
        const query = options.query;
        setSeed((prev) => ({ query, nonce: (prev?.nonce ?? 0) + 1 }));
      }
      setHasOpened(true);
      setIsOpen(true);
    },
    [enabled],
  );

  const close = useCallback(() => setIsOpen(false), []);

  const prefetch = useCallback(() => {
    if (enabled) void loadDialog();
  }, [enabled]);

  // Global shortcuts: "/" and ⌘K / Ctrl-K. Ignored while typing anywhere.
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.repeat) return;
      if (isTypingTarget(e.target)) return;
      const isSlash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey;
      const isCmdK =
        (e.key === "k" || e.key === "K") &&
        (e.metaKey || e.ctrlKey) &&
        !e.altKey &&
        !e.shiftKey;
      if (!isSlash && !isCmdK) return;
      // "/" is Firefox quick-find and ⌘K focuses the browser search bar.
      e.preventDefault();
      open();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled, open]);

  const value = useMemo<SiteSearchContextValue>(
    () => (enabled ? { enabled, isOpen, open, close, prefetch } : DISABLED),
    [enabled, isOpen, open, close, prefetch],
  );

  return (
    <SiteSearchContext.Provider value={value}>
      {children}
      {enabled && hasOpened ? (
        <SiteSearchDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          container={container}
          popular={popular}
          seed={seed}
        />
      ) : null}
    </SiteSearchContext.Provider>
  );
}
