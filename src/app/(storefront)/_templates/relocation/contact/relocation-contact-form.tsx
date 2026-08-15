"use client";

import { useEffect, useRef } from "react";

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
import { RecaptchaField } from "~/components/inputs/recaptcha-field";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { RelocationPillButton } from "../shared/relocation-pill-button";

/**
 * Contact page "SEND US A MESSAGE" form (design.md deviation #5, reversed
 * 2026-08-13 — see contact/index.ts docblock for the full history).
 *
 * Structurally and visually this mirrors `RelocationQuoteForm` (the homepage
 * free-quote form): the same LABEL_CLASS / INPUT_CLASS / ERROR_CLASS /
 * REQUIRED_CLASS treatment, the same `solid-deep` pill submit button, and the
 * same success-panel pattern (border-[var(--relocation-border)]
 * bg-[var(--relocation-input)], ✓ glyph, focused heading, "send another"
 * underline link). Posts through the shared `api.contact.send` mutation via
 * `useContactForm`, reCAPTCHA v3 included — the same path every other
 * template's contact form uses.
 *
 * Unlike the quote form, no shims are needed here: the shared contact
 * payload is `{ name, email, phone, message }`, which is a 1:1 match for a
 * plain name/email/phone/message form. `name` and `message` are real
 * `FormField`s wired straight to the RHF fields `useContactForm` already
 * manages — nothing is composed or synthesized. Fields are hand-rolled on
 * the shared `FormField` primitives rather than `InputFormField` for the
 * same two reasons as the quote form: square-cornered `--relocation-input`
 * boxes instead of shadcn inputs, and every label needs a `fieldAttr`
 * annotation that `InputFormField`'s plain-string `label` prop can't carry.
 */

const LABEL_CLASS =
  "block pb-1 [font-family:var(--font-relocation-body)] text-[1.1875rem] leading-[1.875rem] font-medium text-[var(--relocation-ink)] min-[1025px]:text-[1.4375rem] min-[1025px]:leading-[2.25rem]";

const INPUT_CLASS =
  "relocation-input block h-13 w-full rounded-none border border-solid border-[var(--relocation-ink)] px-2.5 py-2.5 [font-family:var(--font-relocation-body)] text-[1.0625rem] text-[var(--relocation-ink)] min-[1025px]:h-14.5";

const TEXTAREA_CLASS =
  "relocation-input block min-h-36 w-full resize-y rounded-none border border-solid border-[var(--relocation-ink)] px-2.5 py-2.5 [font-family:var(--font-relocation-body)] text-[1.0625rem] text-[var(--relocation-ink)]";

const ERROR_CLASS =
  "mt-2 [font-family:var(--font-relocation-body)] text-base leading-[1.625rem] text-[var(--relocation-terracotta-deep)]";

const REQUIRED_CLASS =
  "[font-family:var(--font-relocation-body)] text-base leading-[1.625rem] text-[var(--relocation-ink)] opacity-70";

const COUNTER_CLASS =
  "shrink-0 [font-family:var(--font-relocation-body)] text-sm leading-[1.625rem] text-[var(--relocation-ink)] opacity-60";

type Props = {
  nameLabel: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  messageLabel: string;
  messagePlaceholder: string;
  submitLabel: string;
  successHeading: string;
  successBody: string;
  successAgainLabel: string;
  /** `fieldAttr(...)` maps so the visual editor can live-patch each label. */
  nameLabelAttrs?: Record<string, string>;
  emailLabelAttrs?: Record<string, string>;
  phoneLabelAttrs?: Record<string, string>;
  messageLabelAttrs?: Record<string, string>;
  submitLabelAttrs?: Record<string, string>;
  successHeadingAttrs?: Record<string, string>;
  successBodyAttrs?: Record<string, string>;
  successAgainLabelAttrs?: Record<string, string>;
};

export function RelocationContactForm({
  nameLabel,
  emailLabel,
  emailPlaceholder,
  phoneLabel,
  messageLabel,
  messagePlaceholder,
  submitLabel,
  successHeading,
  successBody,
  successAgainLabel,
  nameLabelAttrs,
  emailLabelAttrs,
  phoneLabelAttrs,
  messageLabelAttrs,
  submitLabelAttrs,
  successHeadingAttrs,
  successBodyAttrs,
  successAgainLabelAttrs,
}: Props) {
  const {
    form,
    messageLength,
    messageMaxLength,
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
  } = useContactForm({ messageMaxLength: 600 });

  const successHeadingRef = useRef<HTMLParagraphElement>(null);

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
          onClick={resetSuccess}
          className="relocation-hover-fade mt-1 cursor-pointer [font-family:var(--font-relocation-display)] text-[1.0625rem] tracking-[0.45px] text-[var(--relocation-terracotta-deep)] underline underline-offset-4"
        >
          <span {...successAgainLabelAttrs}>{successAgainLabel}</span>
        </button>
      </div>
    );
  }

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

        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-0">
              <FormLabel className={LABEL_CLASS}>
                <span {...nameLabelAttrs}>{nameLabel}</span>{" "}
                <span className={REQUIRED_CLASS}>(required)</span>
              </FormLabel>
              <FormControl>
                <input
                  {...field}
                  value={field.value ?? ""}
                  type="text"
                  autoComplete="name"
                  aria-required="true"
                  className={INPUT_CLASS}
                />
              </FormControl>
              <FormMessage className={ERROR_CLASS} />
            </FormItem>
          )}
        />

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

        {/* Mobile phone — optional, a plain tel box as in the quote form. */}
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

        {/* Message — a real textarea, with a remaining-character count. */}
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <FormLabel className={LABEL_CLASS}>
                  <span {...messageLabelAttrs}>{messageLabel}</span>{" "}
                  <span className={REQUIRED_CLASS}>(required)</span>
                </FormLabel>
                <span className={COUNTER_CLASS}>
                  {messageLength}/{messageMaxLength}
                </span>
              </div>
              <FormControl>
                <textarea
                  {...field}
                  value={field.value ?? ""}
                  rows={6}
                  placeholder={messagePlaceholder}
                  maxLength={messageMaxLength}
                  aria-required="true"
                  className={TEXTAREA_CLASS}
                />
              </FormControl>
              <FormMessage className={ERROR_CLASS} />
            </FormItem>
          )}
        />

        <RecaptchaField
          ref={captchaRef}
          action="contact"
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
