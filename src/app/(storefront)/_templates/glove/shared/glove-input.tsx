import type { ComponentProps } from "react";

import { cn } from "~/lib/utils";

/** Hairline 44px input with a purple focus ring. */
export function GloveInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("glove-input", className)} {...props} />;
}

/** Multi-line variant of `GloveInput`. */
export function GloveTextarea({
  className,
  ...props
}: ComponentProps<"textarea">) {
  return <textarea className={cn("glove-input", className)} {...props} />;
}

/** Native select styled as `GloveInput` with a purple chevron. */
export function GloveSelect({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <select className={cn("glove-select", className)} {...props}>
      {children}
    </select>
  );
}
