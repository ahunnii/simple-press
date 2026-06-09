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
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type Props = {
  formTitle: string;
};

export function SledgeContactForm({ formTitle }: Props) {
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

  // S-12: focus the success heading when isSuccess becomes true
  const successRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isSuccess && successRef.current) {
      successRef.current.focus();
    }
  }, [isSuccess]);

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        {/* S-12: h2 (form title is h2 context); focus on success; C-3: large heading → AA accent token */}
        <h2
          ref={successRef}
          tabIndex={-1}
          className="sl-page-title-md font-heading text-[var(--sl-coral-aa)] uppercase outline-none"
        >
          Message sent!
        </h2>
        <p className="sl-eyebrow text-sm leading-[1.7]">
          Thank you for reaching out. We&apos;ll get back to you soon.
        </p>
        <button
          type="button"
          onClick={resetSuccess}
          className="sl-btn mt-2 cursor-pointer text-xs"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* C-3: form heading is large (sl-rail-heading ≥24px) → AA accent token */}
      <h2 className="sl-rail-heading font-heading mb-8 font-semibold text-[var(--sl-coral-aa)] uppercase">
        {formTitle}
      </h2>

      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          {error && (
            <Alert variant="destructive" className="rounded-sm">
              <AlertDescription className="text-xs tracking-wider uppercase">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <InputFormField
            form={form}
            name="name"
            label="Name"
            labelClassName="text-xs font-medium uppercase tracking-[0.2em] text-(--sl-ink)"
            placeholder="E.g. John Doe"
            required
            className="flex flex-col gap-2"
          />
          <InputFormField
            form={form}
            name="email"
            label="Email Address"
            labelClassName="text-xs font-medium uppercase tracking-[0.2em] text-(--sl-ink)"
            type="email"
            placeholder="E.g. john@doe.com"
            required
            className="flex flex-col gap-2"
          />
          <TextareaFormField
            form={form}
            name="message"
            label="Message"
            labelClassName="text-xs font-medium uppercase tracking-[0.2em] text-(--sl-ink)"
            placeholder="E.g. Your work is awesome!"
            required
            messageLength={messageLength}
            maxLength={messageMaxLength}
            className="flex flex-col gap-2"
          />

          <HCaptchaField
            ref={captchaRef}
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
              className="sl-btn cursor-pointer disabled:opacity-40"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Sending…" : "Send Message"}
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
}
