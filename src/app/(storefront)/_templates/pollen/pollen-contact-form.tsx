"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

type Props = {
  businessName: string;
};

export function PollenContactForm({ businessName: _businessName }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle className="h-5 w-5 text-green-400" />
        <AlertDescription className="text-green-400">
          <strong>Message sent successfully!</strong>
          <br />
          We&apos;ve received your message and will get back to you soon.
        </AlertDescription>
        <Button
          onClick={() => setIsSuccess(false)}
          className="mt-4 border border-white/60 bg-transparent font-medium text-white hover:bg-white/10"
        >
          Send Another Message
        </Button>
      </Alert>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert
          variant="destructive"
          className="border-red-500/50 bg-red-500/10"
        >
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="name" className="text-white">
          Full Name *
        </Label>
        <p className="mb-2 text-sm text-white/60">
          Please enter your full name
        </p>
        <Input
          id="name"
          {...form.register("name")}
          placeholder="E.g. John Doe"
          className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
        />
        {form.formState.errors.name && (
          <p className="mt-1 text-sm text-red-400">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="email" className="text-white">
          Email Address *
        </Label>
        <p className="mb-2 text-sm text-white/60">
          Enter a valid email address to receive updates
        </p>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="E.g. john@doe.com"
          className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40 focus:border-purple-500"
        />
        {form.formState.errors.email && (
          <p className="mt-1 text-sm text-red-400">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="phone" className="text-white">
          Phone
        </Label>
        <p className="mb-2 text-sm text-white/60">
          Optional. Provide your phone number for quicker responses.
        </p>
        <Input
          id="phone"
          type="tel"
          {...form.register("phone")}
          placeholder="E.g. +1 300 555 0000"
          className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
        />
      </div>

      <div>
        <Label htmlFor="message" className="text-white">
          Message *
        </Label>
        <p className="mb-2 text-sm text-white/60">
          Tell us what&apos;s on your mind
        </p>
        <Textarea
          id="message"
          {...form.register("message")}
          placeholder="E.g. Hey, how are you?"
          rows={6}
          className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
        />
        {form.formState.errors.message && (
          <p className="mt-1 text-sm text-red-400">
            {form.formState.errors.message.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-violet-500 px-8 py-6 text-sm font-semibold tracking-wider text-white uppercase hover:bg-violet-600"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Sending...
          </>
        ) : (
          "Submit"
        )}
      </Button>
    </form>
  );
}
