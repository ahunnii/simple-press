"use client";

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

const TOPICS = ["General", "Press", "Commission", "Wholesale", "Visit the atelier"] as const;

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

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  if (isSuccess) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-6 py-16 text-center border border-foreground"
        style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
      >
        <div
          className="font-serif italic leading-none"
          style={{ fontSize: "48px", opacity: 0.3 }}
        >
          ✓
        </div>
        <div>
          <p
            className="font-serif italic leading-none"
            style={{ fontSize: "28px", letterSpacing: "-0.01em" }}
          >
            Transmission sent.
          </p>
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
          className="vn-stamp text-[9.5px] cursor-pointer transition-all hover:opacity-70"
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
      <div
        className="flex items-end justify-between border-b border-foreground mb-8 pb-5"
      >
        <h2
          className="font-serif italic leading-none tracking-tight"
          style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)", letterSpacing: "-0.02em" }}
        >
          Open a channel.
        </h2>
        <span
          className="font-mono text-[9px] tracking-[0.16em] uppercase text-right hidden sm:block"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          Form / TRX-04
        </span>
      </div>

      {/* Topic pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TOPICS.map((topic) => (
          <span
            key={topic}
            className="vn-stamp text-[9.5px] cursor-default"
            style={{ opacity: 0.6 }}
          >
            {topic}
          </span>
        ))}
      </div>

      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-7"
        >
          {error && (
            <Alert variant="destructive" className="rounded-none border-destructive">
              <AlertDescription className="font-mono text-[10px] tracking-[0.14em] uppercase">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Name + Email */}
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
            <div>
              <span className="vn-field-label">Name</span>
              <InputFormField
                form={form}
                name="name"
                label=""
                placeholder="First & last"
                required
                className="flex flex-col gap-0"
              />
            </div>
            <div>
              <span className="vn-field-label">Email</span>
              <InputFormField
                form={form}
                name="email"
                label=""
                type="email"
                placeholder="frequency@email.com"
                required
                className="flex flex-col gap-0"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <span className="vn-field-label">Phone (optional)</span>
            <PhoneFormField
              form={form}
              name="phone"
              label=""
              className="flex flex-col gap-0"
            />
          </div>

          {/* Message */}
          <div>
            <span className="vn-field-label">Message</span>
            <TextareaFormField
              form={form}
              name="message"
              label=""
              placeholder="Say it loud. We can take it."
              required
              messageLength={messageLength}
              maxLength={messageMaxLength}
              className="flex flex-col gap-0"
            />
          </div>

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
              className="font-mono text-[9px] tracking-[0.14em] uppercase hidden sm:block"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              By sending you agree to our reply landing in the same inbox.
            </p>
            <button
              type="submit"
              disabled={isSubmitting || !captchaToken}
              className="flex items-center justify-between gap-10 px-5 py-4 font-mono text-[11px] tracking-[0.24em] uppercase transition-all disabled:opacity-40 flex-shrink-0"
              style={{ background: "var(--vn-ink)", color: "var(--vn-bone)", minWidth: "240px" }}
            >
              <span className="flex items-center gap-2">
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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
