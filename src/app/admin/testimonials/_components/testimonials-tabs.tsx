import Link from "next/link";

import { Badge } from "~/components/ui/badge";

type Props = {
  active: "testimonials" | "invites";
  testimonialCount: number;
  pendingCount: number;
  inviteCount: number;
};

const TAB_CLASS =
  "focus-visible:outline-ring inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
const TAB_ACTIVE = "border-primary text-primary";
const TAB_INACTIVE =
  "text-muted-foreground hover:border-border hover:text-foreground border-transparent";

/**
 * Server-safe tab nav — no "use client", no hooks. `active` comes from the
 * page's own `pickParam` read of `?tab=`, so the URL is the only state.
 *
 * Switching tabs deliberately navigates to a clean URL (no `?search=`,
 * `?status=`, `?sort=`, `?invites=` carried over) — this matches the old
 * card list's reset-on-tab-change behavior, and keeps each tab's filter
 * params from colliding with the other's.
 */
export function TestimonialsTabs({
  active,
  testimonialCount,
  pendingCount,
  inviteCount,
}: Props) {
  return (
    <nav aria-label="Testimonial views" className="border-border mb-6 border-b">
      <div className="-mb-px flex">
        <Link
          href="/admin/testimonials"
          aria-current={active === "testimonials" ? "page" : undefined}
          className={`${TAB_CLASS} ${active === "testimonials" ? TAB_ACTIVE : TAB_INACTIVE}`}
        >
          Testimonials ({testimonialCount})
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="h-5 min-w-5 px-1"
              aria-label={`${pendingCount} pending review`}
            >
              {pendingCount}
            </Badge>
          )}
        </Link>
        <Link
          href="/admin/testimonials?tab=invites"
          aria-current={active === "invites" ? "page" : undefined}
          className={`${TAB_CLASS} ${active === "invites" ? TAB_ACTIVE : TAB_INACTIVE}`}
        >
          Invites ({inviteCount})
        </Link>
      </div>
    </nav>
  );
}
