"use client";

import { useEffect, useRef } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { HCaptchaField } from "~/components/inputs/hcaptcha-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

export function DarkTrendContactForm() {
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

  // M-5: focus the success alert on mount
  const successAlertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isSuccess) {
      successAlertRef.current?.focus();
    }
  }, [isSuccess]);

  if (isSuccess) {
    return (
      <div ref={successAlertRef} tabIndex={-1}>
        <Alert className="border-purple-500/50 bg-purple-500/10">
          {/* N-1: decorative icon */}
          <CheckCircle aria-hidden="true" className="h-5 w-5 text-purple-400" />
          <AlertDescription className="text-purple-300">
            <strong>Message sent successfully!</strong>
            <br />
            We&apos;ve received your message and will get back to you soon.
          </AlertDescription>
          <Button
            onClick={resetSuccess}
            className="mt-4 border border-purple-400/60 bg-purple-950/60 font-medium text-purple-100 transition-colors hover:border-purple-300 hover:bg-purple-900/70"
          >
            Send Another Message
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
          <Alert
            variant="destructive"
            className="border-red-500/50 bg-red-500/10"
          >
            <AlertDescription className="text-red-400">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <InputFormField
          form={form}
          name="name"
          label="First Name *"
          className="flex flex-col gap-2"
          labelClassName={"text-white"}
          inputClassName={
            "border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
          }
          placeholder="E.g. John Doe"
          required
        />

        <InputFormField
          form={form}
          name="email"
          label="Email *"
          className="flex flex-col gap-2"
          labelClassName={"text-white"}
          inputClassName={
            "border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
          }
          type="email"
          placeholder="E.g. john@doe.com"
          required
        />

        <InputFormField
          form={form}
          name="phone"
          label="Phone Number (Optional)"
          className="flex flex-col gap-2"
          labelClassName={"text-white"}
          inputClassName={
            "border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
          }
          type="tel"
          placeholder="+1 300 555 0000"
        />

        <TextareaFormField
          form={form}
          name="message"
          label="Message *"
          messageLength={messageLength}
          labelClassName={"text-white"}
          textareaClassName={
            "border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
          }
          className="flex flex-col gap-2"
          maxLength={messageMaxLength}
          placeholder="I had a question about..."
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

        {/* S-11: violet-600; N-1: aria-hidden on Loader2 */}
        <Button
          type="submit"
          disabled={isSubmitting || !captchaToken}
          className="bg-violet-600 px-8 py-6 text-sm font-semibold tracking-wider text-white uppercase hover:bg-violet-700"
        >
          {isSubmitting ? (
            <>
              <Loader2
                aria-hidden="true"
                className="mr-2 h-5 w-5 animate-spin"
              />
              Sending...
            </>
          ) : (
            "Submit"
          )}
        </Button>
      </form>
    </Form>
  );
}
