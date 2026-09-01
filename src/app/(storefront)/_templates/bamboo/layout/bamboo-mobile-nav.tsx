"use client";

import Link from "next/link";

import type { NavLink } from "./bamboo-header";

type BambooMobileNavProps = {
  id: string;
  open: boolean;
  onClose: () => void;
  links: NavLink[];
  isActive: (href: string) => boolean;
};

/**
 * Paper slide-down panel under the sticky header — ported from the mockup's
 * `.mnav` (`docs/templates/bamboo/build/mockup-refs/mockup-b.elided.html`
 * lines ~730-738): a `max-height` transition, not a side drawer. Escape and
 * scroll-lock are handled by the parent header (which owns `mobileOpen`
 * state and the burger button); this component only closes on link click.
 *
 * Nav items with `children` are flattened into indented sub-links rather than
 * an accordion — the panel's capped height (see `.bamboo-mobile-nav` in
 * globals.css) comfortably fits a flat list for any realistic nav tree, and
 * it keeps every real destination reachable without extra expand/collapse
 * state.
 */
export function BambooMobileNav({
  id,
  open,
  onClose,
  links,
  isActive,
}: BambooMobileNavProps) {
  return (
    <div
      id={id}
      role="navigation"
      aria-label="Mobile"
      className="bamboo-mobile-nav min-[901px]:hidden"
      data-open={open ? "true" : undefined}
      aria-hidden={!open}
    >
      <ul className="flex flex-col gap-0.5 px-5 pt-2.5 pb-[22px]">
        {links.map((link) => (
          <li key={link.href + link.label}>
            {link.href && link.href !== "#" ? (
              <Link
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                onClick={onClose}
                tabIndex={open ? undefined : -1}
                aria-current={isActive(link.href) ? "page" : undefined}
                className="bamboo-mobile-nav-link"
              >
                {link.label}
                {link.external && (
                  <span className="sr-only"> (opens in new tab)</span>
                )}
              </Link>
            ) : (
              <span className="bamboo-mobile-nav-link" aria-hidden="true">
                {link.label}
              </span>
            )}
            {link.children?.length ? (
              <ul className="flex flex-col gap-0.5 pb-1 pl-4">
                {link.children.map((child) => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      target={child.external ? "_blank" : undefined}
                      rel={child.external ? "noopener noreferrer" : undefined}
                      onClick={onClose}
                      tabIndex={open ? undefined : -1}
                      aria-current={isActive(child.href) ? "page" : undefined}
                      className="bamboo-mobile-nav-sublink"
                    >
                      {child.label}
                      {child.external && (
                        <span className="sr-only"> (opens in new tab)</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
