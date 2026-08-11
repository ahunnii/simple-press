"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Form } from "~/components/ui/form";
import { RecaptchaField } from "~/components/inputs/recaptcha-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { PhoneFormField } from "~/components/inputs/phone-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

const LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--builders-muted)]";
const BODY_FONT = "var(--font-builders-body, 'Agdasima', sans-serif)";

export function BuildersContactForm() {
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
  } = useContactForm({ messageMaxLength: 500 });

  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isSuccess) {
      successHeadingRef.current?.focus();
    }
  }, [isSuccess]);

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  const { isEnabled } = useStorefrontFlags();
  if (!isEnabled("contactForm")) return null;

  if (isSuccess) {
    return (
      <div
        role="status"
        className="flex flex-col items-center justify-center gap-6 border py-16 text-center"
        style={{
          background: "var(--builders-accent, #FFC5B6)",
          borderColor: "var(--builders-accent, #FFC5B6)",
          color: "var(--builders-accent-ink, #31130A)",
        }}
      >
        <div aria-hidden="true" className="text-5xl font-light opacity-40">
          ✓
        </div>
        <div>
          <h2
            ref={successHeadingRef}
            tabIndex={-1}
            className="text-2xl font-light uppercase"
            style={{
              fontFamily: "var(--font-builders-display, 'Jost', sans-serif)",
            }}
          >
            Message sent!
          </h2>
          <p
            className="mt-2 text-xs tracking-widest uppercase"
            style={{ fontFamily: BODY_FONT }}
          >
            We&apos;ll be in touch soon.
          </p>
        </div>
        <button
          type="button"
          onClick={resetSuccess}
          className="cursor-pointer border border-current px-6 py-2 text-[11px] tracking-[0.1em] uppercase transition-opacity hover:opacity-70"
          style={{ fontFamily: BODY_FONT }}
        >
          Send another →
        </button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-8"
      >
        {error && (
          <Alert variant="destructive" className="rounded-none">
            <AlertDescription
              className="text-xs tracking-[0.1em] uppercase"
              style={{ fontFamily: BODY_FONT }}
            >
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Name + Email */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <InputFormField
            form={form}
            name="name"
            label="Name"
            labelClassName={LABEL_CLASS}
            placeholder="Your name"
            required
            className="flex flex-col gap-2"
          />
          <InputFormField
            form={form}
            name="email"
            label="Email Address"
            labelClassName={LABEL_CLASS}
            type="email"
            placeholder="you@example.com"
            required
            className="flex flex-col gap-2"
          />
        </div>

        {/* Phone */}
        <PhoneFormField
          form={form}
          name="phone"
          label="Phone (optional)"
          labelClassName={LABEL_CLASS}
          className="flex flex-col gap-2"
        />

        {/* Message */}
        <TextareaFormField
          form={form}
          name="message"
          label="Message"
          labelClassName={LABEL_CLASS}
          placeholder="Tell us about your project..."
          required
          messageLength={messageLength}
          maxLength={messageMaxLength}
          className="flex flex-col gap-2"
        />

        {/* reCAPTCHA */}
        <RecaptchaField
          ref={captchaRef}
          action="contact"
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken("")}
          onError={() => setCaptchaToken("")}
          label="Verification"
          required
        />

        {/* Submit */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting || !captchaToken}
            className="flex items-center gap-3 px-8 py-4 text-xs tracking-widest uppercase transition-colors disabled:opacity-40"
            style={{
              fontFamily: BODY_FONT,
              background: "var(--builders-accent, #FFC5B6)",
              color: "var(--builders-accent-ink, #31130A)",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting && captchaToken) {
                e.currentTarget.style.background =
                  "var(--builders-accent-hover, #F2B9AB)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                "var(--builders-accent, #FFC5B6)";
            }}
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isSubmitting ? "Sending…" : "Send Message"}
          </button>
        </div>
      </form>
    </Form>
  );
}
