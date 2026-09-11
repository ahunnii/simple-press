import { cn } from "~/lib/utils";

/**
 * The `--wealth-surface` padded panel used throughout overlap heroes and as a general
 * quiet content surface. Square corners, no shadow.
 */
export function WealthCaptionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("wealth-caption-card", className)}>{children}</div>;
}
