"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import type { DistanceInput, QuestionInput } from "./builder-shared";
import { formatPrice } from "~/lib/prices";
import { customerEstimateFrom } from "~/lib/quote/customer-estimate";
import { finalizeEstimateCents } from "~/lib/quote/evaluate";
import { evaluateFormula } from "~/lib/quote/formula";
import { resolveVisibility } from "~/lib/quote/visibility";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { formatFormulaValue, isVariableQuestionInput } from "./builder-shared";

type Props = {
  /**
   * Every question, FLATTENED across screens (`flattenScreens`) — the same
   * order the visitor meets them in, which is the order `resolveVisibility`
   * and the validator both reason about. Screens themselves change nothing
   * about the price, so the panel never needs to know about them.
   */
  questions: QuestionInput[];
  distances: DistanceInput[];
  /** Every tab the calculator has — empty when tabs are off. */
  tabs: { id: string; label: string; formula: string | null }[];
  formula: string;
  showEstimateToCustomer: boolean;
  /** Off = the figure only ever reaches the visitor by email, never on screen. */
  showEstimateOnScreen: boolean;
  displayAsRange: boolean;
  rangePaddingPercent: number;
  thankYouMessage: string;
};

/**
 * Anything the owner may have half-typed reads back as a number here.
 *
 * The builder writes `undefined` into a numeric field the owner has emptied
 * (so the resolver can say "Required" rather than complain about `null`), which
 * means a value the type system calls `number` can genuinely be missing while
 * the form is being filled in. The panel must keep computing through that
 * rather than produce NaN.
 */
function asFinite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Radix Select rejects an empty item value; "no sample answer" needs one. */
const UNANSWERED = "__unanswered__";

/**
 * Live price preview for the calculator being edited.
 *
 * Client-only and stateless across reloads — the sample answers are scratch
 * input, never saved. What makes it trustworthy is that the two functions doing
 * the real work are the SAME ones the server runs: `resolveVisibility` decides
 * which questions count, and `evaluateFormula` produces the number. The
 * per-type variable rules below (multi-select sums, unanswered single-answer
 * questions fall back to `hiddenDefault`, a checked-nothing multi-select is 0
 * rather than its `hiddenDefault`) mirror `computeQuote` case for case; see
 * `src/lib/quote/evaluate.ts`.
 *
 * The one thing it cannot reproduce is a distance: real mileage comes from a
 * ZIP → coordinates table the browser never receives, so those variables take a
 * sample number typed by the owner instead.
 */
