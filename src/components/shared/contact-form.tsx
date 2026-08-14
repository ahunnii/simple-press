"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Form } from "~/components/ui/form";
import { InputFormField } from "~/components/inputs/input-form-field";
import { RecaptchaField } from "~/components/inputs/recaptcha-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

export function DefaultContactForm({
  successMessage,
}: {
  successMessage?: string;
}) {
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

  if (isSuccess) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
          <div className="bg-primary/10 flex size-16 items-center justify-center rounded-full">
            <CheckCircle2 className="text-primary size-8" />
          </div>
          <h2 className="text-foreground font-heading text-xl font-semibold">
            Message Sent
          </h2>
          <p className="text-muted-foreground">
            {!!successMessage ? (
              successMessage
            ) : (
              <>
                Thank you for reaching out. We will get back to you within 1-2
                business days.
              </>
            )}
          </p>
          <Button variant="outline" onClick={resetSuccess} className="mt-2">
            Send Another Message
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-5"
      >
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <InputFormField
            form={form}
            name="name"
            label="Name"
            className="col-span-1 flex flex-col gap-1.5"
            placeholder="Jane"
            required
          />

          <InputFormField
            form={form}
            name="email"
            label="Email"
            className="col-span-1 flex flex-col gap-1.5"
            type="email"
            placeholder="jane@example.com"
            required
          />
        </div>

        <InputFormField
          form={form}
          name="phone"
          label="Phone Number"
          className="flex flex-col gap-1.5"
          type="tel"
          placeholder="+1 300 555 0000"
        />

        <TextareaFormField
          form={form}
          name="message"
          label="Message"
          messageLength={messageLength}
          className="flex flex-col gap-1.5"
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
          size="lg"
          disabled={isSubmitting || !captchaToken}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
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
