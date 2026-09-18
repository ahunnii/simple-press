import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

type DreamHeadingProps = {
  as: "h2" | "h3";
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
  id?: string;
};

/**
 * Italiana h2/h3 with an optional one-word Parisienne script accent
 * (design.md Typography: "ONLY as one accent word inside a heading … Never
 * for body, buttons, nav, or more than one word per heading"). Both spans
 * carry `fieldAttr` for live-text patching when a field key is supplied.
 */
export function DreamHeading({
  as: Tag,
  children,
  accent,
  className,
  fieldKey,
  accentFieldKey,
  after,
  afterFieldKey,
  id,
}: DreamHeadingProps) {
  return (
    <Tag id={id} className={cn("dream-heading", className)}>
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
    </Tag>
  );
}
