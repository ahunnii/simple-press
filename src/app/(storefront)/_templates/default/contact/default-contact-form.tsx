"use client";

import { useEffect, useRef } from "react";
import { CheckCircle, Loader2, Send } from "lucide-react";

import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { InputFormField } from "~/components/inputs/input-form-field";
import { PhoneFormField } from "~/components/inputs/phone-form-field";
import { RecaptchaField } from "~/components/inputs/recaptcha-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import {
  DEFAULT_CONTACT_FORM_SUBMIT_LABEL,
  DEFAULT_CONTACT_FORM_SUCCESS_BODY,
  DEFAULT_CONTACT_FORM_SUCCESS_BUTTON,
  DEFAULT_CONTACT_FORM_SUCCESS_HEADING,
} from ".";

type DefaultContactFormProps = {
  /**
   * Resolved field strings, passed down from the server-rendered page (never
   * functions — this is a client component). Each falls back to the
   * template's built-in constant so the form renders identically before the
   * "contact.form" field group is wired into the root field map.
   */
  successHeading?: string;
  successBody?: string;
  successButtonText?: string;
  submitLabel?: string;
  /** `fieldAttr("default.contact.form-submit-label")` passthrough. */
  submitLabelAttrs?: Record<string, string>;
};

export function DefaultContactForm({
  successHeading = DEFAULT_CONTACT_FORM_SUCCESS_HEADING,
  successBody = DEFAULT_CONTACT_FORM_SUCCESS_BODY,
  successButtonText = DEFAULT_CONTACT_FORM_SUCCESS_BUTTON,
  submitLabel = DEFAULT_CONTACT_FORM_SUBMIT_LABEL,
  submitLabelAttrs,
}: DefaultContactFormProps) {
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

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSuccess && successRef.current) {
      successRef.current.focus();
    }
  }, [isSuccess]);

  const { isEnabled } = useStorefrontFlags();
  if (!isEnabled("contactForm")) return null;

  if (isSuccess) {
    return (
      <div ref={successRef} tabIndex={-1}>
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
          <AlertDescription className="text-green-800">
            <strong>{successHeading}</strong>
            <br />
            {successBody}
          </AlertDescription>
          <Button variant="outline" onClick={resetSuccess} className="mt-4">
            {successButtonText}
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <InputFormField
          form={form}
          name="name"
          label="Name"
          inputClassName={"mt-2"}
          placeholder="Jane"
          required
        />

        <InputFormField
          form={form}
          name="email"
          label="Email"
          inputClassName={"mt-2"}
          type="email"
          placeholder="jane@example.com"
          required
        />

        <PhoneFormField
          form={form}
          name="phone"
          label="Phone Number (Optional)"
          inputClassName={"mt-2"}
          // type="tel"
          placeholder="+1 300 555 0000"
        />

        <TextareaFormField
          form={form}
          name="message"
          label="Message"
          messageLength={messageLength}
          textareaClassName={"mt-2"}
          maxLength={messageMaxLength}
          placeholder="Tell us how we can help..."
          required
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

        <Button
          type="submit"
          disabled={isSubmitting || !captchaToken}
          size="lg"
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2
                className="mr-2 h-5 w-5 animate-spin"
                aria-hidden="true"
              />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-5 w-5" aria-hidden="true" />
              <span {...submitLabelAttrs}>{submitLabel}</span>
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
