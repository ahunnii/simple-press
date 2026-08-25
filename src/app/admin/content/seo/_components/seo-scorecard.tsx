import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  CircleAlert,
  Info,
} from "lucide-react";

import type { ChecklistItem } from "~/lib/admin/checklist";
import type { SeoEditTab } from "~/lib/seo/editor-tabs";
import type { SeoScorecard as SeoScorecardData } from "~/lib/seo/scorecard";
import { seoEditorTabFromHref } from "~/lib/seo/editor-tabs";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import {
  SUCCESS_TEXT,
  WARNING_TEXT,
} from "~/app/admin/_components/admin-table-style";

type RowState = "complete" | "partial" | "todo";

/** Shared visual for the "Fix" affordance — link and button must be identical. */
const FIX_CLASS =
  "text-primary inline-flex shrink-0 items-center gap-1 text-xs font-medium hover:underline";

function rowState(item: ChecklistItem): RowState {
  if (item.score >= 1) return "complete";
  return item.score > 0 ? "partial" : "todo";
}

const STATE_LABEL: Record<RowState, string> = {
  complete: "Done",
  partial: "Partly done",
  todo: "Not started",
};

/**
 * One "go and do this" affordance, resolved against where the fix actually
 * lives. A check whose fix is on this very page switches tabs in place instead
 * of navigating: the URL would not change path, so the dirty-form guard would
 * challenge it with a discard dialog and the owner would land right back on
 * this tab. Everything else stays a real link to another admin page.
 *
 * Identical markup either way — the owner should never be able to tell which
 * one they got.
 */
function ScorecardAction({
  href,
  className,
  onSelectTab,
  children,
}: {
  href: string;
  className: string;
  onSelectTab?: (tab: SeoEditTab) => void;
  children: ReactNode;
}) {
  const tab = seoEditorTabFromHref(href);

  if (tab !== null && onSelectTab) {
    return (
      <button
        type="button"
        onClick={() => onSelectTab(tab)}
        className={className}
      >
        {children}
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** The compact "Fix →" used on every incomplete check row. */
function FixAction({
  href,
  label,
  onSelectTab,
}: {
  href: string;
  label: string;
  onSelectTab?: (tab: SeoEditTab) => void;
}) {
  return (
    <ScorecardAction
      href={href}
      className={FIX_CLASS}
      onSelectTab={onSelectTab}
    >
      Fix
      <ArrowRight className="h-3 w-3" aria-hidden="true" />
      <span className="sr-only">: {label}</span>
    </ScorecardAction>
  );
}

function ScorecardRow({
  item,
  onSelectTab,
}: {
  item: ChecklistItem;
  onSelectTab?: (tab: SeoEditTab) => void;
}) {
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
        <FixAction
          href={item.href}
          label={item.label}
          onSelectTab={onSelectTab}
        />
      )}
    </li>
  );
}

/**
 * Search readiness report — the full drill-down for /admin/content/seo.
 *
 * Rendered by `SEOEditor` on its first tab ("Score"), which is where an owner
 * lands. It therefore sits INSIDE the editor's `<form>`, which is safe: the
 * accordion triggers below are Radix `Collapsible.Trigger`s, which render an
 * explicit `type="button"` (the `type="button"` written out here as well is
 * belt-and-braces, not a fix).
 *
 * Takes the scorecard as data rather than rendering itself on the server,
 * because seven of its checks are fixed on this very page. Those get
 * `onSelectTab` and switch tabs in place — a link would be a same-path
 * navigation, which the dirty-form guard challenges with a discard dialog and
 * which would drop the owner right back on this tab. See `~/lib/seo/editor-tabs`.
 *
 * Supplies no outer container of its own; the Score panel sets the measure.
 */
export function SeoScorecard({
  scorecard,
  onSelectTab,
}: {
  scorecard: SeoScorecardData;
  onSelectTab?: (tab: SeoEditTab) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle>Search readiness</CardTitle>
            <CardDescription className="max-w-2xl">
              The share of the SEO work that applies to your store that you have
              actually done.
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
            <ScorecardAction
              href={scorecard.next.href}
              className="text-foreground font-medium hover:underline"
              onSelectTab={onSelectTab}
            >
              {scorecard.next.label}
            </ScorecardAction>
          </p>
        ) : (
          <p className={cn("text-sm font-medium", SUCCESS_TEXT)}>
            Everything that applies to your store is done.
          </p>
        )}
      </CardHeader>

      <CardContent>
        {/* No `defaultValue`: every group starts collapsed, so the landing view
            is a summary the owner can take in at a glance rather than a wall of
            checks. Each trigger carries its own progress, so nothing has to be
            opened to know where the work is. */}
        <Accordion type="multiple">
          {scorecard.groups.map((group) => {
            const applicable = group.items.length > 0;

            return (
              <AccordionItem key={group.id} value={group.id}>
                <AccordionTrigger type="button" className="hover:no-underline">
                  <span className="flex flex-1 flex-wrap items-center justify-between gap-2 pr-2 text-left">
                    <span className="text-sm font-medium">{group.label}</span>
                    <span className="text-muted-foreground flex items-center gap-2 text-xs tabular-nums">
                      {!applicable ? (
                        "Not applicable"
                      ) : group.percent >= 100 ? (
                        <>
                          <CheckCircle2
                            className={cn("h-3.5 w-3.5", SUCCESS_TEXT)}
                            aria-hidden="true"
                          />
                          <span className={SUCCESS_TEXT}>Done</span>
                        </>
                      ) : (
                        <>
                          {/* Spans, not a `Progress`: this lives inside the
                              trigger `<button>`, and a `div[role=progressbar]`
                              would splice its value into the accessible name.
                              The percent beside it says the same thing aloud.
                              It is the group's *weighted* percent — the number
                              that rolls up into the headline — not a count of
                              fully-done checks, which coverage checks (partial
                              credit) can leave at "0 of 2" under a nearly full
                              bar. */}
                          <span
                            className="bg-foreground/10 inline-block h-1.5 w-14 overflow-hidden rounded-full sm:w-20"
                            aria-hidden="true"
                          >
                            <span
                              className="bg-primary block h-full rounded-full"
                              style={{ width: `${group.percent}%` }}
                            />
                          </span>
                          {`${group.percent}%`}
                        </>
                      )}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {applicable ? (
                    <ul className="-mt-1">
                      {group.items.map((item) => (
                        <ScorecardRow
                          key={item.key}
                          item={item}
                          onSelectTab={onSelectTab}
                        />
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

      {/* How the number is arrived at — worth keeping, not worth reading before
          the number itself. */}
      <CardFooter>
        <p className="text-muted-foreground text-xs">
          Each check carries a weight; coverage checks earn partial credit.
          Checks that don&apos;t apply — a feature you have turned off, or a
          catalog with nothing in it — are left out of the calculation rather
          than counted against you.
        </p>
      </CardFooter>
    </Card>
  );
}
