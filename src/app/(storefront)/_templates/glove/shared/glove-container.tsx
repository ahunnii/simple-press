import type { CSSProperties, ReactNode } from "react";

import { cn } from "~/lib/utils";

type GloveContainerProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/** 1222px content column with 15px (24px from md) gutters. */
export function GloveContainer({
  children,
  className,
  style,
}: GloveContainerProps) {
  return (
    <div className={cn("glove-container", className)} style={style}>
      {children}
    </div>
  );
}
