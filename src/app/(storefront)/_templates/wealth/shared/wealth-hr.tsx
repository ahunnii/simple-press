import { cn } from "~/lib/utils";

/** Hairline divider on the rhythm grid. */
export function WealthHr({ className }: { className?: string }) {
  return <hr className={cn("wealth-hr", className)} />;
}
