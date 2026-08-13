import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  CircleAlert,
  Info,
} from "lucide-react";

import type { ChecklistItem } from "~/lib/admin/checklist";
import type { SeoScorecard as SeoScorecardData } from "~/lib/seo/scorecard";
import { cn } from "~/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import {
  SUCCESS_TEXT,
  WARNING_TEXT,
} from "~/app/admin/_components/admin-table-style";

type RowState = "complete" | "partial" | "todo";

function rowState(item: ChecklistItem): RowState {
  if (item.score >= 1) return "complete";
  return item.score > 0 ? "partial" : "todo";
}

const STATE_LABEL: Record<RowState, string> = {
  complete: "Done",
  partial: "Partly done",
  todo: "Not started",
};

function ScorecardRow({ item }: { item: ChecklistItem }) {
  const state = rowState(item);
  const Icon =
    state === "complete"
      ? CheckCircle2
      : state === "partial"
        ? CircleAlert
        : Circle;

  return (
    <li className="border-border/60 flex items-start gap-3 border-b py-3 last:border-b-0">
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          state === "complete"
            ? SUCCESS_TEXT
            : state === "partial"
              ? WARNING_TEXT
              : "text-muted-foreground",
        )}
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm",
            state === "complete"
              ? "text-muted-foreground"
              : "text-foreground font-medium",
          )}
        >
          {item.label}
          <span className="sr-only"> — {STATE_LABEL[state]}</span>
        </p>
        {item.detail ? (
          <p className="text-muted-foreground mt-0.5 text-xs">{item.detail}</p>
        ) : null}
      </div>

      {state === "complete" ? null : (
        <Link
          href={item.href}
          className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-medium hover:underline"
        >
          Fix
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">: {item.label}</span>
        </Link>
      )}
    </li>
  );
}

/**
 * Search readiness report — the full drill-down for /admin/content/seo.
 *
 * Server component; takes the already-computed scorecard and renders it.
 *
 * ⚠️ It must stay OUTSIDE `<SEOEditor>`'s `<form>`. The accordion triggers
 * below are `<button>`s with no explicit `type`, so they default to
 * `type="submit"` and would save the whole SEO form on every expand.
 *
 * The page therefore builds this element and passes it to `SEOEditor` as its
 * `scorecard` prop (a server component may be passed as a prop to a client
 * component). `SEOEditor` renders it between its sticky toolbar and its
 * `<form>` — reading order is toolbar → how you're doing → what to change — so
 * this component supplies no container of its own.
 */
export function SeoScorecard({ scorecard }: { scorecard: SeoScorecardData }) {
  // Groups with work left open by default; finished ones collapse out of the
  // way so the page reads as a to-do list rather than an inventory.
  const openGroups = scorecard.groups
    .filter((group) => group.items.length > 0 && group.percent < 100)
    .map((group) => group.id);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle>Search readiness</CardTitle>
            <CardDescription className="max-w-2xl">
              The share of the SEO work that applies to your store that you have
              actually done. Each check carries a weight; coverage checks earn
              partial credit. Checks that don&apos;t apply — a feature you have
              turned off, or a catalog with nothing in it — are left out of the
              calculation rather than counted against you.
            </CardDescription>
          </div>
          <div className="text-primary text-3xl font-bold tabular-nums">
            {scorecard.percent}%
          </div>
        </div>

        <Progress
          value={scorecard.percent}
          className="mt-2 h-2"
          aria-label={`Search readiness: ${scorecard.percent}%`}
        />

        {scorecard.next ? (
          <p className="text-muted-foreground text-sm">
            Next up:{" "}
            <Link
              href={scorecard.next.href}
              className="text-foreground font-medium hover:underline"
            >
              {scorecard.next.label}
            </Link>
          </p>
        ) : (
          <p className={cn("text-sm font-medium", SUCCESS_TEXT)}>
            Everything that applies to your store is done.
          </p>
        )}
      </CardHeader>

      <CardContent>
        <Accordion type="multiple" defaultValue={openGroups}>
          {scorecard.groups.map((group) => {
            const applicable = group.items.length > 0;
            const done = group.items.filter((item) => item.score >= 1).length;

            return (
              <AccordionItem key={group.id} value={group.id}>
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex flex-1 flex-wrap items-center justify-between gap-2 pr-2 text-left">
                    <span className="text-sm font-medium">{group.label}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {applicable
                        ? `${done} of ${group.items.length} · ${group.percent}%`
                        : "Not applicable"}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {applicable ? (
                    <ul className="-mt-1">
                      {group.items.map((item) => (
                        <ScorecardRow key={item.key} item={item} />
                      ))}
                    </ul>
                  ) : (
                    <div className="text-muted-foreground flex items-start gap-3 py-1 text-sm">
                      <Info
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <p>{group.note ?? "Nothing to score here yet."}</p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
