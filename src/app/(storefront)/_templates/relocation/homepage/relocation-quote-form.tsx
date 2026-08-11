"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "~/lib/utils";
import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { HCaptchaField } from "~/components/inputs/hcaptcha-form-field";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { RelocationPillButton } from "../shared/relocation-pill-button";

/**
 * "Get your free moving quotes here" form (design.md → Homepage §2).
 *
 * The source's Squarespace form was inert; this one posts through the shared
 * `api.contact.send` mutation via `useContactForm`, hCaptcha included — the
 * same path every other template's contact form uses. Two shims are needed
 * because the shared contact payload is `{ name, email, phone, message }` while
 * the source form collects first name / last name / email / phone:
 *
 *  - `name` is composed from the two visible name boxes and kept in sync on
 *    every keystroke, so normal validation and Cmd+Enter submit both behave.
 *    Its error surfaces under the First Name box.
 *  - `message` is synthesized (the source had no message box at all) and
 *    carries the phone number, so the owner still receives it in the email.
 *
 * Fields are hand-rolled on the shared `FormField` primitives rather than
 * `InputFormField` for two reasons: the source's inputs are square-cornered
 * `--relocation-input` boxes rather than shadcn inputs, and every label needs a
 * `fieldAttr` annotation, which `InputFormField`'s plain-string `label` prop
 * cannot carry.
 */

const LABEL_CLASS =
  "block pb-1 [font-family:var(--font-relocation-body)] text-[1.1875rem] leading-[1.875rem] font-medium text-[var(--relocation-ink)] min-[1025px]:text-[1.4375rem] min-[1025px]:leading-[2.25rem]";

const SUB_LABEL_CLASS =
  "block [font-family:var(--font-relocation-body)] text-base leading-[1.625rem] font-medium text-[var(--relocation-ink)] min-[1025px]:text-lg min-[1025px]:leading-[1.8125rem]";

const INPUT_CLASS =
  "relocation-input block h-13 w-full rounded-none border border-solid border-[var(--relocation-ink)] px-2.5 py-2.5 [font-family:var(--font-relocation-body)] text-[1.0625rem] text-[var(--relocation-ink)] min-[1025px]:h-14.5";

const ERROR_CLASS =
  "mt-2 [font-family:var(--font-relocation-body)] text-base leading-[1.625rem] text-[var(--relocation-terracotta-deep)]";

const REQUIRED_CLASS =
  "[font-family:var(--font-relocation-body)] text-base leading-[1.625rem] text-[var(--relocation-ink)] opacity-70";

type Props = {
  nameLabel: string;
  firstLabel: string;
  lastLabel: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  submitLabel: string;
  successHeading: string;
  successBody: string;
  successAgainLabel: string;
  /** `fieldAttr(...)` maps so the visual editor can live-patch each label. */
  nameLabelAttrs?: Record<string, string>;
  firstLabelAttrs?: Record<string, string>;
  lastLabelAttrs?: Record<string, string>;
  emailLabelAttrs?: Record<string, string>;
  phoneLabelAttrs?: Record<string, string>;
  submitLabelAttrs?: Record<string, string>;
  successHeadingAttrs?: Record<string, string>;
  successBodyAttrs?: Record<string, string>;
  successAgainLabelAttrs?: Record<string, string>;
};

