"use client";

import { useEffect, useRef, useState } from "react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { ScreeningAnswer, ScreeningState } from "~/lib/forms/screening";
import type { FormScreening } from "~/lib/validators/form";
import {
  answerScreening,
  backScreening,
  failContent,
  initialScreeningState,
  retryScreening,
  screeningStorageKey,
} from "~/lib/forms/screening";
import { cn } from "~/lib/utils";
import { FORM_DEFAULT_SCREENING_FAIL_MESSAGE } from "~/lib/validators/form";
import { Button } from "~/components/ui/button";
import { TiptapRenderer } from "~/components/tiptap-renderer";

export type FormScreeningGateProps = {
  formId: string;
  screening: FormScreening;
  /**
   * "live": remembers a pass for the browser session. "preview": no storage,
   * plus "Skip to form" / "Restart screening" so the owner can re-test.
   */
  mode?: "live" | "preview";
  /** The actual form; rendered only once the screening is passed. */
  children: React.ReactNode;
};

function readPassed(formId: string): boolean {
  try {
    return window.sessionStorage.getItem(screeningStorageKey(formId)) === "1";
  } catch {
    return false;
  }
}

function writePassed(formId: string) {
  try {
    window.sessionStorage.setItem(screeningStorageKey(formId), "1");
  } catch {
    // Storage blocked: the visitor just re-answers on a reload.
  }
}

/**
 * Yes/no questions in front of a form (see `~/lib/forms/screening` for the
 * state machine). Questions are asked one at a time; the first answer that
 * isn't a question's `passAnswer` shows that question's fail panel. Once every
 * question passes, the unlock note (rich text, if any) shows above the form
 * (`children`).
 */
export function FormScreeningGate({
  formId,
  screening,
  mode = "live",
  children,
}: FormScreeningGateProps) {
  const isLive = mode === "live";
  const [rawState, setState] = useState<ScreeningState>(() =>
    initialScreeningState(screening),
  );
  // The builder preview edits `screening` live; a deleted question restarts.
  const state =
    rawState.kind !== "passed" && rawState.index >= screening.questions.length
      ? initialScreeningState(screening)
      : rawState;

  // Move focus to the new step only after a visitor action, never on mount.
  const interacted = useRef(false);
  const stepRef = useRef<HTMLElement | null>(null);

  const go = (next: ScreeningState) => {
    interacted.current = true;
    if (isLive && next.kind === "passed") writePassed(formId);
    setState(next);
  };

  // Storage is read after mount so server and first client render agree.
  useEffect(() => {
    if (isLive && readPassed(formId)) setState({ kind: "passed" });
  }, [isLive, formId]);

  const stepKey =
    state.kind === "passed" ? "passed" : `${state.kind}:${state.index}`;
  useEffect(() => {
    if (interacted.current) stepRef.current?.focus();
  }, [stepKey]);

  const answer = (value: ScreeningAnswer) =>
    go(answerScreening(screening, state, value));

  const question =
    state.kind === "passed" ? undefined : screening.questions[state.index];

  let step: React.ReactNode = null;

  if (state.kind === "question" && question) {
    step = (
      <div className="sp-form-screening__question space-y-4">
        {screening.intro && (
          <p className="text-muted-foreground text-sm whitespace-pre-line">
            {screening.intro}
          </p>
        )}
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Question {state.index + 1} of {screening.questions.length}
        </p>
        <fieldset className="space-y-4">
          <legend
            ref={(el) => {
              stepRef.current = el;
            }}
            tabIndex={-1}
            className="text-base leading-snug font-medium outline-none focus-visible:underline"
          >
            {question.prompt}
          </legend>
          <div className="grid max-w-md grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 w-full text-base"
              onClick={() => answer("yes")}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 w-full text-base"
              onClick={() => answer("no")}
            >
              No
            </Button>
          </div>
        </fieldset>
        {state.index > 0 && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={() => go(backScreening(state))}
          >
            Back
          </Button>
        )}
      </div>
    );
  } else if (state.kind === "failed") {
    // `null` (owner emptied the default message): fall back to the built-in text.
    const failDoc = failContent(screening, state.index) as TiptapJSON | null;
    step = (
      <div className="sp-form-screening__fail space-y-4">
        <div
          ref={(el) => {
            stepRef.current = el;
          }}
          tabIndex={-1}
          className="border-input bg-muted/30 focus-visible:ring-ring/50 space-y-4 rounded-lg border p-5 text-sm outline-none focus-visible:ring-[3px]"
        >
          {failDoc ? (
            <TiptapRenderer
              content={failDoc}
              className={cn(
                "sp-form-screening__note [&>*+*]:mt-3",
                !isLive && "prose prose-sm max-w-none",
              )}
            />
          ) : (
            <p>{FORM_DEFAULT_SCREENING_FAIL_MESSAGE}</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => go(retryScreening(state))}
        >
          Change my answer
        </Button>
      </div>
    );
  }

  if (state.kind === "passed") {
    // The schema normalizes an empty editor to null, so a null check is enough.
    const unlockContent = screening.unlockContent as TiptapJSON | null;
    const hasUnlock = unlockContent != null;
    return (
      <div className="sp-form-screening space-y-5">
        <div aria-live="polite" className="space-y-3">
          <div
            ref={(el) => {
              stepRef.current = el;
            }}
            tabIndex={-1}
            className={
              hasUnlock
                ? "sp-form-screening__unlock border-input bg-muted/30 focus-visible:ring-ring/50 space-y-4 rounded-lg border p-5 text-sm outline-none focus-visible:ring-[3px]"
                : "sr-only outline-none"
            }
          >
            {unlockContent ? (
              // On the storefront the form block sits inside the template's
              // prose container, which styles the note. The admin preview has
              // no such ancestor, so give it the generic typography.
              <TiptapRenderer
                content={unlockContent}
                // The renderer wraps each block in its own div, so template
                // prose rhythm (`> * + *` rules) never reaches these; space
                // the blocks here.
                className={cn(
                  "sp-form-screening__note [&>*+*]:mt-3",
                  !isLive && "prose prose-sm max-w-none",
                )}
              />
            ) : (
              <span>Screening complete. The form follows.</span>
            )}
          </div>
          {!isLive && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-0"
              onClick={() => go(initialScreeningState(screening))}
            >
              Restart screening
            </Button>
          )}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="sp-form-screening space-y-4">
      <div aria-live="polite">{step}</div>
      {!isLive && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0"
          onClick={() => go({ kind: "passed" })}
        >
          Skip to form
        </Button>
      )}
    </div>
  );
}
