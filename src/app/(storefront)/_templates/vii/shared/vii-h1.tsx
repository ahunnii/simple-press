import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { nonBlank } from "./vii-non-blank";

type ViiH1Props = Omit<ComponentPropsWithoutRef<"h1">, "children"> & {
  /** The visible heading content; a blank string or no content counts as empty. */
  children?: ReactNode;
  /**
   * Text for a screen-reader-only heading, used only when `children` is
   * blank (an owner can clear the visible headline on purpose). Without it
   * the page would ship an empty or missing `<h1>`. Pages pass the page name
   * ("About", "Shop") or, for the homepage, the business name.
   */
  fallback?: string;
};

/** True for content with nothing visible: nullish, boolean or blank text. */
function isBlankNode(node: ReactNode): boolean {
  if (node === null || node === undefined || typeof node === "boolean") {
    return true;
  }
  if (typeof node === "string") return !nonBlank(node);
  if (Array.isArray(node)) return node.every(isBlankNode);
  return false;
}

/**
 * The page's single `<h1>` for vii pages. Renders its children as usual, and
 * falls back to an sr-only `fallback` when every visible part is blank, so a
 * vii page never has an empty or missing h1 (craft floor: one h1 per page).
 * Mirrors `DreamH1`'s sr-only fallback.
 */
export function ViiH1({ children, fallback, ...props }: ViiH1Props) {
  const srFallback = isBlankNode(children) ? nonBlank(fallback) : undefined;
  return (
    <h1 {...props}>
      {srFallback ? <span className="sr-only">{srFallback}</span> : children}
    </h1>
  );
}
