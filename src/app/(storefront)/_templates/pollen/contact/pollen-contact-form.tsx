"use client";

import { Loader2 } from "lucide-react";

import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { HCaptchaField } from "~/components/inputs/hcaptcha-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { RadioFormField } from "~/components/inputs/radio-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type Props = {
  businessName: string;
  formTitle?: string;
  formDescription?: string;
};

const inputClassName =
  "w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#215935] focus:ring-[#215935]/20";
const labelClassName = "text-sm font-medium text-gray-900";

export function PollenContactForm({
  businessName: _businessName,
  formTitle = "Send us a message",
  formDescription = "We'd love to hear from you!",
}: Props) {
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
  } = useContactForm({ messageMaxLength: 180 });

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <div>
          <h2 className="text-xl font-bold text-gray-900 md:text-2xl">
            {formTitle}
          </h2>
          <p className="mt-1 text-sm text-gray-600">{formDescription}</p>
        </div>

        {error && (
          <Alert
            variant="destructive"
            className="border-red-500/50 bg-red-500/10"
          >
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <InputFormField
          form={form}
          name="name"
          label="First Name *"
          labelClassName={labelClassName}
          inputClassName={inputClassName}
          placeholder="e.g. John"
          required
        />

        <InputFormField
          form={form}
          name="email"
          label="Email Address *"
          labelClassName={labelClassName}
          inputClassName={inputClassName}
          type="email"
          placeholder="e.g. john@example.com"
          required
        />

        <InputFormField
          form={form}
          name="phone"
          label="Phone Number (Optional)"
          labelClassName={labelClassName}
          inputClassName={inputClassName}
          type="tel"
          placeholder="e.g. +1 234 567 8900"
        />

        <TextareaFormField
          form={form}
          name="message"
          label="Message *"
          messageLength={messageLength}
          labelClassName={labelClassName}
          textareaClassName={`resize-y ${inputClassName} min-h-[120px]`}
          maxLength={messageMaxLength}
          placeholder="e.g. I have a question about your product."
          required
        />

        <RadioFormField
          form={form}
          name="preferredContactMethod"
          label="Preferred Contact Method"
          labelClassName={labelClassName}
          radioGroupClassName="flex flex-col gap-3 pt-1"
          options={[
            {
              label: "Email",
              value: "email",
              className: "text-sm text-gray-900",
            },
            {
              label: "Phone",
              value: "phone",
              className: "text-sm text-gray-900",
            },
            {
              label: "No Preference",
              value: "no-preference",
              className: "text-sm text-gray-900",
            },
          ]}
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
          className="rounded-md bg-[#215935] px-6 py-2.5 font-semibold text-white hover:bg-[#1a4729]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
