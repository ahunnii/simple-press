import type { CSSProperties } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

type Props = {
  children: string;
  /** Full template field key for `children`, when it's a live-patchable field. */
  fieldKey?: string;
  /** Ledes on black surfaces use `--umsc-cream-on-black` instead of `--umsc-muted`. */
  onBlack?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * UmscLede — the 17–18px body lede that pairs with every UmscHeading. Body
 * measure capped at 66ch per the craft floor.
 */
export function UmscLede({
  children,
  fieldKey,
  onBlack = false,
  className,
  style,
}: Props) {
  return (
    <p
      className={cn(
        "umsc-sans max-w-[66ch] text-[18px] leading-[1.6] max-sm:text-[16px]",
        onBlack
          ? "text-[var(--umsc-cream-on-black)]"
          : "text-[var(--umsc-muted)]",
        className,
      )}
      style={style}
    >
      <span {...(fieldKey ? fieldAttr(fieldKey) : {})}>{children}</span>
    </p>
  );
}
