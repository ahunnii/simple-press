"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Form } from "~/components/ui/form";
import { HCaptchaField } from "~/components/inputs/hcaptcha-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

export function ElegantContactForm() {
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

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <CheckCircle2 className="h-7 w-7 text-foreground" />
        </div>
        <h3 className="font-serif text-xl font-light tracking-wide text-foreground">
          Message received
        </h3>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Thank you for reaching out. We&apos;ll get back to you within 24
          hours.
        </p>
        <button
          type="button"
          onClick={resetSuccess}
          className="mt-2 text-sm text-foreground underline underline-offset-4 hover:text-muted-foreground"
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
        className="flex flex-col gap-5"
      >
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

        <HCaptchaField
          ref={captchaRef}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken("")}
          onError={() => setCaptchaToken("")}
          label="Verification"
          required
        />

        <button
          type="submit"
          disabled={isSubmitting || !captchaToken}
          className="boty-transition boty-shadow inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send Message"
          )}
        </button>
      </form>
    </Form>
  );
}
