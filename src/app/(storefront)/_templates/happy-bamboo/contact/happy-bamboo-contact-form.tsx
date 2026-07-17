"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Form } from "~/components/ui/form";
import { HCaptchaField } from "~/components/inputs/hcaptcha-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { PhoneFormField } from "~/components/inputs/phone-form-field";
import { RadioFormField } from "~/components/inputs/radio-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

const IS_IN_PRODUCTION = process.env.NODE_ENV === "production";

export function HappyBambooContactForm() {
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
      <Card className="border-primary/20 bg-primary/5" role="status">
        <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
          <div className="bg-primary/10 flex size-16 items-center justify-center rounded-full">
            <CheckCircle2 className="text-primary size-8" aria-hidden="true" />
          </div>
          <h2
            ref={successHeadingRef}
            tabIndex={-1}
            className="text-foreground font-heading text-xl font-semibold"
          >
            Message Sent
          </h2>
          <p className="text-muted-foreground">
            Thank you for reaching out. We will get back to you within 1-2
            business days.
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

        <PhoneFormField
          form={form}
          name="phone"
          label="Phone Number"
          className="flex flex-col gap-1.5"
          placeholder="+1 300 555 0000"
          autoComplete="tel"
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

        <RadioFormField
          form={form}
          name="preferredContactMethod"
          label="Preferred Contact Method"
          defaultValue="no-preference"
          options={[
            { label: "Email", value: "email" },
            { label: "Phone", value: "phone" },
            { label: "No Preference", value: "no-preference" },
          ]}
          className="flex flex-col gap-1.5"
          radioGroupClassName="flex flex-col gap-3 pt-1"
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
          size="lg"
          disabled={isSubmitting || (!captchaToken && IS_IN_PRODUCTION)}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
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
