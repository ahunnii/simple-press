import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

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
};

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
}: DreamH1Props) {
  return (
    <h1 className={cn("dream-h1", className)}>
      <span {...(fieldKey ? fieldAttr(fieldKey) : {})}>{children}</span>
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
