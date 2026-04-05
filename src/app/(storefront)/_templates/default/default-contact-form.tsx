"use client";

import { CheckCircle, Loader2, Send } from "lucide-react";

import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { HCaptchaField } from "~/components/inputs/hcaptcha-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { PhoneFormField } from "~/components/inputs/phone-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

export function DefaultContactForm() {
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
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Message sent successfully!</strong>
          <br />
          We&apos;ve received your message and will get back to you soon.
        </AlertDescription>
        <Button variant="outline" onClick={resetSuccess} className="mt-4">
          Send Another Message
        </Button>
      </Alert>
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
          label="First Name *"
          inputClassName={"mt-2"}
          placeholder="Jane"
          required
        />

        <InputFormField
          form={form}
          name="email"
          label="Email *"
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
          label="Message *"
          messageLength={messageLength}
          textareaClassName={"mt-2"}
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
          size="lg"
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-5 w-5" />
              Send Message
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
