"use client";

import { useRef } from "react";
import { Check } from "lucide-react";

import type { QuoteAnswer } from "./quote-answers";
import type { PublicQuoteQuestion } from "~/lib/validators/quote-calculator";
import { addCalendarDays, localCalendarDate } from "~/lib/calendar-date";
import { getQuoteIcon } from "~/lib/quote/quote-icons";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";

import {
  nativeSelectClass,
  QuoteAddressField,
  ZipLookupHint,
} from "./quote-address-field";
import { useQuoteDensity } from "./quote-display-context";
import { useZipLookup } from "./use-zip-lookup";

/**
 * Every control in this file is styled from design TOKENS only
 * (`border-input`, `bg-background`, `text-foreground`, `bg-primary`, …).
 *
 * The quote widget renders inside whichever storefront template the owner is
 * running, and each template redefines those CSS variables under its own scope
 * class (`.noise`, `.pollen`, …). A hardcoded colour — or a shadcn control
 * that portals its popup OUTSIDE the template's scope element, which is why
 * `dropdown` (and the `address` state picker) uses a native `<select>` rather
 * than `~/components/ui/select` — would render correctly in exactly one
 * template and wrong in the other fourteen.
 *
 * Spacing is the one thing that is NOT hardcoded: the owner picks a density
 * per embed, and it arrives through `useQuoteDensity()` rather than a prop so
 * a new field type cannot forget to forward it.
 */

/**
 * Shared card styling for the choice / multiselect option tiles. Padding comes
 * from the density preset, so it is deliberately absent here.
 */
const optionCardBase =
  "flex w-full items-center gap-3 rounded-lg border text-left transition-colors outline-none focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:ring-[3px]";
const optionCardIdle =
  "border-input bg-background text-foreground hover:bg-muted/60";
const optionCardSelected = "border-primary bg-primary/5 text-foreground";

export type QuoteFieldProps = {
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
  /**
   * `aria-labelledby` target — the step heading on a single-question screen,
   * or the question's own `<Label>` on a screen that groups several.
   */
  labelledBy: string;
  /** `aria-describedby` targets (description + inline error), space-joined. */
  describedBy?: string;
  invalid: boolean;
  fieldId: string;
};

export function QuoteQuestionField(props: QuoteFieldProps) {
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
    case "address":
      return <QuoteAddressField {...props} />;
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
}: QuoteFieldProps) {
  const density = useQuoteDensity();
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
      className={cn("grid grid-cols-1 sm:grid-cols-2", density.optionGap)}
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
              density.optionCard,
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
}: QuoteFieldProps) {
  const density = useQuoteDensity();
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
      className={cn("grid grid-cols-1 sm:grid-cols-2", density.optionGap)}
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
              density.optionCard,
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
  labelledBy,
  describedBy,
  invalid,
  fieldId,
}: QuoteFieldProps) {
  const options = question.options ?? [];
  const selected = answer?.kind === "single" ? answer.optionId : "";

  return (
    <select
      id={fieldId}
      value={selected}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      required={question.required}
      onChange={(event) =>
        onChange({ kind: "single", optionId: event.target.value })
      }
      className={cn(nativeSelectClass, "max-w-md")}
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
  labelledBy,
  describedBy,
  invalid,
  fieldId,
}: QuoteFieldProps) {
  const raw = answer?.kind === "value" ? answer.raw : "";

  return (
    <div className="flex max-w-xs items-center gap-2">
      <Input
        id={fieldId}
        type="number"
        inputMode="decimal"
        // Otherwise the browser's native step defaults to `1`, and the
        // constraint-validation API flags a perfectly valid decimal answer
        // (2.5 hours, 1.75 miles) as `:invalid` — which is what feeds the
        // capture-phase `invalid` watchdog documented in CLAUDE.md and can
        // silently cancel a submit before React ever sees it.
        step="any"
        value={raw}
        min={question.min ?? undefined}
        max={question.max ?? undefined}
        aria-labelledby={labelledBy}
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

function ZipField({
  question,
  answer,
  onChange,
  labelledBy,
  describedBy,
  invalid,
  fieldId,
}: QuoteFieldProps) {
  const raw = answer?.kind === "value" ? answer.raw : "";
  const zipLookup = useZipLookup(raw);

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
        aria-labelledby={labelledBy}
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
      <ZipLookupHint {...zipLookup} />
    </div>
  );
}

function TextField({
  question,
  answer,
  onChange,
  labelledBy,
  describedBy,
  invalid,
  fieldId,
}: QuoteFieldProps) {
  const raw = answer?.kind === "value" ? answer.raw : "";
  return (
    <Input
      id={fieldId}
      type="text"
      value={raw}
      maxLength={2000}
      aria-labelledby={labelledBy}
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
  labelledBy,
  describedBy,
  invalid,
  fieldId,
}: QuoteFieldProps) {
  const raw = answer?.kind === "value" ? answer.raw : "";
  return (
    <Textarea
      id={fieldId}
      rows={5}
      value={raw}
      maxLength={2000}
      aria-labelledby={labelledBy}
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
  labelledBy,
  describedBy,
  invalid,
  fieldId,
}: QuoteFieldProps) {
  const raw = answer?.kind === "value" ? answer.raw : "";
  // Computed fresh per render rather than hoisted to module scope: it has to
  // reflect the VISITOR's local day (the date input's native picker is a
  // browser affordance, not a server round trip), and a component that stays
  // mounted across midnight must not keep offering yesterday.
  const today = localCalendarDate();
  const min = question.minDate === "today" ? today : undefined;
  const max =
    question.maxDaysAhead != null
      ? addCalendarDays(today, question.maxDaysAhead)
      : undefined;
  return (
    <Input
      id={fieldId}
      type="date"
      value={raw}
      min={min}
      max={max}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      required={question.required}
      onChange={(event) => onChange({ kind: "value", raw: event.target.value })}
      className="max-w-xs"
    />
  );
}
