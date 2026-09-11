"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import type { Session } from "~/server/better-auth/config";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { UserButton } from "~/components/auth/user/user-button";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";

export type WealthNavChild = {
  label: string;
  href: string;
  external?: boolean;
};

export type WealthNavItem =
  | { type: "link"; label: string; href: string; external?: boolean }
  | { type: "group"; label: string; children: WealthNavChild[] };

type WealthNavOverlayProps = {
  open: boolean;
  onClose: () => void;
  /** Ref of the hamburger trigger button, so focus returns to it on close. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  items: WealthNavItem[];
  businessName: string;
  logoUrl?: string | null;
  logoAlt: string;
  socialLinks?: { facebook?: string; instagram?: string };
  initialSession?: Session | null;
};

/** Milliseconds the exit fade runs before unmount (entrance is slower). */
const EXIT_MS = 180;

/**
 * Full-screen white overlay menu opened by the header hamburger — the
 * template's one authored motion moment (see design.md Motion): the field
 * fades in, then the centered italic link column arrives line-by-line with
 * a capped stagger; exit is a faster plain fade. Folder items ("+ News &
 * Resources", "+ Programs") are in-place accordions matching the live
 * Squarespace drawer; the group containing the current page starts open.
 *
 * Mechanics (focus trap, inert siblings, scroll lock, escape) structurally
 * copied from `vii/layout/vii-header.tsx`'s mobile dialog. Entrance is
 * armed one frame after mount (`data-state`) so transitions actually run;
 * `open=false` keeps the DOM for EXIT_MS to let the exit fade play.
 */
export function WealthNavOverlay({
  open,
  onClose,
  triggerRef,
  items,
  businessName,
  logoUrl,
  logoAlt,
  socialLinks,
  initialSession,
}: WealthNavOverlayProps) {
  const pathname = usePathname();
  const { data: session, isPending } = useHydratedSession(initialSession);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const menuId = useId();

  const isActive = (href: string) => {
    if (!href || href === "#") return false;
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  };

  // ── Presence + entrance/exit phases ────────────────────────────────────
  // present: DOM mounted. state: "enter" (pre-arm frame) → "open" → "closing".
  const [present, setPresent] = useState(open);
  const [state, setState] = useState<"enter" | "open" | "closing">("enter");

  useEffect(() => {
    if (open) {
      setPresent(true);
      setState("enter");
      return undefined;
    }
    if (wasOpenRef.current) {
      setState("closing");
      const id = setTimeout(() => setPresent(false), EXIT_MS);
      return () => clearTimeout(id);
    }
    setPresent(false);
    return undefined;
  }, [open]);

  // Arm the entrance: after the hidden "enter" state is in the DOM, force a
  // synchronous style/layout resolution of it, then flip to "open" — the
  // recalc gives the transition a real starting frame. (A double-rAF races
  // the first paint here and the entrance silently jumps instead.)
  useLayoutEffect(() => {
    if (open && present && state === "enter") {
      dialogRef.current?.getBoundingClientRect();
      setState("open");
    }
  }, [open, present, state]);

  // ── Accordion state: the group containing the current page starts open ──
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!open) return;
    const initial: Record<string, boolean> = {};
    for (const item of items) {
      if (item.type === "group") {
        initial[item.label] = item.children.some((c) => isActive(c.href));
      }
    }
    setOpenGroups(initial);
    // Recompute only when the overlay opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Close on route change ──────────────────────────────────────────────
  useEffect(() => {
    if (open) onClose();
    // Only re-run when the route actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Escape closes ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // ── Body scroll lock ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ── Focus management: move focus in on open, return it on close ───────
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const id = setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => clearTimeout(id);
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [open, triggerRef]);

  // ── Inert siblings while open ────────────────────────────────────────────
  useEffect(() => {
    const siblings: Element[] = [];
    const header = document.querySelector("header");
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    if (header) siblings.push(header);
    if (main) siblings.push(main);
    if (footer) siblings.push(footer);

    if (open) {
      siblings.forEach((el) => el.setAttribute("inert", ""));
    } else {
      siblings.forEach((el) => el.removeAttribute("inert"));
    }
    return () => {
      siblings.forEach((el) => el.removeAttribute("inert"));
    };
  }, [open]);

  // ── Tab focus trap ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.closest("[inert]"));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [open]);

  if (!present) return null;

  let lineIndex = 0;

  return (
    <div
      ref={dialogRef}
      id={menuId}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="wealth-nav-overlay fixed inset-0 z-[60] flex flex-col"
      data-state={state}
    >
      {/* Top bar mirrors the header for continuity: the close X sits exactly
          where the hamburger was (left), logo stays centered. */}
      <div
        className="mx-auto flex w-full shrink-0 items-center justify-between gap-4 px-[var(--wealth-gutter)] [height:var(--wealth-header-h-mobile)] md:[height:var(--wealth-header-h)]"
        style={{ maxWidth: "var(--wealth-container)" }}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="wealth-nav-overlay-line -ml-2 flex min-h-11 min-w-11 items-center justify-center"
          style={
            {
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--wealth-ink)",
              "--i": 0,
            } as React.CSSProperties
          }
        >
          <X className="h-6 w-6" strokeWidth={1.25} aria-hidden="true" />
        </button>

        <Link
          href="/"
          onClick={onClose}
          aria-label={`${businessName} — Home`}
          className="wealth-nav-overlay-line relative h-12 w-40"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={logoAlt}
              fill
              sizes="160px"
              className="object-contain"
            />
          ) : (
            <span
              className="flex h-full items-center justify-center"
              style={{
                fontFamily: "var(--font-wealth-display)",
                fontStyle: "italic",
                fontSize: "20px",
                color: "var(--wealth-ink)",
              }}
            >
              {businessName}
            </span>
          )}
        </Link>

        {/* Right spacer keeps the logo optically centered. */}
        <div aria-hidden="true" className="min-w-11" />
      </div>

      {/* Centered italic link column — the Squarespace drawer's voice. */}
      <nav
        className="flex flex-1 flex-col justify-center overflow-y-auto px-[var(--wealth-gutter)] py-6 text-center"
        aria-label="Primary navigation"
      >
        <ul className="mx-auto flex w-full max-w-xl list-none flex-col p-0">
          {items.map((item) => {
            if (item.type === "link") {
              const i = ++lineIndex;
              const active = isActive(item.href);
              return (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    aria-current={active ? "page" : undefined}
                    className="wealth-nav-overlay-line wealth-nav-overlay-item inline-block py-2"
                    style={{ "--i": i } as React.CSSProperties}
                    data-active={active ? "true" : undefined}
                  >
                    {item.label}
                    {item.external ? (
                      <span className="sr-only"> (opens in new tab)</span>
                    ) : null}
                  </Link>
                </li>
              );
            }

            const i = ++lineIndex;
            const expanded = openGroups[item.label] ?? false;
            const groupId = `${menuId}-${item.label.replace(/\W+/g, "-")}`;
            const groupActive = item.children.some((c) => isActive(c.href));
            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups((prev) => ({
                      ...prev,
                      [item.label]: !expanded,
                    }))
                  }
                  aria-expanded={expanded}
                  aria-controls={groupId}
                  className="wealth-nav-overlay-line wealth-nav-overlay-item inline-block py-2"
                  style={
                    {
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      "--i": i,
                    } as React.CSSProperties
                  }
                  data-active={groupActive ? "true" : undefined}
                >
                  <span
                    aria-hidden="true"
                    className="wealth-nav-overlay-plus"
                    data-expanded={expanded ? "true" : "false"}
                  >
                    +
                  </span>{" "}
                  {item.label}
                </button>
                <div
                  id={groupId}
                  className="wealth-nav-overlay-children"
                  data-expanded={expanded ? "true" : "false"}
                >
                  <div className="min-h-0 overflow-hidden">
                    <ul className="m-0 flex list-none flex-col p-0 pb-2">
                      {item.children.map((child) => {
                        const active = isActive(child.href);
                        return (
                          <li key={child.href + child.label}>
                            <Link
                              href={child.href}
                              onClick={onClose}
                              target={child.external ? "_blank" : undefined}
                              rel={
                                child.external
                                  ? "noopener noreferrer"
                                  : undefined
                              }
                              aria-current={active ? "page" : undefined}
                              tabIndex={expanded ? undefined : -1}
                              className="wealth-nav-overlay-item wealth-nav-overlay-child inline-block py-1.5"
                              data-active={active ? "true" : undefined}
                            >
                              {child.label}
                              {child.external ? (
                                <span className="sr-only">
                                  {" "}
                                  (opens in new tab)
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Social icons, centered beneath the links like the live drawer. */}
        {socialLinks?.facebook || socialLinks?.instagram ? (
          <div
            className="wealth-nav-overlay-line mt-8 flex items-center justify-center gap-6"
            style={{ "--i": lineIndex + 1 } as React.CSSProperties}
          >
            {socialLinks.facebook ? (
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook (opens in new tab)"
                className="wealth-nav-overlay-social"
              >
                <FacebookIcon className="h-5 w-5" aria-hidden="true" />
              </a>
            ) : null}
            {socialLinks.instagram ? (
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram (opens in new tab)"
                className="wealth-nav-overlay-social"
              >
                <InstagramIcon className="h-5 w-5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        ) : null}
      </nav>

      {/* Bottom: quiet account row */}
      <div
        className="wealth-nav-overlay-line flex shrink-0 justify-center px-[var(--wealth-gutter)] py-5"
        style={
          {
            borderTop: "1px solid var(--wealth-surface-2)",
            "--i": lineIndex + 2,
          } as React.CSSProperties
        }
      >
        {isPending ? (
          <div
            className="h-8 w-8 animate-pulse rounded-full"
            style={{ background: "var(--wealth-surface)" }}
          />
        ) : session?.user ? (
          <UserButton
            size="icon"
            className="h-auto w-auto rounded-full p-0"
            avatarClassName="size-8"
          />
        ) : (
          <Link
            href="/auth/sign-in"
            onClick={onClose}
            className="wealth-btn-mono"
            style={{
              color: "var(--wealth-primary)",
              textDecoration: "none",
              letterSpacing: "1.9px",
            }}
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
}
