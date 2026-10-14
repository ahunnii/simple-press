import type { LucideIcon } from "lucide-react";

import { cn } from "~/lib/utils";

/** Compact empty state for list / chart widgets. */
export function WidgetEmptyState({
  icon: Icon,
  title,
  hint,
  iconClassName,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  iconClassName?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Icon
        aria-hidden="true"
        className={cn("text-muted-foreground mb-2 h-9 w-9", iconClassName)}
      />
      <p className="text-muted-foreground text-sm">{title}</p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
}
