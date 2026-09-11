"use client";

import type { ReactNode } from "react";

import type { TypeChangeImpact } from "./builder-shared";
import type { QuoteQuestionType } from "~/lib/validators/quote-calculator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

import { QUESTION_TYPE_META } from "./builder-shared";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromType: QuoteQuestionType;
  toType: QuoteQuestionType;
  impact: TypeChangeImpact;
  onConfirm: () => void;
};

/**
 * Confirms a question's type change once `describeTypeChangeImpact` (see
 * `builder-shared.ts`) has found something at stake.
 *
 * Every line below reports a consequence `applyTypeChange` actually performs
 * — the impact object is the single source of truth for both, so this
 * component only formats it and never re-derives anything about the question
 * itself. Cancelling leaves the question's type untouched: the caller's
 * `Select` value is driven off `question.type`, not local state, so there is
 * nothing here to roll back.
 */
export function ChangeTypeDialog({
  open,
  onOpenChange,
  fromType,
  toType,
  impact,
  onConfirm,
}: Props) {
  const fromLabel = QUESTION_TYPE_META[fromType].label;
  const toLabel = QUESTION_TYPE_META[toType].label;
  const messages = buildImpactMessages(impact);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change to {toLabel}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p className="text-foreground font-medium">
                {fromLabel} → {toLabel}
              </p>
              {messages.length === 0 ? (
                <p>
                  Title, help text, required, tab and condition settings carry
                  over.
                </p>
              ) : (
                <ul className="list-disc space-y-1 pl-5">
                  {messages.map((message) => (
                    <li key={message.key}>{message.node}</li>
                  ))}
                </ul>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Change type</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * One list item per non-empty field of `impact`, in the order a reader would
 * want to weigh them: what's discarded outright, what stops existing, who
 * depends on it, what pricing math breaks. `optionsDiscarded` has no count to
 * report — `TypeChangeImpact` only carries the boolean — so that line names
 * the consequence without a number rather than fabricating one.
 */
function buildImpactMessages(
  impact: TypeChangeImpact,
): { key: string; node: ReactNode }[] {
  const messages: { key: string; node: ReactNode }[] = [];

  if (impact.optionsDiscarded) {
    messages.push({
      key: "options",
      node: "Its options will be removed.",
    });
  }

  if (impact.variableDropped) {
    messages.push({
      key: "variable",
      node: (
        <>
          Its variable{" "}
          <code className="font-mono">{impact.variableDropped}</code> will no
          longer exist.
        </>
      ),
    });
  }

  if (impact.dependentShowIfs.length > 0) {
    const titles = impact.dependentShowIfs
      .map((dependent) => dependent.title.trim() || "Untitled question")
      .join(", ");
    messages.push({
      key: "show-ifs",
      node: `${impact.dependentShowIfs.length} question(s) are only shown based on this answer; that condition will be removed: ${titles}.`,
    });
  }

  for (const distance of impact.distancesRemoved) {
    messages.push({
      key: `distance-${distance.id}`,
      node: (
        <>
          The distance{" "}
          <code className="font-mono">{distance.variableName}</code> uses this
          question and will be removed.
        </>
      ),
    });
  }

  if (impact.formulaReferencesVariable && impact.variableDropped) {
    messages.push({
      key: "formula",
      node: (
        <>
          The pricing formula still references{" "}
          <code className="font-mono">{impact.variableDropped}</code> —
          you&apos;ll need to edit it before saving.
        </>
      ),
    });
  }

  return messages;
}
