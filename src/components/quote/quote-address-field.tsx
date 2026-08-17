"use client";

import { Check, LoaderCircle, TriangleAlert } from "lucide-react";

import type { QuoteAnswer } from "./quote-answers";
import type { QuoteFieldProps } from "./quote-question-field";
import { US_STATES } from "~/lib/geo/regions";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import { useQuoteDensity } from "./quote-display-context";
import { useZipLookup } from "./use-zip-lookup";

type AddressAnswer = Extract<QuoteAnswer, { kind: "address" }>;

const BLANK_ADDRESS: AddressAnswer = {
  kind: "address",
  line1: "",
  line2: "",
  city: "",
  state: "",
  zip: "",
};

/**
 * Styling for a NATIVE `<select>` inside the quote widget.
 *
 * Shared with `DropdownField` in `quote-question-field.tsx`. It lives here
 * rather than there so the import between the two files stays one-directional:
 * `quote-question-field` already imports this module for `QuoteAddressField`,
 * and pointing a value import back the other way would create a runtime cycle
 * for a string constant.
 *
 * Native, not `~/components/ui/select`, for the reason spelled out atop
 * `quote-question-field.tsx`: a portalled popup escapes the storefront
 * template's CSS scope class and renders with the wrong palette in fourteen of
 * the fifteen templates.
 */
export const nativeSelectClass =
  "border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-10 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]";

/**
 * The advisory "Saginaw, MI" line under a ZIP input.
 *
 * Rendered by both the standalone `zip` question and the ZIP box in an
 * address, from the same `useZipLookup` state. Advisory only, and never
 * blocking: the server re-checks the ZIP against its own table on submit, and
 * a valid-but-unlisted ZIP is a normal thing for a visitor to type. A lookup
 * failure (offline, rate-limited) shows nothing at all rather than an error
 * the visitor cannot act on.
 */
export function ZipLookupHint({
  showResult,
  isFetching,
  isError,
  data,
}: ReturnType<typeof useZipLookup>) {
  return (
    <div aria-live="polite" className="min-h-5 text-sm">
      {showResult && isFetching && (
        <span className="text-muted-foreground inline-flex items-center gap-1.5">
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
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
  );
}

/**
 * The `address` question type: five controls that behave as one answer.
 *
 * A `role="group"` labelled by the question heading rather than five loose
 * inputs — the subfield labels ("City", "State") only make sense underneath
 * "Where are we moving you to?", and a screen-reader user tabbing in from
 * elsewhere needs the question, not just "City".
 *
 * Every `autoComplete` token is the standard one, so browser address autofill
 * populates the whole group in one gesture. That is the single biggest
 * completion win available on this question type and it costs five attributes.
 */
export function QuoteAddressField({
  question,
  answer,
  onChange,
  labelledBy,
  describedBy,
  invalid,
  fieldId,
}: QuoteFieldProps) {
  const density = useQuoteDensity();
  const value: AddressAnswer =
    answer?.kind === "address" ? answer : BLANK_ADDRESS;

  const update = (patch: Partial<Omit<AddressAnswer, "kind">>) => {
    onChange({ ...value, ...patch });
  };

  const zipLookup = useZipLookup(value.zip);

  const line1Id = fieldId;
  const line2Id = `${fieldId}-line2`;
  const cityId = `${fieldId}-city`;
  const stateId = `${fieldId}-state`;
  const zipId = `${fieldId}-zip`;

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      // `aria-invalid` is not a supported property of `role="group"`; each
      // control inside carries its own, which is what a screen reader reads
      // when focus lands on the offending box anyway.
      className={cn("grid max-w-2xl", density.fieldGap)}
    >
      <AddressSubfield id={line1Id} label="Street address">
        <Input
          id={line1Id}
          type="text"
          autoComplete="address-line1"
          maxLength={120}
          value={value.line1}
          aria-invalid={invalid}
          required={question.required}
          onChange={(event) => update({ line1: event.target.value })}
        />
      </AddressSubfield>

      {/* Always optional, whatever the question's `required` flag says: an
          address with no apartment number is a complete address, and both
          `validateAnswer` and `quoteWireAddressSchema` treat it that way. */}
      <AddressSubfield id={line2Id} label="Address line 2" optional>
        <Input
          id={line2Id}
          type="text"
          autoComplete="address-line2"
          maxLength={120}
          placeholder="Apt, suite, unit (optional)"
          value={value.line2}
          onChange={(event) => update({ line2: event.target.value })}
        />
      </AddressSubfield>

      <div
        className={cn("grid sm:grid-cols-[1fr_8rem_7rem]", density.fieldGap)}
      >
        <AddressSubfield id={cityId} label="City">
          <Input
            id={cityId}
            type="text"
            autoComplete="address-level2"
            maxLength={80}
            value={value.city}
            aria-invalid={invalid}
            required={question.required}
            onChange={(event) => update({ city: event.target.value })}
          />
        </AddressSubfield>

        <AddressSubfield id={stateId} label="State">
          <select
            id={stateId}
            autoComplete="address-level1"
            value={value.state}
            aria-invalid={invalid}
            required={question.required}
            onChange={(event) => update({ state: event.target.value })}
            className={nativeSelectClass}
          >
            <option value="">State…</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.code}
              </option>
            ))}
          </select>
        </AddressSubfield>

        <AddressSubfield id={zipId} label="ZIP code">
          <Input
            id={zipId}
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            placeholder="12345"
            value={value.zip}
            aria-invalid={invalid}
            required={question.required}
            onChange={(event) =>
              update({ zip: event.target.value.replace(/\D/g, "").slice(0, 5) })
            }
          />
        </AddressSubfield>
      </div>

      <ZipLookupHint {...zipLookup} />
    </div>
  );
}

function AddressSubfield({
  id,
  label,
  optional,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground text-xs font-medium">
        {label}
        {optional && (
          <span className="text-muted-foreground text-xs font-normal">
            (optional)
          </span>
        )}
      </Label>
      {children}
    </div>
  );
}
