import { cn } from "~/lib/utils";

/**
 * Square hairline-bordered field on a faint fill (`--wealth-surface-3`),
 * 55px tall per design.md's footer/contact form spec. A thin wrapper around a plain
 * `<input>` so callers keep full control of `name`/`type`/`required`/etc.
 */
export const WealthInput = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn("wealth-input", className)} {...props} />
);
