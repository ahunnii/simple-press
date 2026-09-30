"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Form } from "~/components/ui/form";
import { InputFormField } from "~/components/inputs/input-form-field";
import { RecaptchaField } from "~/components/inputs/recaptcha-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

type ElegantContactFormProps = {
  /** Resolved `elegant.contact.form-success-heading`; blank hides it. */
  successHeading: string;
  /** Resolved `elegant.contact.form-success-body`; blank hides it. */
  successBody: string;
  /** Resolved `elegant.contact.form-reset-label` (never blank). */
  resetLabel: string;
  /** Resolved `elegant.contact.form-button-label` (never blank). */
  buttonLabel: string;
};

export function ElegantContactForm({
  successHeading,
  successBody,
  resetLabel,
  buttonLabel,
}: ElegantContactFormProps) {
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

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  // Focus moves to the success heading, or to the panel itself when the
  // owner has blanked the heading, so screen readers hear the outcome.
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const successPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isSuccess) {
      (successHeadingRef.current ?? successPanelRef.current)?.focus();
    }
  }, [isSuccess]);

  const { isEnabled } = useStorefrontFlags();
  if (!isEnabled("contactForm")) return null;

  if (isSuccess) {
    return (
      <div
        ref={successPanelRef}
        tabIndex={successHeading ? undefined : -1}
        className="el-contact-success"
      >
        <div className="el-contact-success-icon" aria-hidden="true">
          <CheckCircle2 style={{ width: 22, height: 22 }} />
        </div>
        {successHeading ? (
          <h3
            ref={successHeadingRef}
            tabIndex={-1}
            className="el-contact-success-heading"
            {...fieldAttr("elegant.contact.form-success-heading")}
          >
            {successHeading}
          </h3>
        ) : null}
        {successBody ? (
          <p
            className="el-contact-success-body"
            {...fieldAttr("elegant.contact.form-success-body")}
          >
            {successBody}
          </p>
        ) : null}
        <button
          type="button"
          onClick={resetSuccess}
          className="el-contact-success-btn"
          {...fieldAttr("elegant.contact.form-reset-label")}
        >
          {resetLabel}
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
      >
        <span className="sr-only">
          Fields marked with an asterisk (*) are required.
        </span>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <InputFormField
          form={form}
          name="name"
          label="Name *"
          className="flex flex-col gap-1.5"
          labelClassName="text-muted-foreground text-sm"
          placeholder="Jane Doe"
          required
        />

        <InputFormField
          form={form}
          name="email"
          label="Email *"
          className="flex flex-col gap-1.5"
          labelClassName="text-muted-foreground text-sm"
          type="email"
          placeholder="jane@example.com"
          required
        />

        <InputFormField
          form={form}
          name="phone"
          label="Phone (optional)"
          className="flex flex-col gap-1.5"
          labelClassName="text-muted-foreground text-sm"
          type="tel"
          placeholder="+1 555 123 4567"
        />

        <TextareaFormField
          form={form}
          name="message"
          label="Message *"
          className="flex flex-col gap-1.5"
          labelClassName="text-muted-foreground text-sm"
          textareaClassName="resize-none"
          messageLength={messageLength}
          maxLength={messageMaxLength}
          placeholder="How can we help you?"
          required
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
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px 26px",
            borderRadius: 999,
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 500,
            background: "var(--el-ink, #1c1a17)",
            color: "var(--el-paper, #fbf8f2)",
            border: "none",
            cursor: isSubmitting || !captchaToken ? "not-allowed" : "pointer",
            opacity: isSubmitting || !captchaToken ? 0.5 : 1,
            fontFamily: "var(--font-sans, sans-serif)",
            width: "100%",
            transition: "background 0.4s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 aria-hidden={true} className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <span {...fieldAttr("elegant.contact.form-button-label")}>
              {buttonLabel}
            </span>
          )}
        </button>
      </form>
    </Form>
  );
}
