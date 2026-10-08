import type { ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

type GloveNoticeProps = {
  children: ReactNode;
  className?: string;
  /** Field key when the children are exactly one text field's value. */
  fieldKey?: string;
};

/** Purple notice box: white 13px text, 8px radius (e.g. "PLEASE NOTE: Sizes run small"). */
export function GloveNotice({
  children,
  className,
  fieldKey,
}: GloveNoticeProps) {
  return (
    <div
      role="note"
      className={cn("glove-notice", className)}
      {...(fieldKey ? fieldAttr(fieldKey) : {})}
    >
      {children}
    </div>
  );
}
