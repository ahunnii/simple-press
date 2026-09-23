"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import type { FormField, PublicFormDefinition } from "~/lib/validators/form";
import { validateFormAnswers } from "~/lib/forms/answers";
import { localCalendarDate } from "~/lib/calendar-date";
import { useRecaptchaV3 } from "~/lib/captcha/use-recaptcha-v3";
import { cn } from "~/lib/utils";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";
import { RecaptchaDisclosure } from "~/components/inputs/recaptcha-field";

/** reCAPTCHA v3 action asserted server-side by `formSubmission.submit`. */
const RECAPTCHA_ACTION = "form";

/**
 * Native `<select>` styling for the `select` field type. Not the shadcn
 * `Select` — it portals its popup content outside whatever storefront
 * template scope class this renders under, so it would pick up the wrong
 * theme in every template but one (same reasoning as
 * `~/components/quote/quote-question-field.tsx`'s `nativeSelectClass`).
 */
const nativeSelectClass =
  "border-input bg-background text-foreground flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50";

type RawValues = Record<string, unknown>;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function defaultValueFor(field: FormField): unknown {
  switch (field.type) {
    case "checkboxes":
      return [];
    case "checkbox":
      return false;
    default:
      return "";
  }
}

function makeDefaultValues(fields: FormField[]): RawValues {
  const values: RawValues = {};
  for (const field of fields) {
    values[field.id] = defaultValueFor(field);
  }
  return values;
}

export type FormRendererProps = {
  definition: PublicFormDefinition;
  formId: string;
  /**
   * "live" (default): submits to the server with reCAPTCHA. "preview": no
   * network, no reCAPTCHA — used by the admin builder's preview panel.
   */
  mode?: "live" | "preview";
  className?: string;
};

