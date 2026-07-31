"use client";

import type { Resolver } from "react-hook-form";
import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { HCaptchaHandle } from "~/components/inputs/hcaptcha-form-field";
import type { ContactFormData } from "~/lib/validators/contact";
import { contactFormSchema } from "~/lib/validators/contact";
import { api } from "~/trpc/react";

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

  const captchaRef = useRef<HCaptchaHandle>(null);
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
      if (handle) handle.reset();
      form.reset();
    },
    onError: (err: { message?: string }) => {
      toast.dismiss();
      const errorMessage = err.message ?? "Something went wrong. Please try again.";
      toast.error(errorMessage);
      setError(errorMessage);
      const handle = captchaRef.current;
      if (handle) handle.reset();
      setCaptchaToken("");
    },
    onMutate: () => toast.loading("Sending message..."),
  });

  const messageLength =
    (form.watch("message") as string | undefined)?.length ?? 0;

  const onSubmit = async (data: FormValues) => {
    if (!captchaToken && process.env.NODE_ENV === "production") {
      toast.error("Please complete the captcha");
      return;
    }
    setError(null);
    const payload: ContactFormData = {
      name: data.name,
      email: data.email,
      message: data.message,
      phone: data.phone,
      preferredContactMethod: data.preferredContactMethod,
      captchaToken,
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
