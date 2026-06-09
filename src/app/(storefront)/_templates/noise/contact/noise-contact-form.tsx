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

export function NoiseContactForm() {
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
        className="border-foreground flex flex-col items-center justify-center gap-6 border py-16 text-center"
        style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
      >
        <div
          aria-hidden="true"
          className="font-serif leading-none italic"
          style={{ fontSize: "48px", opacity: 0.3 }}
        >
          ✓
        </div>
        <div>
          <h2
            ref={successHeadingRef}
            tabIndex={-1}
            className="font-serif leading-none italic"
            style={{ fontSize: "28px", letterSpacing: "-0.01em" }}
          >
            Message sent!
          </h2>
          <p
            className="mt-2 font-mono text-[10px] tracking-[0.2em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            We&apos;ll reply, usually same day.
          </p>
        </div>
        <button
          type="button"
          onClick={resetSuccess}
          className="vn-focus-on-dark vn-stamp cursor-pointer text-[9.5px] transition-all hover:opacity-70"
          style={{ borderColor: "var(--vn-bone)", color: "var(--vn-bone)" }}
        >
          Send another →
        </button>
      </div>
    );
  }

  return (
    <div className="vn-contact-form">
      {/* Form header */}
      <div className="border-foreground mb-8 flex items-end justify-between border-b pb-5">
        <h2
          className="font-serif leading-none tracking-tight italic"
          style={{
            fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
            letterSpacing: "-0.02em",
          }}
        >
          Send a message.
        </h2>
      </div>

      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-7"
        >
          {error && (
            <Alert
              variant="destructive"
              className="border-destructive rounded-none"
            >
              <AlertDescription className="font-mono text-[10px] tracking-[0.14em] uppercase">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Name + Email */}
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
            <InputFormField
              form={form}
              name="name"
              label="Name"
              labelClassName="vn-field-label"
              placeholder="First & last"
              required
              className="flex flex-col gap-0"
            />
            <InputFormField
              form={form}
              name="email"
              label="Email"
              labelClassName="vn-field-label"
              type="email"
              placeholder="frequency@email.com"
              required
              className="flex flex-col gap-0"
            />
          </div>

          {/* Phone */}
          <PhoneFormField
            form={form}
            name="phone"
            label="Phone (optional)"
            labelClassName="vn-field-label"
            className="flex flex-col gap-0"
          />

          {/* Message */}
          <TextareaFormField
            form={form}
            name="message"
            label="Message"
            labelClassName="vn-field-label"
            placeholder="Say it loud. We can take it."
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
          <div className="flex items-center justify-between gap-4">
            <p
              className="hidden font-mono text-[9px] tracking-[0.14em] uppercase sm:block"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              By sending you agree to our reply landing in the same inbox.
            </p>
            <button
              type="submit"
              disabled={isSubmitting || !captchaToken}
              className="flex shrink-0 items-center justify-between gap-10 px-5 py-4 font-mono text-[11px] tracking-[0.24em] uppercase transition-all disabled:opacity-40"
              style={{
                background: "var(--vn-ink)",
                color: "var(--vn-bone)",
                minWidth: "240px",
              }}
            >
              <span className="flex items-center gap-2">
                {isSubmitting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {isSubmitting ? "Sending…" : "Send transmission"}
              </span>
              <span>→</span>
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
}
