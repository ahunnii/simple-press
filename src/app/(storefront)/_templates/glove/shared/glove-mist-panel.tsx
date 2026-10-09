import type { CSSProperties, ReactNode } from "react";

import { cn } from "~/lib/utils";

type GloveMistPanelProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "aside";
};

/** Rounded 16px lavender-tinted container (gallery card, related panel, summaries). */
export function GloveMistPanel({
  children,
  className,
  style,
  as: Tag = "div",
}: GloveMistPanelProps) {
  return (
    <Tag className={cn("glove-mist-panel", className)} style={style}>
      {children}
    </Tag>
  );
}