export function FormRenderer({
  definition,
  formId,
  mode = "live",
  className,
}: FormRendererProps) {
  const { fields, settings } = definition;
  const isLive = mode === "live";

  const [values, setValues] = useState<RawValues>(() =>
    makeDefaultValues(fields),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const successRef = useRef<HTMLDivElement | null>(null);
  const submitLock = useRef(false);
  const prefillApplied = useRef(false);

  // Reset local state whenever the definition genuinely changes (e.g. the
  // admin builder swaps in a new draft, or a different form embeds here).
  // Tracks the formId the state was built for, so mount (and StrictMode's
  // effect replay) doesn't wipe values — e.g. the session-email prefill.
  const stateFormId = useRef(formId);
  useEffect(() => {
    if (stateFormId.current === formId) return;
    stateFormId.current = formId;
    prefillApplied.current = false;
    setValues(makeDefaultValues(fields));
    setFieldErrors({});
    setSubmitError(null);
    setHasSubmitted(false);
    setSuccessMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const { execute: executeRecaptcha } = useRecaptchaV3();

  // Prefill the confirmation field with the signed-in visitor's email, once,
  // in live mode only. The hook is called unconditionally (rules of hooks);
  // it never resolves a session when customer accounts are off.
  const session = authClient.useSession();
  useEffect(() => {
    if (!isLive || prefillApplied.current) return;
    const email = session.data?.user?.email;
    if (!email) return;
    const fieldId = settings.confirmationFieldId;
    if (!fieldId) return;
    const field = fields.find((f) => f.id === fieldId);
    if (field?.type !== "email") return;
    prefillApplied.current = true;
    setValues((prev) => {
      const current = prev[fieldId];
      if (typeof current === "string" && current !== "") return prev;
      return { ...prev, [fieldId]: email };
    });
  }, [isLive, session.data?.user?.email, settings.confirmationFieldId, fields]);

  const setValue = useCallback((fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  /** Re-validate a single field after first submit, so errors clear live. */
  const revalidateField = useCallback(
    (fieldId: string, nextValues: RawValues) => {
      if (!hasSubmitted) return;
      const result = validateFormAnswers(fields, nextValues, {
        optionMatch: "id",
        today: localCalendarDate(),
      });
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (result.ok) {
          delete next[fieldId];
        } else if (result.errors[fieldId]) {
          next[fieldId] = result.errors[fieldId];
        } else {
          delete next[fieldId];
        }
        return next;
      });
    },
    [fields, hasSubmitted],
  );

  const handleChange = useCallback(
    (fieldId: string, value: unknown) => {
      setValue(fieldId, value);
      const next = { ...values, [fieldId]: value };
      revalidateField(fieldId, next);
    },
    [revalidateField, setValue, values],
  );

  const focusFirstInvalid = useCallback((errors: Record<string, string>) => {
    const firstId = fields.find((f) => errors[f.id])?.id;
    if (!firstId) return;
    fieldRefs.current[firstId]?.focus();
  }, [fields]);

  const submitMutation = api.formSubmission.submit.useMutation({
    onSuccess: (data) => {
      if (!data.success) {
        setFieldErrors(data.fieldErrors);
        setSubmitError(null);
        focusFirstInvalid(data.fieldErrors);
        return;
      }
      setSubmitError(null);
      setFieldErrors({});
      setSuccessMessage(data.message);
    },
    onError: (error) => {
      setSubmitError(
        error.data?.code === "TOO_MANY_REQUESTS"
          ? "Too many submissions — please wait a moment and try again."
          : (error.message ?? "Something went wrong. Please try again."),
      );
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });

  const isPending = isLive ? submitMutation.isPending : false;

  const handleSubmit = useCallback(
    async (event?: React.SyntheticEvent) => {
      event?.preventDefault();
      setHasSubmitted(true);

      const result = validateFormAnswers(fields, values, {
        optionMatch: "id",
        today: localCalendarDate(),
      });

      if (!result.ok) {
        setFieldErrors(result.errors);
        setSubmitError(null);
        focusFirstInvalid(result.errors);
        return;
      }
      setFieldErrors({});

      if (!isLive) {
        // Preview mode: no network, no reCAPTCHA — just show the success
        // copy the owner configured, exactly like a real submit would.
        setSubmitError(null);
        setSuccessMessage(settings.successMessage);
        return;
      }

      if (submitLock.current || submitMutation.isPending) return;
      submitLock.current = true;

      let token: string | null;
      try {
        token = await executeRecaptcha(RECAPTCHA_ACTION);
      } catch (error) {
        submitLock.current = false;
        throw error;
      }

      submitMutation.mutate({
        formId,
        answers: values,
        recaptchaToken: token ?? "",
      });
    },
    [
      executeRecaptcha,
      fields,
      focusFirstInvalid,
      formId,
      isLive,
      settings.successMessage,
      submitMutation,
      values,
    ],
  );

  useEffect(() => {
    if (successMessage) successRef.current?.focus();
  }, [successMessage]);

  const handleResetPreview = useCallback(() => {
    setValues(makeDefaultValues(fields));
    setFieldErrors({});
    setSubmitError(null);
    setHasSubmitted(false);
    setSuccessMessage(null);
  }, [fields]);

  const errorCount = Object.keys(fieldErrors).length;

  // Preview renders inside the admin builder's own <form>, and forms can't
  // nest — so preview uses a <div>, a type="button" submit, and swallows
  // Enter so implicit submission can't save the builder.
  const Root = isLive ? "form" : "div";
  const rootProps = isLive
    ? {
        noValidate: true,
        onSubmit: (event: React.FormEvent) => void handleSubmit(event),
      }
    : {
        role: "form" as const,
        onKeyDown: (event: React.KeyboardEvent) => {
          if (
            event.key === "Enter" &&
            event.target instanceof HTMLInputElement
          ) {
            event.preventDefault();
          }
        },
      };

  if (successMessage) {
    return (
      <div
        ref={successRef}
        role="status"
        tabIndex={-1}
        className={cn(
          "border-input bg-muted/30 rounded-lg border p-6 text-sm whitespace-pre-line outline-none",
          className,
        )}
      >
        {successMessage}
        {!isLive && (
          <div className="mt-4">
            <Button type="button" variant="outline" size="sm" onClick={handleResetPreview}>
              Reset preview
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Root
      className={cn("space-y-5", className)}
      {...rootProps}
    >
      {submitError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {submitError}
        </div>
      )}

      {hasSubmitted && errorCount > 0 && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorCount === 1
            ? "There is 1 error in this form."
            : `There are ${errorCount} errors in this form.`}
        </div>
      )}

      {fields.map((field) => (
        <FormFieldRow
          key={field.id}
          field={field}
          value={values[field.id]}
          error={fieldErrors[field.id]}
          onChange={(value) => handleChange(field.id, value)}
          registerRef={(el) => {
            fieldRefs.current[field.id] = el;
          }}
        />
      ))}

      <div className="space-y-3 pt-1">
        <Button
          type={isLive ? "submit" : "button"}
          disabled={isPending}
          onClick={isLive ? undefined : () => void handleSubmit()}
        >
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          {settings.submitLabel}
        </Button>
        {isLive && <RecaptchaDisclosure />}
      </div>
    </Root>
  );
}

type FormFieldRowProps = {
  field: FormField;
  value: unknown;
  error: string | undefined;
  onChange: (value: unknown) => void;
  registerRef: (el: HTMLElement | null) => void;
};

function FormFieldRow({
  field,
  value,
  error,
  onChange,
  registerRef,
}: FormFieldRowProps) {
  const fieldDomId = `form-field-${field.id}`;
  const descriptionId = field.description ? `${fieldDomId}-description` : undefined;
  const errorId = error ? `${fieldDomId}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  const invalid = !!error;

  // Choice-group fields (radio/checkboxes) render their own <fieldset>/
  // <legend> instead of a <Label>, so their wrapper skips the label row.
  if (field.type === "radio" || field.type === "checkboxes") {
    const legendId = `${fieldDomId}-legend`;
    return (
      <fieldset className="space-y-2">
        <legend
          id={legendId}
          className="flex items-center gap-1 text-sm leading-none font-medium"
        >
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
        </legend>
        {field.description && (
          <p id={descriptionId} className="text-muted-foreground text-sm">
            {field.description}
          </p>
        )}
        {field.type === "radio" ? (
          <RadioGroup
            value={typeof value === "string" ? value : ""}
            onValueChange={onChange}
            aria-labelledby={legendId}
            aria-required={field.required || undefined}
            aria-describedby={describedBy}
            aria-invalid={invalid}
          >
            {field.options.map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <RadioGroupItem
                  id={`${fieldDomId}-${option.id}`}
                  value={option.id}
                  ref={
                    index === 0
                      ? (el) => registerRef(el as unknown as HTMLElement | null)
                      : undefined
                  }
                />
                <Label htmlFor={`${fieldDomId}-${option.id}`}>
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div
            className="space-y-2"
            role="group"
            aria-labelledby={legendId}
            aria-describedby={describedBy}
          >
            {field.options.map((option, index) => {
              const selected = asStringArray(value);
              const checked = selected.includes(option.id);
              return (
                <div key={option.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`${fieldDomId}-${option.id}`}
                    checked={checked}
                    ref={index === 0 ? (el) => registerRef(el as unknown as HTMLElement | null) : undefined}
                    onCheckedChange={(next) => {
                      const nextSelected = next
                        ? [...selected, option.id]
                        : selected.filter((id) => id !== option.id);
                      onChange(nextSelected);
                    }}
                  />
                  <Label htmlFor={`${fieldDomId}-${option.id}`}>
                    {option.label}
                  </Label>
                </div>
              );
            })}
          </div>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </fieldset>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id={fieldDomId}
            checked={value === true}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            ref={(el) => registerRef(el as unknown as HTMLElement | null)}
            onCheckedChange={(next) => onChange(next === true)}
          />
          <Label htmlFor={fieldDomId}>
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </Label>
        </div>
        {field.description && (
          <p id={descriptionId} className="text-muted-foreground text-sm">
            {field.description}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldDomId}>
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </Label>
      {field.description && (
        <p id={descriptionId} className="text-muted-foreground text-sm">
          {field.description}
        </p>
      )}
      <FieldControl
        field={field}
        value={value}
        fieldDomId={fieldDomId}
        describedBy={describedBy}
        invalid={invalid}
        onChange={onChange}
        registerRef={registerRef}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function FieldControl({
  field,
  value,
  fieldDomId,
  describedBy,
  invalid,
  onChange,
  registerRef,
}: {
  field: FormField;
  value: unknown;
  fieldDomId: string;
  describedBy: string | undefined;
  invalid: boolean;
  onChange: (value: unknown) => void;
  registerRef: (el: HTMLElement | null) => void;
}) {
  const raw = typeof value === "string" ? value : "";

  switch (field.type) {
    case "text":
      return (
        <Input
          id={fieldDomId}
          type="text"
          value={raw}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          aria-required={field.required || undefined}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          ref={(el) => registerRef(el)}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "longtext":
      return (
        <Textarea
          id={fieldDomId}
          rows={5}
          value={raw}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          aria-required={field.required || undefined}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          ref={(el) => registerRef(el)}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "email":
      return (
        <Input
          id={fieldDomId}
          type="email"
          value={raw}
          placeholder={field.placeholder}
          aria-required={field.required || undefined}
          autoComplete="email"
          aria-describedby={describedBy}
          aria-invalid={invalid}
          ref={(el) => registerRef(el)}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "phone":
      return (
        <Input
          id={fieldDomId}
          type="tel"
          value={raw}
          placeholder={field.placeholder}
          aria-required={field.required || undefined}
          autoComplete="tel"
          aria-describedby={describedBy}
          aria-invalid={invalid}
          ref={(el) => registerRef(el)}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "number":
      return (
        <Input
          id={fieldDomId}
          type="number"
          inputMode="decimal"
          step={field.step ?? "any"}
          min={field.min ?? undefined}
          max={field.max ?? undefined}
          value={raw}
          placeholder={field.placeholder}
          aria-required={field.required || undefined}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          ref={(el) => registerRef(el)}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "date": {
      const min = field.minDate === "today" ? localCalendarDate() : undefined;
      return (
        <Input
          id={fieldDomId}
          type="date"
          value={raw}
          min={min}
          aria-required={field.required || undefined}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          ref={(el) => registerRef(el)}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    }
    case "select":
      return (
        <select
          id={fieldDomId}
          value={raw}
          aria-required={field.required || undefined}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          ref={(el) => registerRef(el)}
          onChange={(event) => onChange(event.target.value)}
          className={nativeSelectClass}
        >
          <option value="">
            {field.placeholder ?? "Select an option…"}
          </option>
          {field.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      );
    default:
      return null;
  }
}
