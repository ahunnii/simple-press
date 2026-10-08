"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { CheckCircle2 } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { RecaptchaField } from "~/components/inputs/recaptcha-field";

import { gloveButtonClass, GloveInput, GloveTextarea } from "../shared";

const MESSAGE_MAX_LENGTH = 500;

type Props = {
  submitLabel: string;
  submitLabelFieldKey: string;
  successHeading: string;
  successHeadingFieldKey: string;
  successBody: string;
  successBodyFieldKey: string;
};

function Field({
  id,
  label,
  optional,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: (describedBy: string | undefined) => ReactNode;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div>
      <label
        htmlFor={id}
        className="glove-display mb-1.5 block text-[14px] font-medium text-[var(--glove-ink)]"
      >
        {label}
        {optional ? (
          <span className="glove-body ml-1.5 text-[13px] font-normal text-[var(--glove-muted)]">
            (optional)
          </span>
        ) : null}
      </label>
      {children(describedBy)}
      {hint ? (
        <p
          id={hintId}
          className="mt-1 text-right text-[12px] text-[var(--glove-muted)]"
        >
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="glove-error mt-1">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Contact form. Never rendered inside a reveal. Uses the shared
 * `useContactForm` hook (validation, reCAPTCHA token, mutation); success and
 * errors render in place. The `contactForm` flag is checked by the server page.
 */
export function GloveContactForm({
  submitLabel,
  submitLabelFieldKey,
  successHeading,
  successHeadingFieldKey,
  successBody,
  successBodyFieldKey,
}: Props) {
  const uid = useId();
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
  } = useContactForm({
    messageMaxLength: MESSAGE_MAX_LENGTH,
    showSuccessToast: false,
  });

  const successRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (isSuccess) successRef.current?.focus();
  }, [isSuccess]);

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  const errors = form.formState.errors;

  if (isSuccess) {
    return (
      <div
        role="status"
        className="glove-mist-panel flex flex-col items-start gap-3 p-6 md:p-8"
      >
        <CheckCircle2
          className="size-9 text-[var(--glove-primary)]"
          aria-hidden="true"
        />
        <h3
          ref={successRef}
          tabIndex={-1}
          className="glove-display text-[22px] leading-[1.3] font-medium text-[var(--glove-ink)] outline-none"
          {...fieldAttr(successHeadingFieldKey)}
        >
          {successHeading}
        </h3>
        {successBody ? (
          <p
            className="max-w-[55ch] text-[var(--glove-text)]"
            {...fieldAttr(successBodyFieldKey)}
          >
            {successBody}
          </p>
        ) : null}
        <button
          type="button"
          onClick={resetSuccess}
          className={gloveButtonClass({
            variant: "wooOutline",
            className: "mt-2",
          })}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      {error ? (
        <p
          role="alert"
          className="glove-error rounded-[3px] border border-[var(--glove-alert)] px-4 py-3 text-[14px]"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${uid}-name`}
          label="Your Name"
          error={errors.name?.message}
        >
          {(describedBy) => (
            <GloveInput
              id={`${uid}-name`}
              type="text"
              autoComplete="name"
              aria-required="true"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={describedBy}
              {...form.register("name")}
            />
          )}
        </Field>
        <Field
          id={`${uid}-email`}
          label="Your Email"
          error={errors.email?.message}
        >
          {(describedBy) => (
            <GloveInput
              id={`${uid}-email`}
              type="email"
              autoComplete="email"
              aria-required="true"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={describedBy}
              {...form.register("email")}
            />
          )}
        </Field>
      </div>

      <Field
        id={`${uid}-phone`}
        label="Phone Number"
        optional
        error={errors.phone?.message}
      >
        {(describedBy) => (
          <GloveInput
            id={`${uid}-phone`}
            type="tel"
            autoComplete="tel"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={describedBy}
            {...form.register("phone")}
          />
        )}
      </Field>

      <Field
        id={`${uid}-message`}
        label="Your Message"
        hint={`${messageLength}/${messageMaxLength}`}
        error={errors.message?.message}
      >
        {(describedBy) => (
          <GloveTextarea
            id={`${uid}-message`}
            rows={6}
            maxLength={messageMaxLength}
            aria-required="true"
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={describedBy}
            {...form.register("message")}
          />
        )}
      </Field>

      <RecaptchaField
        ref={captchaRef}
        action="contact"
        onVerify={setCaptchaToken}
        onExpire={() => setCaptchaToken("")}
        onError={() => setCaptchaToken("")}
        label="Verification"
        required
      />

      <div>
        <button
          type="submit"
          disabled={isSubmitting || !captchaToken}
          aria-busy={isSubmitting}
          className={gloveButtonClass({ variant: "woo", size: "md" })}
        >
          <span {...(isSubmitting ? {} : fieldAttr(submitLabelFieldKey))}>
            {isSubmitting ? "Sending…" : submitLabel}
          </span>
        </button>
      </div>
    </form>
  );
}
