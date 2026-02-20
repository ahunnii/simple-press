"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, CheckCircle2, Loader2 } from "lucide-react";
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

export function ModernContactForm() {
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
      <div className="mt-8 flex flex-col items-center gap-4 py-12 text-center">
        <div className="bg-accent/10 flex h-12 w-12 items-center justify-center rounded-full">
          <CheckCircle2 className="text-accent h-6 w-6" />
        </div>
        <h3 className="text-foreground font-serif text-xl">Message received</h3>
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
          Thank you for reaching out. We&apos;ll get back to you within 24
          hours.
        </p>
        <button
          type="button"
          onClick={() => setIsSuccess(false)}
          className="text-accent hover:text-accent/80 mt-2 text-sm font-medium underline underline-offset-4 transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mt-8 flex flex-col gap-6"
    >
      {error && (
        <Alert
          variant="destructive"
          className="border-red-500/50 bg-red-500/10"
        >
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="firstName"
          className="text-foreground text-xs font-semibold tracking-widest uppercase"
        >
          Full Name
        </Label>
        <Input
          id="firstName"
          {...form.register("name")}
          required
          placeholder="Jane"
          className="bg-background"
        />
        {form.formState.errors.name && (
          <p className="mt-1 text-sm text-red-400">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="text-foreground text-xs font-semibold tracking-widest uppercase"
        >
          Email
        </Label>
        <Input
          id="email"
          {...form.register("email")}
          type="email"
          required
          placeholder="jane@example.com"
          className="bg-background"
        />{" "}
        {form.formState.errors.email && (
          <p className="mt-1 text-sm text-red-400">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="text-foreground text-xs font-semibold tracking-widest uppercase"
        >
          Email
        </Label>
        <Input
          id="email"
          {...form.register("phone")}
          type="tel"
          required
          placeholder="E.g. +1 300 555 0000"
          className="bg-background"
        />{" "}
        {form.formState.errors.phone && (
          <p className="mt-1 text-sm text-red-400">
            {form.formState.errors.phone.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="message"
          className="text-foreground text-xs font-semibold tracking-widest uppercase"
        >
          Message
        </Label>
        <Textarea
          id="message"
          {...form.register("message")}
          required
          rows={5}
          placeholder="Tell us how we can help..."
          className="bg-background resize-none"
        />{" "}
        {form.formState.errors.message && (
          <p className="mt-1 text-sm text-red-400">
            {form.formState.errors.message.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground hover:bg-primary/90 w-full md:w-auto md:px-10"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Sending...
          </>
        ) : (
          "Send Message"
        )}
      </Button>
    </form>
  );
}
