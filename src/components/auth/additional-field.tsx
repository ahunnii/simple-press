"use client";

import type { AdditionalField as AdditionalFieldConfig } from "@better-auth-ui/core";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { resolveInputType } from "@better-auth-ui/core";
import { useAuth } from "@better-auth-ui/react";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronDownIcon, Copy } from "lucide-react";
import { toast } from "sonner";

import { cn } from "~/lib/utils";
import { buttonVariants } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Slider } from "~/components/ui/slider";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

// SIMPLEPRESS LOCAL ADDITION — `useEffect` is used by `CheckboxField` below.

export type AdditionalFieldProps = {
  name: string;
  field: AdditionalFieldConfig;
  isPending?: boolean;
  /** Complete suffix appended to labels for fields that are not required. */
  optionalLabel?: string;
};

/** Convert a `defaultValue` into a `Date` for the calendar. */
function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

/** Format a Date as `HH:mm:ss` for an `<input type="time">`. */
function formatTime(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Icon-only copy button used as an `InputGroupAddon`. `getValue` is invoked
 * lazily on click so the button copies the input's *live* value rather than a
 * stale snapshot — important when paired with editable inputs.
 */
function CopyButton({
  getValue,
  isDisabled,
}: {
  getValue: () => string | undefined;
  isDisabled?: boolean;
}) {
  const { localization } = useAuth();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const value = getValue();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <InputGroupButton
      aria-label={localization.settings.copyToClipboard}
      title={localization.settings.copyToClipboard}
      onClick={handleCopy}
      disabled={isDisabled}
    >
      {copied ? <Check /> : <Copy />}
    </InputGroupButton>
  );
}

