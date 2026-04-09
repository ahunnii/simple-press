"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { HCaptchaField } from "~/components/inputs/hcaptcha-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { PhoneFormField } from "~/components/inputs/phone-form-field";
import { RadioFormField } from "~/components/inputs/radio-form-field";
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
  } = useContactForm({ messageMaxLength: 200 });

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  if (isSuccess) {
    return (
      <div className="border border-border p-10 text-center">
        <div className="flex justify-center">
          <CheckCircle2 className="h-10 w-10 text-foreground/50" />
        </div>
        <p className="mt-4 font-serif text-2xl font-light text-foreground">
          Message Sent
        </p>
        <p className="mt-2 font-sans text-sm text-muted-foreground">
          We&apos;ll be in touch soon.
        </p>
        <button
          type="button"
          onClick={resetSuccess}
          className="mt-6 font-sans text-[10px] tracking-[0.25em] uppercase text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
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
        className="flex flex-col gap-6"
      >
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="font-sans text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <InputFormField
          form={form}
          name="name"
          label="Name"
          placeholder="Your name"
          required
          className="flex flex-col gap-1.5"
        />

        <InputFormField
          form={form}
          name="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          required
          className="flex flex-col gap-1.5"
        />

        <PhoneFormField
          form={form}
          name="phone"
          label="Phone (optional)"
          className="flex flex-col gap-1.5"
        />

        <TextareaFormField
          form={form}
          name="message"
          label="Message"
          placeholder="Tell us about your inquiry..."
          required
          messageLength={messageLength}
          maxLength={messageMaxLength}
          className="flex flex-col gap-1.5"
        />

        <RadioFormField
          form={form}
          name="preferredContactMethod"
          label="Preferred contact method"
          options={[
            { label: "Email", value: "email" },
            { label: "Phone", value: "phone" },
            { label: "No Preference", value: "no-preference" },
          ]}
          defaultValue="no-preference"
          className="flex flex-col gap-1.5"
        />

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
          className="w-full rounded-none font-sans text-[10px] tracking-[0.25em] uppercase"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send Message"
          )}
        </Button>
      </form>
    </Form>
  );
}
