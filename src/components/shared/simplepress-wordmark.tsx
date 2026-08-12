import * as React from "react";
import Link from "next/link";
import { IconTerminal } from "@tabler/icons-react";

import { cn } from "~/lib/utils";

type SimplePressWordmarkProps = Omit<
  React.ComponentPropsWithoutRef<typeof Link>,
  "children"
> & {
  /** Text (or node) shown beneath the wordmark, e.g. a business name or "Platform Admin". */
  subline: React.ReactNode;
  /** Extra classes for the subline span — e.g. to control its color. */
  sublineClassName?: string;
};

/**
 * The `<IconTerminal /> simple_press` lockup used at the top of every admin
 * sidebar, plus a smaller subline underneath. Renders a single `<Link>` so it
 * can be dropped directly inside `<SidebarMenuButton asChild>` (forwards ref
 * and spreads unknown props for Radix `Slot` merging).
 */
export const SimplePressWordmark = React.forwardRef<
  React.ElementRef<typeof Link>,
  SimplePressWordmarkProps
>(({ subline, sublineClassName, className, ...props }, ref) => {
  return (
    <Link
      ref={ref}
      className={cn("flex flex-col items-start", className)}
      {...props}
    >
      <span className="flex flex-row items-center gap-1 font-mono text-2xl font-bold">
        <IconTerminal className="size-8" />
        simple_press
      </span>
      <span className={cn("text-sm", sublineClassName)}>{subline}</span>
    </Link>
  );
});
SimplePressWordmark.displayName = "SimplePressWordmark";
