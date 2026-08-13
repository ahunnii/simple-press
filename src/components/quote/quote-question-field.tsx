"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, TriangleAlert } from "lucide-react";

import type { QuoteAnswer } from "./quote-answers";
import type { PublicQuoteQuestion } from "~/lib/validators/quote-calculator";
import { getQuoteIcon } from "~/lib/quote/quote-icons";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";

/**
 * Every control in this file is styled from design TOKENS only
 * (`border-input`, `bg-background`, `text-foreground`, `bg-primary`, …).
 *
 * The quote widget renders inside whichever storefront template the owner is
 * running, and each template redefines those CSS variables under its own scope
 * class (`.noise`, `.pollen`, …). A hardcoded colour — or a shadcn control
 * that portals its popup OUTSIDE the template's scope element, which is why
 * `dropdown` uses a native `<select>` rather than `~/components/ui/select` —
 * would render correctly in exactly one template and wrong in the other
 * fourteen.
 */

/** Shared card styling for the choice / multiselect option tiles. */
const optionCardBase =
  "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors outline-none focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:ring-[3px]";
const optionCardIdle =
  "border-input bg-background text-foreground hover:bg-muted/60";
const optionCardSelected = "border-primary bg-primary/5 text-foreground";

type FieldProps = {
  question: PublicQuoteQuestion;
  answer: QuoteAnswer | undefined;
  onChange: (answer: QuoteAnswer) => void;
  /**
   * Called when the visitor picks a single-choice card by clicking / pressing
   * Enter or Space. Deliberately NOT called for arrow-key movement inside the
   * radiogroup: arrow keys select as they move (the ARIA radio pattern), and
   * auto-advancing on each one would skip the visitor past options they were
   * only browsing.
   */
  onCommit?: () => void;
  /** `aria-labelledby` target — the step heading that carries the question. */
  labelledBy: string;
  /** `aria-describedby` targets (description + inline error), space-joined. */
  describedBy?: string;
  invalid: boolean;
  fieldId: string;
};

export function QuoteQuestionField(props: FieldProps) {
  switch (props.question.type) {
    case "choice":
      return <ChoiceCards {...props} />;
    case "multiselect":
      return <MultiselectCards {...props} />;
    case "dropdown":
      return <DropdownField {...props} />;
    case "number":
      return <NumberField {...props} />;
    case "zip":
      return <ZipField {...props} />;
    case "longtext":
      return <LongTextField {...props} />;
    case "date":
      return <DateField {...props} />;
    case "text":
    default:
      return <TextField {...props} />;
  }
}

/** Icon for an option, or `null` when the owner picked none / an unknown one. */
function OptionIcon({ icon }: { icon: string | null }) {
  if (!icon) return null;
  const Icon = getQuoteIcon(icon);
  if (!Icon) return null;
  return <Icon className="size-5 shrink-0" aria-hidden="true" />;
}

