"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Form } from "~/components/ui/form";
import { HCaptchaField } from "~/components/inputs/hcaptcha-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { PhoneFormField } from "~/components/inputs/phone-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type Props = {
  heading: string;
};

export function ViiContactForm({ heading }: Props) {
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
  } = useContactForm({ messageMaxLength: 400 });

  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isSuccess) {
      successHeadingRef.current?.focus();
    }
  }, [isSuccess]);

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  if (isSuccess) {
    return (
      <div
        role="status"
        className="flex flex-col items-center justify-center gap-6 py-16 text-center"
        style={{
          background: "var(--vii-navy)",
          color: "var(--vii-paper)",
          borderRadius: "var(--radius)",
        }}
      >
        <div
          aria-hidden="true"
          className="leading-none"
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "48px",
            color: "var(--vii-copper-light)",
          }}
        >
          ✓
        </div>
        <div>
          <h3
            ref={successHeadingRef}
            tabIndex={-1}
            className="leading-none"
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "28px",
              color: "var(--vii-paper)",
            }}
          >
            Message sent
          </h3>
          <p
            className="mt-3 text-[11px] uppercase"
            style={{
              fontFamily: "var(--font-sans)",
              letterSpacing: "0.18em",
              color: "var(--vii-tan)",
            }}
          >
            We&apos;ll be in touch shortly.
          </p>
        </div>
        <button
          type="button"
          onClick={resetSuccess}
          className="cursor-pointer text-[11px] uppercase transition-opacity hover:opacity-70"
          style={{
            fontFamily: "var(--font-sans)",
            letterSpacing: "0.18em",
            color: "var(--vii-paper)",
            borderBottom: "1px solid var(--vii-copper-light)",
            paddingBottom: 2,
          }}
        >
          Send another →
        </button>
      </div>
    );
  }

  return (
    <div className="vii-contact-form">
      <h2
        className="mb-8"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 400,
          fontStyle: "italic",
          fontSize: "clamp(26px, 3.2vw, 38px)",
          lineHeight: 1.1,
          color: "var(--vii-navy)",
        }}
      >
        {heading}
      </h2>

      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-7"
        >
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Name + Email */}
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
            <InputFormField
              form={form}
              name="name"
              label="Name"
              labelClassName="vii-field-label"
              placeholder="First & last"
              required
              className="flex flex-col gap-0"
            />
            <InputFormField
              form={form}
              name="email"
              label="Email"
              labelClassName="vii-field-label"
              type="email"
              placeholder="you@email.com"
              required
              className="flex flex-col gap-0"
            />
          </div>

          {/* Phone */}
          <PhoneFormField
            form={form}
            name="phone"
            label="Phone (optional)"
            labelClassName="vii-field-label"
            className="flex flex-col gap-0"
          />

          {/* Message */}
          <TextareaFormField
            form={form}
            name="message"
            label="Message"
            labelClassName="vii-field-label"
            placeholder="Tell us how we can help…"
            required
            messageLength={messageLength}
            maxLength={messageMaxLength}
            className="flex flex-col gap-0"
          />

          {/* Captcha */}
          <HCaptchaField
            ref={captchaRef}
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken("")}
            onError={() => setCaptchaToken("")}
            label="Verification"
            required
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !captchaToken}
            className="flex items-center justify-center gap-3 px-6 py-4 text-[12px] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{
              fontFamily: "var(--font-sans)",
              letterSpacing: "0.2em",
              background: "var(--vii-copper)",
              color: "var(--vii-paper)",
              borderRadius: "var(--radius)",
            }}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Sending…" : "Send message"}
          </button>
        </form>
      </Form>
    </div>
  );
}
