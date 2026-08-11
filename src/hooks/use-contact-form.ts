"use client";

import type { Resolver } from "react-hook-form";
import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { RecaptchaHandle } from "~/components/inputs/recaptcha-field";
import { useRecaptchaV3 } from "~/lib/captcha/use-recaptcha-v3";
import type { ContactFormData } from "~/lib/validators/contact";
import { contactFormSchema } from "~/lib/validators/contact";
import { api } from "~/trpc/react";

/** reCAPTCHA v3 action asserted server-side for every contact-family form. */
const RECAPTCHA_ACTION = "contact";

type UseContactFormOptions = {
  messageMaxLength?: number;
};

/** Form field values (matches ContactFormValues from validators). */
type FormValues = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  preferredContactMethod: "email" | "phone" | "no-preference";
};

const DEFAULT_MESSAGE_MAX_LENGTH = 180;

export function useContactForm(options: UseContactFormOptions = {}) {
  const messageMaxLength =
    options.messageMaxLength ?? DEFAULT_MESSAGE_MAX_LENGTH;

  const schema = contactFormSchema(messageMaxLength);

  const captchaRef = useRef<RecaptchaHandle>(null);
  const { execute: executeRecaptcha } = useRecaptchaV3();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
      preferredContactMethod: "no-preference",
    },
  });

  const { mutate, isPending } = api.contact.send.useMutation({
    onSuccess: ({ message }) => {
      toast.dismiss();
      toast.success(message);
      setIsSuccess(true);
      setCaptchaToken("");
      const handle = captchaRef.current;
      if (handle) void handle.reset();
      form.reset();
    },
    onError: (err: { message?: string }) => {
      toast.dismiss();
      const errorMessage = err.message ?? "Something went wrong. Please try again.";
      toast.error(errorMessage);
      setError(errorMessage);
      const handle = captchaRef.current;
      if (handle) void handle.reset();
      setCaptchaToken("");
    },
    onMutate: () => toast.loading("Sending message..."),
  });

  const messageLength =
    (form.watch("message") as string | undefined)?.length ?? 0;

  const onSubmit = async (data: FormValues) => {
    // Mint a fresh token at submit time rather than trusting whatever was
    // staged on mount/refresh — v3 tokens are single-use and expire after
    // 120s, so a token minted when the form first rendered may be stale by
    // the time a user finishes typing. Minted via `useRecaptchaV3` directly
    // (not through `captchaRef`) so this hook is self-sufficient: pages that
    // render no `RecaptchaField` at all (e.g. `CoopContactPage`, which has no
    // captcha widget by design) still get a correctly-actioned token instead
    // of silently submitting empty. Falls back to whatever was last staged
    // in state only if the fresh mint fails (e.g. transient network error).
    const freshToken = await executeRecaptcha(RECAPTCHA_ACTION);
    const tokenToSend = freshToken ?? captchaToken;

    setError(null);
    const payload: ContactFormData = {
      name: data.name,
      email: data.email,
      message: data.message,
      phone: data.phone,
      preferredContactMethod: data.preferredContactMethod,
      captchaToken: tokenToSend,
    };
    mutate(payload);
  };

  const resetSuccess = () => {
    setIsSuccess(false);
  };

  const isDirty = form.formState.isDirty;

  return {
    form,
    messageLength,
    messageMaxLength,
    isSubmitting: isPending,
    isSuccess,
    error,
    captchaToken,
    setCaptchaToken,
    captchaRef,
    onSubmit,
    formRef,
    resetSuccess,
    isDirty,
  };
}