function ChoiceCards({
  question,
  answer,
  onChange,
  onCommit,
  labelledBy,
  describedBy,
  invalid,
}: FieldProps) {
  const options = question.options ?? [];
  const selected = answer?.kind === "single" ? answer.optionId : "";
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (optionId: string, commit: boolean) => {
    onChange({ kind: "single", optionId });
    if (commit) onCommit?.();
  };

  // Roving tabindex + arrow keys: `role="radiogroup"` promises this behaviour,
  // and a group of individually-tabbable buttons claiming to be radios is
  // worse for a screen-reader user than no role at all.
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (index + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = options.length - 1;
    }
    if (next === null) return;

    event.preventDefault();
    event.stopPropagation();
    const target = options[next];
    if (!target) return;
    select(target.id, false);
    buttonsRef.current[next]?.focus();
  };

  const focusIndex = options.findIndex((option) => option.id === selected);

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      aria-required={question.required}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {options.map((option, index) => {
        const isSelected = option.id === selected;
        return (
          <button
            key={option.id}
            ref={(node) => {
              buttonsRef.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected || (focusIndex === -1 && index === 0) ? 0 : -1}
            onClick={() => select(option.id, true)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              optionCardBase,
              isSelected ? optionCardSelected : optionCardIdle,
            )}
          >
            <OptionIcon icon={option.icon} />
            <span className="text-sm font-medium">{option.label}</span>
            <span
              aria-hidden="true"
              className={cn(
                "ml-auto flex size-4 shrink-0 items-center justify-center rounded-full border",
                isSelected ? "border-primary bg-primary" : "border-input",
              )}
            >
              {isSelected && (
                <span className="bg-primary-foreground size-1.5 rounded-full" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MultiselectCards({
  question,
  answer,
  onChange,
  labelledBy,
  describedBy,
  invalid,
}: FieldProps) {
  const options = question.options ?? [];
  const selected = answer?.kind === "multi" ? answer.optionIds : [];

  const toggle = (optionId: string) => {
    const next = selected.includes(optionId)
      ? selected.filter((id) => id !== optionId)
      : [...selected, optionId];
    onChange({ kind: "multi", optionIds: next });
  };

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {options.map((option) => {
        const isSelected = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            aria-invalid={invalid}
            onClick={() => toggle(option.id)}
            className={cn(
              optionCardBase,
              isSelected ? optionCardSelected : optionCardIdle,
            )}
          >
            <OptionIcon icon={option.icon} />
            <span className="text-sm font-medium">{option.label}</span>
            <span
              aria-hidden="true"
              className={cn(
                "ml-auto flex size-4 shrink-0 items-center justify-center rounded-sm border",
                isSelected ? "border-primary bg-primary" : "border-input",
              )}
            >
              {isSelected && (
                <Check className="text-primary-foreground size-3" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DropdownField({
  question,
  answer,
  onChange,
  describedBy,
  invalid,
  fieldId,
}: FieldProps) {
  const options = question.options ?? [];
  const selected = answer?.kind === "single" ? answer.optionId : "";

  return (
    <select
      id={fieldId}
      value={selected}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      required={question.required}
      onChange={(event) =>
        onChange({ kind: "single", optionId: event.target.value })
      }
      className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-10 w-full max-w-md rounded-md border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
    >
      <option value="">Select an option…</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function NumberField({
  question,
  answer,
  onChange,
  describedBy,
  invalid,
  fieldId,
}: FieldProps) {
  const raw = answer?.kind === "value" ? answer.raw : "";

  return (
    <div className="flex max-w-xs items-center gap-2">
      <Input
        id={fieldId}
        type="number"
        inputMode="decimal"
        value={raw}
        min={question.min ?? undefined}
        max={question.max ?? undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        required={question.required}
        onChange={(event) =>
          onChange({ kind: "value", raw: event.target.value })
        }
      />
      {question.unitLabel && (
        <span className="text-muted-foreground shrink-0 text-sm">
          {question.unitLabel}
        </span>
      )}
    </div>
  );
}

/** Debounce before the ZIP lookup fires — the router rate-limits it 30/min. */
const ZIP_LOOKUP_DEBOUNCE_MS = 400;

function ZipField({
  question,
  answer,
  onChange,
  describedBy,
  invalid,
  fieldId,
}: FieldProps) {
  const raw = answer?.kind === "value" ? answer.raw : "";
  const [debouncedZip, setDebouncedZip] = useState("");

  // Hand-rolled debounce (setTimeout + cleanup) rather than a dependency: the
  // lookup is keystroke-adjacent, so firing on the 5th digit of every edit
  // would burn the 30/min budget in a few corrections.
  useEffect(() => {
    if (!/^\d{5}$/.test(raw)) {
      setDebouncedZip("");
      return;
    }
    const timer = setTimeout(
      () => setDebouncedZip(raw),
      ZIP_LOOKUP_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [raw]);

  const { data, isFetching, isError } = api.quoteCalculator.lookupZip.useQuery(
    debouncedZip,
    {
      enabled: debouncedZip.length === 5,
      retry: false,
      // The ZIP table never changes mid-session; re-asking on every remount
      // only spends rate-limit budget.
      staleTime: 5 * 60 * 1000,
    },
  );

  const showResult = debouncedZip.length === 5 && debouncedZip === raw;

  return (
    <div className="max-w-xs space-y-2">
      <Input
        id={fieldId}
        type="text"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={5}
        placeholder="12345"
        value={raw}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        required={question.required}
        onChange={(event) =>
          onChange({
            kind: "value",
            raw: event.target.value.replace(/\D/g, "").slice(0, 5),
          })
        }
      />
      {/*
        Advisory only, and never blocking: the server re-checks the ZIP against
        its own table on submit, and a valid-but-unlisted ZIP is a normal thing
        for a visitor to type. A lookup failure (offline, rate-limited) shows
        nothing at all rather than an error the visitor cannot act on.
      */}
      <div aria-live="polite" className="min-h-5 text-sm">
        {showResult && isFetching && (
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <LoaderCircle
              className="size-3.5 animate-spin"
              aria-hidden="true"
            />
            Checking…
          </span>
        )}
        {showResult && !isFetching && !isError && data && (
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <Check className="text-primary size-3.5" aria-hidden="true" />
            {data.city}, {data.state}
          </span>
        )}
        {showResult && !isFetching && !isError && data === null && (
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <TriangleAlert className="size-3.5" aria-hidden="true" />
            We don&apos;t recognize that ZIP code
          </span>
        )}
      </div>
    </div>
  );
}

function TextField({
  question,
  answer,
  onChange,
  describedBy,
  invalid,
  fieldId,
}: FieldProps) {
  const raw = answer?.kind === "value" ? answer.raw : "";
  return (
    <Input
      id={fieldId}
      type="text"
      value={raw}
      maxLength={2000}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      required={question.required}
      onChange={(event) => onChange({ kind: "value", raw: event.target.value })}
      className="max-w-md"
    />
  );
}

function LongTextField({
  question,
  answer,
  onChange,
  describedBy,
  invalid,
  fieldId,
}: FieldProps) {
  const raw = answer?.kind === "value" ? answer.raw : "";
  return (
    <Textarea
      id={fieldId}
      rows={5}
      value={raw}
      maxLength={2000}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      required={question.required}
      onChange={(event) => onChange({ kind: "value", raw: event.target.value })}
    />
  );
}

function DateField({
  question,
  answer,
  onChange,
  describedBy,
  invalid,
  fieldId,
}: FieldProps) {
  const raw = answer?.kind === "value" ? answer.raw : "";
  return (
    <Input
      id={fieldId}
      type="date"
      value={raw}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      required={question.required}
      onChange={(event) => onChange({ kind: "value", raw: event.target.value })}
      className="max-w-xs"
    />
  );
}