export function RelocationQuoteForm({
  nameLabel,
  firstLabel,
  lastLabel,
  emailLabel,
  emailPlaceholder,
  phoneLabel,
  submitLabel,
  successHeading,
  successBody,
  successAgainLabel,
  nameLabelAttrs,
  firstLabelAttrs,
  lastLabelAttrs,
  emailLabelAttrs,
  phoneLabelAttrs,
  submitLabelAttrs,
  successHeadingAttrs,
  successBodyAttrs,
  successAgainLabelAttrs,
}: Props) {
  const {
    form,
    isSubmitting,
    error,
    captchaToken,
    setCaptchaToken,
    captchaRef,
    onSubmit,
    formRef,
    isDirty,
    isSuccess,
    resetSuccess,
  } = useContactForm({ messageMaxLength: 500 });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const idPrefix = useId();
  const firstFieldId = `${idPrefix}-first`;
  const lastFieldId = `${idPrefix}-last`;
  const nameErrorId = `${idPrefix}-name-error`;
  const successHeadingRef = useRef<HTMLParagraphElement>(null);

  // Replace the shared hook's generic "message sent" toast with the quote
  // form's owner-editable reassurance line (the same copy as the inline
  // success panel), so the visitor is told the team will be in touch even if
  // the panel has scrolled out of view. `toast.dismiss()` clears the generic
  // one the hook just raised.
  const wasSuccess = useRef(false);
  useEffect(() => {
    if (isSuccess && !wasSuccess.current && successBody) {
      toast.dismiss();
      toast.success(successBody);
    }
    wasSuccess.current = isSuccess;
  }, [isSuccess, successBody]);

  // Keep the shared payload's `name` in step with the two visible boxes.
  useEffect(() => {
    const composed = `${firstName} ${lastName}`.trim();
    form.setValue("name", composed, { shouldDirty: true });
    if (composed !== "") form.clearErrors("name");
  }, [firstName, lastName, form]);

  // The source form had no message box; synthesize one that clears the shared
  // schema's 10-character floor and still carries the phone number.
  const phone = form.watch("phone");
  useEffect(() => {
    const trimmed = (phone ?? "").trim();
    form.setValue(
      "message",
      `Free estimate request from the homepage quote form. Phone: ${
        trimmed === "" ? "not provided" : trimmed
      }.`,
    );
    form.setValue("preferredContactMethod", "phone");
  }, [phone, form]);

  useEffect(() => {
    if (isSuccess) successHeadingRef.current?.focus();
  }, [isSuccess]);

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  const { isEnabled } = useStorefrontFlags();
  if (!isEnabled("contactForm")) return null;

  if (isSuccess) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 border border-solid border-[var(--relocation-border)] bg-[var(--relocation-input)] px-8 py-14 text-center"
      >
        <span
          aria-hidden="true"
          className="text-[2.5rem] leading-none text-[var(--relocation-terracotta)]"
        >
          ✓
        </span>
        <p
          ref={successHeadingRef}
          tabIndex={-1}
          {...successHeadingAttrs}
          className="[font-family:var(--font-relocation-display)] text-[1.6875rem] leading-[2.25rem] font-bold text-[var(--relocation-charcoal)]"
        >
          {successHeading}
        </p>
        <p
          {...successBodyAttrs}
          className="max-w-[26rem] [font-family:var(--font-relocation-body)] text-[1.0625rem] leading-[1.8125rem] text-[var(--relocation-ink)]"
        >
          {successBody}
        </p>
        <button
          type="button"
          onClick={() => {
            setFirstName("");
            setLastName("");
            resetSuccess();
          }}
          className="relocation-hover-fade mt-1 cursor-pointer [font-family:var(--font-relocation-display)] text-[1.0625rem] tracking-[0.45px] text-[var(--relocation-terracotta-deep)] underline underline-offset-4"
        >
          <span {...successAgainLabelAttrs}>{successAgainLabel}</span>
        </button>
      </div>
    );
  }

  const nameError = form.formState.errors.name?.message;

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        {error ? (
          <p
            role="alert"
            className="border border-solid border-[var(--relocation-terracotta-deep)] px-3 py-2 [font-family:var(--font-relocation-body)] text-base text-[var(--relocation-terracotta-deep)]"
          >
            {error}
          </p>
        ) : null}

        {/* Name — two boxes, one composed payload field. */}
        <fieldset className="min-w-0">
          <legend className={LABEL_CLASS}>
            <span {...nameLabelAttrs}>{nameLabel}</span>{" "}
            <span className={REQUIRED_CLASS}>(required)</span>
          </legend>

          <div className="flex flex-wrap items-start gap-x-2.5 gap-y-4">
            <div className="min-w-0 flex-1 basis-[min(100%,10rem)]">
              <label htmlFor={firstFieldId} className={SUB_LABEL_CLASS}>
                <span {...firstLabelAttrs}>{firstLabel}</span>
              </label>
              <input
                id={firstFieldId}
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-required="true"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? nameErrorId : undefined}
                className={cn(INPUT_CLASS, "mt-1")}
              />
            </div>

            <div className="min-w-0 flex-1 basis-[min(100%,10rem)]">
              <label htmlFor={lastFieldId} className={SUB_LABEL_CLASS}>
                <span {...lastLabelAttrs}>{lastLabel}</span>
              </label>
              <input
                id={lastFieldId}
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={cn(INPUT_CLASS, "mt-1")}
              />
            </div>
          </div>

          {nameError ? (
            <p id={nameErrorId} role="alert" className={ERROR_CLASS}>
              {nameError}
            </p>
          ) : null}
        </fieldset>

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-0">
              <FormLabel className={LABEL_CLASS}>
                <span {...emailLabelAttrs}>{emailLabel}</span>{" "}
                <span className={REQUIRED_CLASS}>(required)</span>
              </FormLabel>
              <FormControl>
                <input
                  {...field}
                  value={field.value ?? ""}
                  type="email"
                  autoComplete="email"
                  placeholder={emailPlaceholder}
                  aria-required="true"
                  className={INPUT_CLASS}
                />
              </FormControl>
              <FormMessage className={ERROR_CLASS} />
            </FormItem>
          )}
        />

        {/* Mobile phone — a plain tel box, as in the source. */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-0">
              <FormLabel className={LABEL_CLASS}>
                <span {...phoneLabelAttrs}>{phoneLabel}</span>
              </FormLabel>
              <FormControl>
                <input
                  {...field}
                  value={field.value ?? ""}
                  type="tel"
                  autoComplete="tel"
                  className={INPUT_CLASS}
                />
              </FormControl>
              <FormMessage className={ERROR_CLASS} />
            </FormItem>
          )}
        />

        <HCaptchaField
          ref={captchaRef}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken("")}
          onError={() => setCaptchaToken("")}
          label="Verification"
          required
        />

        <div className="text-center">
          <RelocationPillButton
            type="submit"
            variant="solid-deep"
            uppercase={false}
            disabled={isSubmitting || !captchaToken}
            className={cn(
              "w-full min-[572px]:w-auto",
              (isSubmitting || !captchaToken) && "opacity-60",
            )}
            labelAttrs={submitLabelAttrs}
          >
            {submitLabel}
          </RelocationPillButton>
        </div>
      </form>
    </Form>
  );
}
