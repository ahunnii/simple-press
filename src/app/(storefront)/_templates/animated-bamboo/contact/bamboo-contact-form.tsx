"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "~/lib/utils";
import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Form } from "~/components/ui/form";
import { InputFormField } from "~/components/inputs/input-form-field";
import { PhoneFormField } from "~/components/inputs/phone-form-field";
import { RadioFormField } from "~/components/inputs/radio-form-field";
import { RecaptchaField } from "~/components/inputs/recaptcha-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { BambooGlyph } from "../shared/bamboo-glyph";

const IS_IN_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Contact form, restyled for "Illustrated & Alive" — same real fields
 * (Name/Email/Phone/Message/Preferred Contact Method) and the same
 * `useContactForm({ messageMaxLength: 180 })` wiring as before. The mockup
 * only shows Name/Email/Phone/Message (it dropped Country + the preferred-
 * contact radios as mockup filler) — this form keeps every field it has
 * today. `.bamboo-contact-form` (globals.css) restyles the shared
 * `~/components/inputs/*` fields' native `label`/`input`/`textarea` elements
 * via descendant selectors, so the field components themselves are untouched.
 */
export function BambooContactForm() {
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
  } = useContactForm({ messageMaxLength: 180 });

  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  useEffect(() => {
    if (isSuccess) {
      successHeadingRef.current?.focus();
    }
  }, [isSuccess]);

  const { isEnabled } = useStorefrontFlags();
  if (!isEnabled("contactForm")) return null;

  if (isSuccess) {
    return (
      <div className="bamboo-torn-card text-center" role="status">
        <div className="flex flex-col items-center gap-4">
          <BambooGlyph id="s-wreath" className="h-16 w-auto" />
          <h2
            ref={successHeadingRef}
            tabIndex={-1}
            className="font-heading text-xl font-semibold text-[var(--bamboo-pine)] outline-none"
          >
            Message Sent
          </h2>
          <p className="text-[var(--bamboo-ink-soft)]">
            Thank you for reaching out. We will get back to you within 1-2
            business days.
          </p>
          <button
            type="button"
            onClick={resetSuccess}
            className="bamboo-btn bamboo-btn-ghost mt-2"
          >
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <div className="bamboo-torn-card">
        <h2 className="font-heading text-[1.3rem] tracking-[-0.01em] text-[var(--bamboo-pine)]">
          Send a Message
        </h2>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="bamboo-contact-form mt-[22px] flex w-full flex-col gap-5"
        >
          <p className="-mt-1.5 text-sm text-[var(--bamboo-muted)]">
            Fields marked with * are required.
          </p>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <InputFormField
              form={form}
              name="name"
              label="Name"
              className="col-span-1 flex flex-col gap-1.5"
              placeholder="Jane"
              required
            />

            <InputFormField
              form={form}
              name="email"
              label="Email"
              className="col-span-1 flex flex-col gap-1.5"
              type="email"
              placeholder="jane@example.com"
              required
            />
          </div>

          <PhoneFormField
            form={form}
            name="phone"
            label="Phone Number"
            className="flex flex-col gap-1.5"
            placeholder="+1 300 555 0000"
            autoComplete="tel"
          />

          <TextareaFormField
            form={form}
            name="message"
            label="Message"
            messageLength={messageLength}
            className="flex flex-col gap-1.5"
            maxLength={messageMaxLength}
            placeholder="Tell us how we can help..."
            required
          />

          <RadioFormField
            form={form}
            name="preferredContactMethod"
            label="Preferred Contact Method"
            defaultValue="no-preference"
            options={[
              { label: "Email", value: "email" },
              { label: "Phone", value: "phone" },
              { label: "No Preference", value: "no-preference" },
            ]}
            className="flex flex-col gap-1.5"
            radioGroupClassName="flex flex-col gap-3 pt-1"
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
            disabled={isSubmitting || (!captchaToken && IS_IN_PRODUCTION)}
            className={cn(
              "bamboo-btn bamboo-btn-primary mt-2 self-start",
              (isSubmitting || (!captchaToken && IS_IN_PRODUCTION)) &&
                "cursor-not-allowed opacity-60",
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Sending...
              </>
            ) : (
              "Send Message"
            )}
          </button>
        </form>
      </div>
    </Form>
  );
}