export function CalculatorTestPanel({
  questions,
  distances,
  tabs,
  formula,
  showEstimateToCustomer,
  showEstimateOnScreen,
  displayAsRange,
  rangePaddingPercent,
  thankYouMessage,
}: Props) {
  // A plain `useState` seed rather than a derived value: the owner may
  // deliberately switch tabs mid-test, and that choice should survive
  // re-renders caused by editing elsewhere in the builder. `resolvedTabId`
  // below is what falls back to a valid tab if this one goes stale (removed,
  // or tabs turned off entirely) — this state is only ever the owner's LAST
  // click, never re-derived from it.
  const [selectedTabId, setSelectedTabId] = useState<string | null>(
    tabs[0]?.id ?? null,
  );

  // Fails closed the same way `resolveVisibility` does for a dangling id: no
  // tabs → `null` (pre-tabs behavior); a selection that no longer exists
  // (the owner removed or renamed away from it while this panel was mounted)
  // → the first available tab, rather than silently pricing against a tab
  // that is no longer on screen.
  const resolvedTabId =
    tabs.length === 0
      ? null
      : (tabs.find((tab) => tab.id === selectedTabId)?.id ??
        tabs[0]?.id ??
        null);
  const activeTab = tabs.find((tab) => tab.id === resolvedTabId);
  // `undefined`, not `""`, for a blank-but-present override: `formula ?? ""`
  // has already ruled out `null`/`undefined` two lines down, so an override
  // that trims to nothing has to become `undefined` itself to actually fall
  // through to the shared formula rather than evaluate as an empty string.
  const rawTabFormula = activeTab?.formula?.trim();
  const activeTabFormula = rawTabFormula === "" ? undefined : rawTabFormula;
  // The tab's override prices the tab it applies to; everything else still
  // falls back to the shared root formula — same rule `computeQuote` applies
  // server-side.
  const effectiveFormula = activeTabFormula ?? formula;

  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, string>>(
    {},
  );
  const [multiAnswers, setMultiAnswers] = useState<Record<string, string[]>>(
    {},
  );
  const [numberAnswers, setNumberAnswers] = useState<
    Record<string, number | null>
  >({});
  const [distanceAnswers, setDistanceAnswers] = useState<
    Record<string, number | null>
  >({});

  const resetSamples = () => {
    setChoiceAnswers({});
    setMultiAnswers({});
    setNumberAnswers({});
    setDistanceAnswers({});
  };

  // Branching, resolved exactly as the storefront runner and the server do.
  // `showIf` is normalized first: react-hook-form can materialize an untouched
  // condition as `{ questionId: undefined }`, and a truthy-but-empty object
  // would read as "hidden behind a nonexistent question". The definition
  // schema performs the same normalization at save time.
  const visibilityQuestions = questions.map((question) => ({
    ...question,
    showIf: question.showIf?.questionId ? question.showIf : null,
  }));
  const visibility = resolveVisibility(
    visibilityQuestions,
    (questionId) => {
      const target = questions.find((question) => question.id === questionId);
      if (!target) return undefined;
      if (target.type !== "choice" && target.type !== "dropdown") {
        return undefined;
      }
      return choiceAnswers[questionId];
    },
    resolvedTabId,
  );

  const variables: Record<string, number> = {};

  for (const question of questions) {
    if (!isVariableQuestionInput(question)) continue;
    const name = question.variableName.trim();
    if (name === "") continue;

    const hiddenDefault = asFinite(question.hiddenDefault, 0);

    if (visibility.get(question.id) !== true) {
      variables[name] = hiddenDefault;
      continue;
    }

    if (question.type === "choice" || question.type === "dropdown") {
      const selectedId = choiceAnswers[question.id];
      const option = selectedId
        ? question.options.find((candidate) => candidate.id === selectedId)
        : undefined;
      variables[name] = option
        ? asFinite(option.value, 0)
        : // Unanswered single-answer question == "did not apply".
          hiddenDefault;
      continue;
    }

    if (question.type === "multiselect") {
      const checked = multiAnswers[question.id] ?? [];
      // 0, not `hiddenDefault` — the sum of nothing checked is zero. Matches
      // `computeQuote`; `hiddenDefault` on a multi-select only applies when the
      // question was branched away entirely.
      let total = 0;
      for (const optionId of new Set(checked)) {
        const option = question.options.find(
          (candidate) => candidate.id === optionId,
        );
        if (option) total += asFinite(option.value, 0);
      }
      variables[name] = total;
      continue;
    }

    // `?? hiddenDefault` and not `|| hiddenDefault`: a typed 0 is a real answer.
    variables[name] = numberAnswers[question.id] ?? hiddenDefault;
  }

  for (const distance of distances) {
    const name = distance.variableName.trim();
    if (name === "") continue;
    variables[name] =
      distanceAnswers[distance.id] ?? asFinite(distance.hiddenDefault, 0);
  }

  const trimmedFormula = effectiveFormula.trim();
  const evaluated =
    trimmedFormula === "" ? null : evaluateFormula(trimmedFormula, variables);

  // The SAME function `computeQuote` calls for a real submission — round →
  // negative→null → -0→0 → over-cap→null — so a preview that shows a number
  // never disagrees with what a real lead would store.
  const finalized =
    evaluated?.ok === true ? finalizeEstimateCents(evaluated.value) : null;
  const estimateCents = finalized?.estimateCents ?? null;

  // The same helper the `submit` mutation and the live-estimate endpoint use,
  // so "what the visitor sees" here is literally what they would be shown.
  const customerEstimate = customerEstimateFrom(
    { showEstimateToCustomer, displayAsRange, rangePaddingPercent },
    estimateCents,
  );

  const sampleQuestions = questions.filter(isVariableQuestionInput);
  const hasSamples = sampleQuestions.length > 0 || distances.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>Test it</CardTitle>
            <CardDescription>
              Answer as a visitor would and watch the price. Nothing here is
              saved.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetSamples}
            disabled={!hasSamples}
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {tabs.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="test-panel-tab">Tab</Label>
            <Select
              value={resolvedTabId ?? undefined}
              onValueChange={setSelectedTabId}
            >
              <SelectTrigger id="test-panel-tab">
                <SelectValue placeholder="Pick a tab" />
              </SelectTrigger>
              <SelectContent>
                {tabs.map((tab) => (
                  <SelectItem key={tab.id} value={tab.id}>
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {`Pricing with: ${activeTabFormula ? "Tab formula" : "Shared formula"}`}
            </p>
          </div>
        )}

        {!hasSamples ? (
          <p className="text-muted-foreground text-sm">
            Add a priced question — choice, multi-select, dropdown or number —
            and its sample input appears here.
          </p>
        ) : (
          <div className="space-y-4">
            {sampleQuestions.map((question) => {
              const isHidden = visibility.get(question.id) !== true;
              const label =
                question.title.trim() ||
                question.variableName.trim() ||
                "Untitled question";

              return (
                <div
                  key={question.id}
                  className={cn("space-y-1.5", isHidden && "opacity-50")}
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Label htmlFor={`sample-${question.id}`}>{label}</Label>
                    <span className="text-muted-foreground font-mono text-xs">
                      {question.variableName.trim() || "unnamed"}
                    </span>
                    {isHidden && (
                      <span className="text-muted-foreground text-xs">
                        hidden by branching — using the skipped value
                      </span>
                    )}
                  </div>

                  {(question.type === "choice" ||
                    question.type === "dropdown") && (
                    <Select
                      value={choiceAnswers[question.id] ?? UNANSWERED}
                      onValueChange={(value) =>
                        setChoiceAnswers((previous) => {
                          const next = { ...previous };
                          if (value === UNANSWERED) delete next[question.id];
                          else next[question.id] = value;
                          return next;
                        })
                      }
                    >
                      <SelectTrigger id={`sample-${question.id}`}>
                        <SelectValue placeholder="Not answered" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNANSWERED}>Not answered</SelectItem>
                        {question.options.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {`${option.label.trim() || "Untitled option"} (${formatFormulaValue(
                              asFinite(option.value, 0),
                            )})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {question.type === "multiselect" && (
                    <div className="space-y-1.5">
                      {question.options.map((option) => {
                        const checked = (
                          multiAnswers[question.id] ?? []
                        ).includes(option.id);
                        return (
                          <div
                            key={option.id}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              id={`sample-${question.id}-${option.id}`}
                              checked={checked}
                              onCheckedChange={(next) =>
                                setMultiAnswers((previous) => {
                                  const current = previous[question.id] ?? [];
                                  return {
                                    ...previous,
                                    [question.id]:
                                      next === true
                                        ? [...current, option.id]
                                        : current.filter(
                                            (id) => id !== option.id,
                                          ),
                                  };
                                })
                              }
                            />
                            <Label
                              htmlFor={`sample-${question.id}-${option.id}`}
                              className="text-sm font-normal"
                            >
                              {`${option.label.trim() || "Untitled option"} (${formatFormulaValue(
                                asFinite(option.value, 0),
                              )})`}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {question.type === "number" && (
                    <Input
                      id={`sample-${question.id}`}
                      type="number"
                      step="any"
                      inputMode="decimal"
                      placeholder="Not answered"
                      value={numberAnswers[question.id] ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value;
                        const parsed = Number(raw);
                        setNumberAnswers((previous) => ({
                          ...previous,
                          [question.id]:
                            raw.trim() === "" || !Number.isFinite(parsed)
                              ? null
                              : parsed,
                        }));
                      }}
                    />
                  )}
                </div>
              );
            })}

            {distances.map((distance) => (
              <div key={distance.id} className="space-y-1.5">
                <Label htmlFor={`sample-distance-${distance.id}`}>
                  {distance.variableName.trim() || "unnamed"} (miles)
                </Label>
                <Input
                  id={`sample-distance-${distance.id}`}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="Sample value"
                  value={distanceAnswers[distance.id] ?? ""}
                  onChange={(event) => {
                    const raw = event.target.value;
                    const parsed = Number(raw);
                    setDistanceAnswers((previous) => ({
                      ...previous,
                      [distance.id]:
                        raw.trim() === "" || !Number.isFinite(parsed)
                          ? null
                          : parsed,
                    }));
                  }}
                />
                <p className="text-muted-foreground text-xs">
                  Sample value — real submissions compute this from the two ZIP
                  answers on the server.
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 rounded-lg border p-4">
          {evaluated === null ? (
            <p className="text-muted-foreground text-sm">
              Add a pricing formula to see an estimate.
            </p>
          ) : evaluated.ok ? (
            <>
              <div>
                <p className="text-muted-foreground text-xs">
                  Estimate stored on the lead
                </p>
                {estimateCents !== null ? (
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatPrice(estimateCents)}
                  </p>
                ) : (
                  <p className="text-destructive text-sm">
                    {`No estimate would be stored — ${
                      finalized?.failure?.message ??
                      "this combination of answers has no valid price."
                    } The lead is still captured for you to price by hand.`}
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  Formula result: {formatFormulaValue(evaluated.value)}
                </p>
              </div>

              <div className="border-t pt-3">
                <p className="text-muted-foreground text-xs">
                  What the visitor sees
                </p>
                {showEstimateToCustomer && !showEstimateOnScreen ? (
                  // Email-only estimate: the thank-you screen stays generic,
                  // and the figure (if any) appears only in the confirmation
                  // email — same split `customerEstimateFrom` computes for
                  // the real `submit` mutation.
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-muted-foreground">On screen: </span>
                      {thankYouMessage.trim() ||
                        "Thanks! We received your request."}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">By email: </span>
                      {!customerEstimate
                        ? "no estimate — priced by hand"
                        : "exactCents" in customerEstimate
                          ? formatPrice(customerEstimate.exactCents)
                          : `${formatPrice(customerEstimate.lowCents)} – ${formatPrice(
                              customerEstimate.highCents,
                            )}`}
                    </p>
                  </div>
                ) : !customerEstimate ? (
                  <p className="text-sm">
                    {thankYouMessage.trim() ||
                      "Thanks! We received your request."}
                  </p>
                ) : "exactCents" in customerEstimate ? (
                  <p className="text-lg font-medium tabular-nums">
                    {formatPrice(customerEstimate.exactCents)}
                  </p>
                ) : (
                  <p className="text-lg font-medium tabular-nums">
                    {`${formatPrice(customerEstimate.lowCents)} – ${formatPrice(
                      customerEstimate.highCents,
                    )}`}
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-destructive text-sm">
              {evaluated.error.message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
