import type { LucideIcon } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";

export interface AdminEmptyProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  filtered?: boolean;
  className?: string;
}

export function AdminEmpty({
  icon: Icon,
  title,
  description,
  action,
  filtered,
  className,
}: AdminEmptyProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {filtered ? (
        <div className="text-muted-foreground text-xs">
          Try adjusting your search or filters.
        </div>
      ) : (
        action && <EmptyContent>{action}</EmptyContent>
      )}
    </Empty>
  );
}
