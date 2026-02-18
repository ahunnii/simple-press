"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Loader2 } from "lucide-react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";

const MESSAGE_MAX_LENGTH = 180;

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(MESSAGE_MAX_LENGTH, `Message must be at most ${MESSAGE_MAX_LENGTH} characters`),
  preferredContactMethod: z
    .enum(["email", "phone", "no-preference"])
    .default("no-preference"),
});

type ContactFormValues = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  preferredContactMethod: "email" | "phone" | "no-preference";
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema) as Resolver<ContactFormValues>,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
      preferredContactMethod: "no-preference",
    },
  });

  const messageLength = form.watch("message")?.length ?? 0;

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          message: data.message,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to send message");
      }

      setIsSuccess(true);
      form.reset();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Alert className="border-[#215935]/50 bg-[#215935]/10">
        <CheckCircle className="h-5 w-5 text-[#215935]" />
        <AlertDescription className="text-gray-800">
          <strong>Message sent successfully!</strong>
          <br />
          We&apos;ve received your message and will get back to you soon.
        </AlertDescription>
        <Button
          onClick={() => setIsSuccess(false)}
          className="mt-4 bg-[#215935] font-medium text-white hover:bg-[#1a4729]"
        >
          Send Another Message
        </Button>
      </Alert>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 md:text-2xl">
          {formTitle}
        </h2>
        <p className="mt-1 text-sm text-gray-600">{formDescription}</p>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="name" className={labelClassName}>
          First Name *
        </Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder=""
          className={inputClassName}
        />
        {form.formState.errors.name && (
          <p className="mt-1 text-sm text-red-600">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="email" className={labelClassName}>
          Email Address *
        </Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder=""
          className={inputClassName}
        />
        {form.formState.errors.email && (
          <p className="mt-1 text-sm text-red-600">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="phone" className={labelClassName}>
          Phone Number (Optional)
        </Label>
        <Input
          id="phone"
          type="tel"
          {...form.register("phone")}
          placeholder=""
          className={inputClassName}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="message" className={labelClassName}>
            Message *
          </Label>
          <span className="text-xs text-gray-500">
            {messageLength}/{MESSAGE_MAX_LENGTH}
          </span>
        </div>
        <Textarea
          id="message"
          {...form.register("message")}
          placeholder=""
          rows={5}
          maxLength={MESSAGE_MAX_LENGTH}
          className={`resize-y ${inputClassName} min-h-[120px]`}
        />
        {form.formState.errors.message && (
          <p className="mt-1 text-sm text-red-600">
            {form.formState.errors.message.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className={labelClassName}>Preferred Contact Method</Label>
        <p className="text-sm text-gray-600">
          Choose how you&apos;d like to be contacted.
        </p>
        <RadioGroup
          value={form.watch("preferredContactMethod")}
          onValueChange={(value) =>
            form.setValue(
              "preferredContactMethod",
              value as ContactFormValues["preferredContactMethod"],
            )
          }
          className="flex flex-col gap-3 pt-1"
        >
          <label className="flex cursor-pointer items-center gap-3">
            <RadioGroupItem value="email" id="pref-email" />
            <span className="text-sm text-gray-900">Email</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <RadioGroupItem value="phone" id="pref-phone" />
            <span className="text-sm text-gray-900">Phone</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <RadioGroupItem value="no-preference" id="pref-none" />
            <span className="text-sm text-gray-900">No Preference</span>
          </label>
        </RadioGroup>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
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
  );
}
