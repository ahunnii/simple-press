"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Form } from "~/components/ui/form";
import { InputFormField } from "~/components/inputs/input-form-field";
import { PhoneFormField } from "~/components/inputs/phone-form-field";
import { RecaptchaField } from "~/components/inputs/recaptcha-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

const LABEL_CLASS = "pink-label";

type Props = {
  serviceName: string;
  heading: string;
  intro: string;
  submitLabel: string;
  fallbackLabel: string;
};

/**
 * "Request this date" form (design.md → Service detail → pink-table →
 * Sticky sidebar). Posts through the shared `api.contact.send` mutation via
 * `useContactForm` — the same path the contact page uses, hCaptcha
 * included. There is no dedicated "subject"/"org"/"date" field on the
 * shared contact schema (`ContactFormValues`), so — per the hard rule
 * against a bespoke contact backend — the service name is folded into the
 * message field's opening line instead of a true subject line, and the
 * "org / preferred date" fields called for in design.md are absorbed into
 * the single free-text message field (labeled accordingly) rather than
 * hand-rolling new form fields the backend has no column for.
 *
 * Collapses to a single "Ask about a date →" link to /contact when the
 * `contactForm` feature flag is off, per design.md.
 */
export function PinkTableRequestForm({
  serviceName,
  heading,
  intro,
  submitLabel,
  fallbackLabel,
}: Props) {
  const { isEnabled } = useStorefrontFlags();

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

  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const prefilledRef = useRef(false);

  useEffect(() => {
    if (prefilledRef.current) return;
    prefilledRef.current = true;
    // Fold the service name into the message so the artist has context —
    // the shared contact payload has no separate subject field (see the
    // module doc comment above).
    form.setValue("message", `Asking about: ${serviceName}\n\n`);
  }, [form, serviceName]);

  useEffect(() => {
    if (isSuccess) successHeadingRef.current?.focus();
  }, [isSuccess]);

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  if (!isEnabled("contactForm")) {
    return (
      <div className="p-5" style={{ background: "var(--pink-panel)" }}>
        <Link
          href="/contact"
          className="pink-btn pink-btn-outline w-full justify-center"
        >
          {fallbackLabel}
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 p-8 text-center"
        style={{
          background: "var(--pink-panel)",
          border: "1px solid var(--pink-line)",
        }}
      >
        <span
          aria-hidden="true"
          className="pink-display text-[28px]"
          style={{ color: "var(--pink-rose)" }}
        >
          ✓
        </span>
        <h3
          ref={successHeadingRef}
          tabIndex={-1}
          className="pink-display text-[19px]"
          style={{ fontWeight: 600 }}
        >
          Request sent.
        </h3>
        <p className="text-[14px]" style={{ color: "var(--pink-muted)" }}>
          We&apos;ll follow up within a couple of days.
        </p>
        <button
          type="button"
          onClick={resetSuccess}
          className="pink-btn pink-btn-ghost mt-1"
        >
          Send another →
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 p-5"
      style={{ background: "var(--pink-panel)" }}
    >
      <div>
        <h3 className="pink-display text-[17px]" style={{ fontWeight: 600 }}>
          {heading}
        </h3>
        {intro && (
          <p
            className="mt-1 text-[14px] leading-[1.6]"
            style={{ color: "var(--pink-muted)" }}
          >
            {intro}
          </p>
        )}
      </div>

      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {error && (
            <p
              role="alert"
              className="text-[13px]"
              style={{ color: "var(--pink-error)" }}
            >
              {error}
            </p>
          )}

          <InputFormField
            form={form}
            name="name"
            label="Name or organization"
            labelClassName={LABEL_CLASS}
            inputClassName="pink-input"
            placeholder="Your name, or your school / church / workplace"
            required
            className="flex flex-col gap-1.5"
          />
          <InputFormField
            form={form}
            name="email"
            label="Email"
            labelClassName={LABEL_CLASS}
            inputClassName="pink-input"
            type="email"
            placeholder="you@example.com"
            required
            className="flex flex-col gap-1.5"
          />
          <PhoneFormField
            form={form}
            name="phone"
            label="Phone (optional)"
            labelClassName={LABEL_CLASS}
            className="flex flex-col gap-1.5"
          />
          <TextareaFormField
            form={form}
            name="message"
            label="Preferred date & notes"
            labelClassName={LABEL_CLASS}
            textareaClassName="pink-input"
            placeholder="Which date works, roughly how many people, and anything we should know"
            required
            rows={4}
            messageLength={messageLength}
            maxLength={messageMaxLength}
            className="flex flex-col gap-1.5"
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

          <button
            type="submit"
            disabled={isSubmitting || !captchaToken}
            className="pink-btn pink-btn-solid w-full justify-center"
          >
            {isSubmitting && (
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            )}
            {isSubmitting ? "Sending…" : submitLabel}
          </button>
        </form>
      </Form>
    </div>
  );
}
