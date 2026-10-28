import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { nonBlank } from "./dream-non-blank";

type DreamH1Props = {
  children: React.ReactNode;
  /** One script word rendered in Parisienne rose after `children`. */
  accent?: string;
  className?: string;
  /** Field key backing `children`, when it is exactly one field's value. */
  fieldKey?: string;
  /** Field key backing `accent`, when it is exactly one field's value. */
  accentFieldKey?: string;
  /** Optional plain text rendered after the accent (lets the script word sit mid-heading). */
  after?: string;
  /** Field key backing `after`, when it is exactly one field's value. */
  afterFieldKey?: string;
  /**
   * Text for a screen-reader-only heading, used only when `children`,
   * `accent` and `after` are all blank (an owner can clear the visible
   * headline on purpose, e.g. when the logo heads the hero). Without it the
   * page would ship an empty `<h1>`.
   */
  fallback?: string;
};

/** True for a string that is blank; any non-string node counts as content. */
function isBlankNode(node: React.ReactNode): boolean {
  if (node === null || node === undefined || typeof node === "boolean") {
    return true;
  }
  return typeof node === "string" ? !nonBlank(node) : false;
}

/**
 * Same accent API as `DreamHeading` but for the page's single h1 — used by
 * the homepage hero and `DreamPageHero`. Every page in the template must
 * render exactly one of these (craft floor: "one h1 per page").
 */
export function DreamH1({
  children,
  accent,
  className,
  fieldKey,
  accentFieldKey,
  after,
  afterFieldKey,
  fallback,
}: DreamH1Props) {
  // Keep the (empty) visible spans so the layout is unchanged — the h1 still
  // takes its margin — and add the business name as sr-only text beside them.
  const srFallback =
    isBlankNode(children) && !nonBlank(accent) && !nonBlank(after)
      ? nonBlank(fallback)
      : undefined;
  return (
    <h1 className={cn("dream-h1", className)}>
      <span {...(fieldKey ? fieldAttr(fieldKey) : {})}>{children}</span>
      {srFallback ? <span className="sr-only">{srFallback}</span> : null}
      {accent ? (
        <>
          {" "}
          <span
            className="dream-script"
            {...(accentFieldKey ? fieldAttr(accentFieldKey) : {})}
          >
            {accent}
          </span>
        </>
      ) : null}
      {after ? (
        <>
          {" "}
          <span {...(afterFieldKey ? fieldAttr(afterFieldKey) : {})}>
            {after}
          </span>
        </>
      ) : null}
    </h1>
  );
}
