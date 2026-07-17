"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { HCaptchaField } from "~/components/inputs/hcaptcha-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

export function ModernContactForm() {
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

  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isSuccess) {
      successHeadingRef.current?.focus();
    }
  }, [isSuccess]);

  const { isEnabled } = useStorefrontFlags();
  if (!isEnabled("contactForm")) return null;

  if (isSuccess) {
    return (
      <div
        role="status"
        className="mt-8 flex flex-col items-center gap-4 py-12 text-center"
      >
        <div className="bg-accent/10 flex h-12 w-12 items-center justify-center rounded-full">
          <CheckCircle2 className="text-accent h-6 w-6" aria-hidden="true" />
        </div>
        <h3
          ref={successHeadingRef}
          tabIndex={-1}
          className="text-foreground font-serif text-xl focus:outline-none"
        >
          Message received
        </h3>
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
          Thank you for reaching out. We&apos;ll get back to you within 24
          hours.
        </p>
        <button
          type="button"
          onClick={resetSuccess}
          className="text-accent hover:text-accent/80 mt-2 text-sm font-medium underline underline-offset-4 transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-8 flex flex-col gap-6"
      >
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <InputFormField
          form={form}
          name="name"
          label="First Name *"
          className="flex flex-col gap-2"
          labelClassName={
            "text-foreground text-xs font-semibold tracking-widest uppercase"
          }
          inputClassName={"bg-background"}
          placeholder="Jane"
          required
        />

        <InputFormField
          form={form}
          name="email"
          label="Email *"
          className="flex flex-col gap-2"
          labelClassName={
            "text-foreground text-xs font-semibold tracking-widest uppercase"
          }
          inputClassName={"bg-background"}
          type="email"
          placeholder="jane@example.com"
          required
        />

        <InputFormField
          form={form}
          name="phone"
          label="Phone Number (Optional)"
          className="flex flex-col gap-2"
          labelClassName={
            "text-foreground text-xs font-semibold tracking-widest uppercase"
          }
          inputClassName={"bg-background"}
          type="tel"
          placeholder="+1 300 555 0000"
        />

        <TextareaFormField
          form={form}
          name="message"
          label="Message *"
          messageLength={messageLength}
          labelClassName={
            "text-foreground text-xs font-semibold tracking-widest uppercase"
          }
          textareaClassName={"bg-background resize-none"}
          className="flex flex-col gap-2"
          maxLength={messageMaxLength}
          placeholder="Tell us how we can help..."
          required
        />

        {/* hCaptcha */}
        <HCaptchaField
          ref={captchaRef}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken("")}
          onError={() => setCaptchaToken("")}
          label="Verification"
          required
        />

        <Button
          type="submit"
          disabled={isSubmitting || !captchaToken}
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full md:w-auto md:px-10"
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
            "Send Message"
          )}
        </Button>
      </form>
    </Form>
  );
}
