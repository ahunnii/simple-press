import type { CSSProperties } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

type Props = {
  children: string;
  as?: "h1" | "h2" | "h3";
  /** Full template field key for `children`, when it's a live-patchable field. */
  fieldKey?: string;
  className?: string;
  style?: CSSProperties;
  id?: string;
};

/**
 * UmscHeading — h1/h2/h3 in Marcellus. `fieldAttr` is applied on the inner
 * span (not the heading element itself) so the preview patcher can target
 * the exact text node even when the heading carries other wrapper markup.
 * h1 is uppercase with `.035em` tracking (the Urban Wick posture); h2/h3 are
 * sentence-case.
 */
export function UmscHeading({
  children,
  as = "h2",
  fieldKey,
  className,
  style,
  id,
}: Props) {
  const Tag = as;
  const isH1 = as === "h1";
  return (
    <Tag
      id={id}
      className={cn(
        "umsc-serif font-normal text-balance",
        isH1
          ? "text-[clamp(42px,6.4vw,86px)] leading-[1.05] tracking-[0.035em] uppercase"
          : as === "h2"
            ? "text-[clamp(32px,4.2vw,56px)] leading-[1.08] tracking-[0.015em]"
            : "text-[clamp(22px,2.2vw,30px)] leading-[1.15] tracking-[0.015em]",
        className,
      )}
      style={style}
    >
      <span {...(fieldKey ? fieldAttr(fieldKey) : {})}>{children}</span>
    </Tag>
  );
}