/** Renders a single additional user field via shadcn primitives. */
export function AdditionalField({
  name,
  field: configuredField,
  isPending,
  optionalLabel,
}: AdditionalFieldProps) {
  const field =
    optionalLabel && !configuredField.required
      ? {
          ...configuredField,
          label: (
            <>
              {configuredField.label}
              {optionalLabel}
            </>
          ),
        }
      : configuredField;
  const inputType = resolveInputType(field);

  if (field.render) {
    const FieldRenderer = field.render as ComponentType<AdditionalFieldProps>;
    return (
      <FieldRenderer
        name={name}
        field={field}
        isPending={isPending}
        optionalLabel={optionalLabel}
      />
    );
  }

  if (inputType === "hidden") {
    return (
      <input
        type="hidden"
        name={name}
        value={
          field.defaultValue == null
            ? ""
            : field.defaultValue instanceof Date
              ? field.defaultValue.toISOString()
              : String(field.defaultValue)
        }
      />
    );
  }

  if (inputType === "textarea") {
    return (
      <Field>
        <FieldLabel htmlFor={name}>{field.label}</FieldLabel>

        <Textarea
          id={name}
          name={name}
          defaultValue={
            field.defaultValue == null ? undefined : String(field.defaultValue)
          }
          placeholder={field.placeholder}
          required={field.required}
          readOnly={field.readOnly}
          disabled={isPending}
        />

        <FieldError />
      </Field>
    );
  }

  if (inputType === "number") {
    const maxFractionDigits = field.formatOptions?.maximumFractionDigits;

    return (
      <Field>
        <FieldLabel htmlFor={name}>{field.label}</FieldLabel>

        <Input
          id={name}
          name={name}
          type="number"
          inputMode={maxFractionDigits ? "decimal" : "numeric"}
          min={field.min}
          max={field.max}
          step={
            field.step ??
            (maxFractionDigits ? 1 / 10 ** maxFractionDigits : undefined)
          }
          defaultValue={
            field.defaultValue == null
              ? undefined
              : typeof field.defaultValue === "number"
                ? field.defaultValue
                : String(field.defaultValue)
          }
          placeholder={field.placeholder}
          required={field.required}
          readOnly={field.readOnly}
          disabled={isPending}
        />

        <FieldError />
      </Field>
    );
  }

  if (inputType === "slider") {
    return <SliderField name={name} field={field} isPending={isPending} />;
  }

  if (inputType === "switch") {
    return (
      <Field orientation="horizontal">
        <Switch
          id={name}
          name={name}
          defaultChecked={
            field.defaultValue === true || field.defaultValue === "true"
          }
          disabled={isPending || field.readOnly}
        />

        <FieldContent>
          <FieldLabel htmlFor={name}>{field.label}</FieldLabel>
        </FieldContent>
      </Field>
    );
  }

  if (inputType === "checkbox") {
    // SIMPLEPRESS LOCAL ADDITION — routed through `CheckboxField` so a failed
    // `required` constraint renders as styled inline text like every sibling
    // field, instead of the raw browser validation balloon. The sign-up terms
    // checkbox is the case that made this visible.
    // Re-apply after a registry re-fetch.
    return <CheckboxField name={name} field={field} isPending={isPending} />;
    // END SIMPLEPRESS LOCAL ADDITION
  }

  if (inputType === "select") {
    return (
      <Field>
        <FieldLabel htmlFor={name}>{field.label}</FieldLabel>

        <Select
          name={name}
          defaultValue={
            field.defaultValue != null ? String(field.defaultValue) : undefined
          }
          required={field.required}
          disabled={isPending || field.readOnly}
        >
          <SelectTrigger id={name} className="w-full">
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>

          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <FieldError />
      </Field>
    );
  }

  if (inputType === "combobox") {
    return (
      <Field>
        <FieldLabel htmlFor={name}>{field.label}</FieldLabel>

        <Combobox
          items={field.options ?? []}
          name={name}
          defaultValue={
            field.defaultValue != null ? String(field.defaultValue) : undefined
          }
          required={field.required}
          disabled={isPending || field.readOnly}
        >
          <ComboboxInput placeholder={field.placeholder} id={name} />

          <ComboboxContent>
            <ComboboxEmpty>No items found.</ComboboxEmpty>

            <ComboboxList>
              {(option) => (
                <ComboboxItem key={option.value} value={option}>
                  {option.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        <FieldError />
      </Field>
    );
  }

  if (inputType === "date" || inputType === "datetime") {
    return <DateInput name={name} field={field} isPending={isPending} />;
  }

  return <InputField name={name} field={field} isPending={isPending} />;
}

/**
 * SIMPLEPRESS LOCAL ADDITION — checkbox with a styled inline error.
 * Re-apply after re-fetching this file from the Better Auth UI registry.
 *
 * The stock checkbox branch had no `<FieldError />`, so a failed `required`
 * constraint — the sign-up terms checkbox being the case that matters — got
 * the raw browser validation balloon while every sibling field routed its
 * message through styled inline text.
 *
 * It cannot be fixed with an `onInvalid` prop the way Name / Email / Password
 * are in `sign-up.tsx`, or the way `DateInput` below is:
 *
 * - Radix owns the element that carries the constraint. `CheckboxPrimitive.Root`
 *   renders a `<button role="checkbox">` plus its own hidden
 *   `<input type="checkbox" required>` ("bubble input"), and forwards consumer
 *   props to the *button*. An `onInvalid` prop would land on an element that
 *   never fires the event.
 * - `invalid` does not bubble, so a parent `onInvalid` sees nothing either.
 *
 * It does still *capture*, though, which is what the listener below relies on:
 * a capture-phase listener on the wrapping `Field` reaches the bubble input on
 * the way down. `preventDefault()` suppresses the native balloon and the
 * message is rendered through `<FieldError>` instead.
 */
function CheckboxField({ name, field, isPending }: AdditionalFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const node = fieldRef.current;
    if (!node) return;

    const handleInvalid = (event: Event) => {
      event.preventDefault();

      if (event.target instanceof HTMLInputElement) {
        setError(event.target.validationMessage);
      }
    };

    node.addEventListener("invalid", handleInvalid, true);
    return () => node.removeEventListener("invalid", handleInvalid, true);
  }, []);

  return (
    <Field ref={fieldRef} orientation="horizontal" data-invalid={!!error}>
      <Checkbox
        id={name}
        name={name}
        defaultChecked={
          field.defaultValue === true || field.defaultValue === "true"
        }
        required={field.required}
        disabled={isPending || field.readOnly}
        onCheckedChange={() => setError(undefined)}
        aria-invalid={!!error}
      />

      <FieldContent>
        <FieldLabel htmlFor={name}>{field.label}</FieldLabel>

        <FieldError>{error}</FieldError>
      </FieldContent>
    </Field>
  );
}
// END SIMPLEPRESS LOCAL ADDITION

function InputField({ name, field, isPending }: AdditionalFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const hasPrefix = field.prefix != null;
  const hasSuffix = field.suffix != null || field.copyable;

  const isNumeric = field.type === "number";
  const maxFractionDigits = field.formatOptions?.maximumFractionDigits;
  const nativeInputType = isNumeric ? "number" : undefined;
  const nativeInputMode = isNumeric
    ? maxFractionDigits
      ? "decimal"
      : "numeric"
    : undefined;
  const nativeStep = maxFractionDigits
    ? 1 / 10 ** maxFractionDigits
    : undefined;

  if (hasPrefix || hasSuffix) {
    return (
      <Field>
        <FieldLabel htmlFor={name}>{field.label}</FieldLabel>

        <InputGroup>
          {hasPrefix && (
            <InputGroupAddon align="inline-start">
              {field.prefix}
            </InputGroupAddon>
          )}

          <InputGroupInput
            ref={inputRef}
            id={name}
            name={name}
            type={nativeInputType}
            inputMode={nativeInputMode}
            step={nativeStep}
            defaultValue={
              field.defaultValue == null
                ? undefined
                : String(field.defaultValue)
            }
            placeholder={field.placeholder}
            required={field.required}
            readOnly={field.readOnly}
            disabled={isPending}
          />

          {field.copyable ? (
            <InputGroupAddon align="inline-end">
              <CopyButton
                getValue={() => inputRef.current?.value}
                isDisabled={isPending}
              />
            </InputGroupAddon>
          ) : (
            field.suffix != null && (
              <InputGroupAddon align="inline-end">
                {field.suffix}
              </InputGroupAddon>
            )
          )}
        </InputGroup>

        <FieldError />
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel htmlFor={name}>{field.label}</FieldLabel>

      <Input
        id={name}
        name={name}
        type={nativeInputType}
        inputMode={nativeInputMode}
        step={nativeStep}
        defaultValue={
          field.defaultValue == null ? undefined : String(field.defaultValue)
        }
        placeholder={field.placeholder}
        required={field.required}
        readOnly={field.readOnly}
        disabled={isPending}
      />

      <FieldError />
    </Field>
  );
}

/**
 * Slider field. Radix Slider doesn't render the current value, so we render
 * it next to the label and control the state to keep the displayed value in
 * sync. The selected value is submitted via the underlying Radix `name` prop.
 */
function SliderField({ name, field, isPending }: AdditionalFieldProps) {
  const maxFractionDigits = field.formatOptions?.maximumFractionDigits;
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step =
    field.step ?? (maxFractionDigits ? 1 / 10 ** maxFractionDigits : 1);
  const initial =
    typeof field.defaultValue === "number"
      ? field.defaultValue
      : field.defaultValue != null && !Number.isNaN(Number(field.defaultValue))
        ? Number(field.defaultValue)
        : min;

  const [value, setValue] = useState<number>(initial);

  const formatter = new Intl.NumberFormat(undefined, field.formatOptions);

  return (
    <Field>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={name}>{field.label}</FieldLabel>
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatter.format(value)}
        </span>
      </div>

      <Slider
        id={name}
        name={name}
        value={[value]}
        onValueChange={(v) => setValue((Array.isArray(v) ? v[0] : v) ?? min)}
        min={min}
        max={max}
        step={step}
        disabled={isPending || field.readOnly}
      />

      <FieldError />
    </Field>
  );
}

/**
 * Date / datetime input. Composes `Popover` + `Calendar` for the date and
 * (optionally) `<input type="time">` for the time. Submits the combined ISO
 * value via a hidden `<input>` so it shows up in `FormData`.
 */
function DateInput({ name, field, isPending }: AdditionalFieldProps) {
  const { localization } = useAuth();
  const inputType = resolveInputType(field);
  const isDateTime = inputType === "datetime";

  const [date, setDate] = useState<Date | undefined>(
    toDate(field.defaultValue),
  );
  const [time, setTime] = useState<string>(
    isDateTime && date ? formatTime(date) : "",
  );
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();

  // Compose the hidden form value: ISO date for "date", ISO datetime for
  // "datetime" (date + time).
  let formValue = "";
  if (date) {
    if (isDateTime && time && time.trim() !== "") {
      const [h = "0", m = "0", s = "0"] = time.split(":");
      const combined = new Date(date);
      combined.setHours(Number(h), Number(m), Number(s), 0);
      formValue = combined.toISOString();
    } else {
      // Anchor to local midnight then serialize as ISO so the downstream
      // `parseAdditionalFieldValue` parses the same calendar day regardless
      // of timezone (a bare "YYYY-MM-DD" would be parsed as UTC midnight).
      // Datetime fields with a blank time also fall through here, defaulting
      // the time to local midnight since the parsed value is always a `Date`.
      const localMidnight = new Date(date);
      localMidnight.setHours(0, 0, 0, 0);
      formValue = localMidnight.toISOString();
    }
  }

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={`${name}-date`}>{field.label}</FieldLabel>

      <div className="relative flex gap-2">
        {/* Visually-hidden input so required constraint validation fires on submit.
            onInvalid suppresses the native browser balloon and routes the message
            through the styled <FieldError> below — matching the pattern used by
            the Name / Email / Password fields in the sign-up form. */}
        <input
          aria-label={typeof field.label === "string" ? field.label : name}
          type="text"
          name={name}
          value={formValue}
          onChange={() => {}}
          required={field.required}
          tabIndex={-1}
          className="sr-only"
          onInvalid={(e) => {
            e.preventDefault();
            setError((e.target as HTMLInputElement).validationMessage);
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            type="button"
            id={`${name}-date`}
            data-empty={!date}
            aria-invalid={!!error}
            disabled={isPending || field.readOnly}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex-1 justify-between font-normal",
              "data-[empty=true]:text-muted-foreground",
            )}
          >
            {date ? format(date, "PPP") : <span>{field.placeholder}</span>}

            {isDateTime ? <ChevronDownIcon /> : <CalendarIcon />}
          </PopoverTrigger>

          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              defaultMonth={date}
              captionLayout="dropdown"
              onSelect={(value) => {
                setDate(value);
                if (value) setError(undefined);
                if (!isDateTime) setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        {isDateTime && (
          <Field className="w-32">
            <FieldLabel htmlFor={`${name}-time`} className="sr-only">
              {localization.settings.time}
            </FieldLabel>

            <Input
              type="time"
              id={`${name}-time`}
              step="1"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={isPending || field.readOnly}
              className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </Field>
        )}
      </div>

      <FieldError>{error}</FieldError>
    </Field>
  );
}
