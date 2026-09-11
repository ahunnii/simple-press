"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { RecaptchaField } from "~/components/inputs/recaptcha-field";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { WealthInput } from "../shared/wealth-input";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";

type Props = {
  heading: string;
  intro: string;
  submitLabel: string;
  successHeading: string;
  successBody: string;
};

/**
 * The platform contact form via the shared `useContactForm` hook (never
 * reimplemented). `ContactFormValues` has no `firstName`/`lastName` split
 * and no `subject` field, so — following the pink template's precedent
 * (`pink-contact-form.tsx`) — the visible First/Last inputs are local state
 * synced into the hook's single `name` field, and Subject is folded into
 * the composed `message` text before submit. Gated on the `contactForm`
 * flag, matching vii's exact usage.
 */
export function WealthContactForm({
  heading,
  intro,
  submitLabel,
  successHeading,
  successBody,
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
    isSuccess,
    resetSuccess,
  } = useContactForm({ messageMaxLength: 500 });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [subject, setSubject] = useState("");

  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isSuccess) {
      successHeadingRef.current?.focus();
      setFirstName("");
      setLastName("");
      setSubject("");
    }
  }, [isSuccess]);

  // The First/Last inputs are local state (not registered with react-hook-
  // form — the hook has no firstName/lastName split), but the hook's `name`
  // field IS registered and zod-validated (`name: z.string().min(1)`). Only
  // folding firstName/lastName into `name` inside `handleFormSubmit` — as an
  // earlier draft did — is too late: `form.handleSubmit(...)` runs the
  // resolver against whatever `name` currently holds in RHF's store BEFORE
  // invoking the submit callback, and an unregistered field never gets
  // written there, so validation would fail on every submission (name stays
  // "" forever) no matter what the user types. Keeping RHF's `name` synced
  // on every keystroke fixes this for both submit paths (the form's onSubmit
  // AND `useKeyboardEnter`'s own internal `form.handleSubmit(...)` call).
  useEffect(() => {
    const name = `${firstName} ${lastName}`.trim();
    form.setValue("name", name, {
      shouldDirty: firstName.trim() !== "" || lastName.trim() !== "",
    });
  }, [firstName, lastName, form]);

  // Data-callback (not a submit-event handler) so both the form's onSubmit
  // AND `useKeyboardEnter`'s own internal `form.handleSubmit(...)` call fold
  // the local subject state into the composed message the same way.
  const handleFormSubmit = (data: Parameters<typeof onSubmit>[0]) => {
    const message = subject.trim()
      ? `Subject: ${subject.trim()}\n\n${data.message}`
      : data.message;
    return onSubmit({ ...data, message });
  };

  useKeyboardEnter(form, handleFormSubmit);
  useDirtyForm(isDirty);

  const { isEnabled } = useStorefrontFlags();
  if (!isEnabled("contactForm")) return null;

  const composedSubmit = form.handleSubmit(handleFormSubmit);

  if (isSuccess) {
    return (
      <section
        {...sectionGroupAttr("contact", "form")}
        className="py-[calc(var(--wealth-rhythm)*2)]"
      >
        <div
          role="status"
          className="mx-auto flex w-full max-w-[600px] flex-col items-center gap-3 px-[var(--wealth-gutter)] py-[calc(var(--wealth-rhythm)*2)] text-center"
        >
          <h2
            {...fieldAttr("wealth.contact.form-success-heading")}
            ref={successHeadingRef}
            tabIndex={-1}
            className="wealth-section-heading"
          >
            {successHeading}
          </h2>
          <p {...fieldAttr("wealth.contact.form-success-body")}>
            {successBody}
          </p>
          <button
            type="button"
            onClick={resetSuccess}
            className="wealth-link mt-[var(--wealth-rhythm)] cursor-pointer bg-transparent"
          >
            Send another message
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      {...sectionGroupAttr("contact", "form")}
      className="py-[calc(var(--wealth-rhythm)*2)]"
    >
      <div className="mx-auto w-full max-w-[720px] px-[var(--wealth-gutter)] text-center">
        <h2
          {...fieldAttr("wealth.contact.form-heading")}
          className="wealth-section-heading"
        >
          {heading}
        </h2>
        {intro ? (
          <p
            {...fieldAttr("wealth.contact.form-intro")}
            className="mt-[var(--wealth-rhythm)]"
          >
            {intro}
          </p>
        ) : null}

        <Form {...form}>
          <form
            ref={formRef}
            onSubmit={composedSubmit}
            className="mt-[calc(var(--wealth-rhythm)*1.5)] flex flex-col gap-[var(--wealth-rhythm)] text-left"
          >
            {error && (
              <p
                role="alert"
                className="p-3 text-left text-sm"
                style={{
                  background: "var(--wealth-error-bg)",
                  border: "1px solid var(--wealth-error-border)",
                  color: "var(--wealth-error)",
                }}
              >
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 gap-[var(--wealth-gutter)] sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm">
                  First Name <span className="opacity-70">(required)</span>
                </span>
                <WealthInput
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  type="text"
                  name="firstName"
                  autoComplete="given-name"
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm">
                  Last Name <span className="opacity-70">(required)</span>
                </span>
                <WealthInput
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  type="text"
                  name="lastName"
                  autoComplete="family-name"
                  required
                />
              </label>
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm">
                      Email <span className="opacity-70">(required)</span>
                    </span>
                    <FormControl>
                      {/* Raw input (not `WealthInput`) so react-hook-form's
                          field ref attaches directly to the DOM node —
                          `WealthInput` doesn't forward refs. */}
                      <input
                        {...field}
                        type="email"
                        autoComplete="email"
                        required
                        className="wealth-input"
                      />
                    </FormControl>
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />

            <label className="flex flex-col gap-2">
              <span className="text-sm">
                Subject <span className="opacity-70">(required)</span>
              </span>
              <WealthInput
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                type="text"
                name="subject"
                required
              />
            </label>

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <label className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm">
                        Message{" "}
                        <span className="opacity-70">(required)</span>
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--wealth-muted)" }}
                      >
                        {messageLength}/{messageMaxLength}
                      </span>
                    </div>
                    <FormControl>
                      <textarea
                        {...field}
                        required
                        rows={6}
                        maxLength={messageMaxLength}
                        className="wealth-input h-auto min-h-[130px] resize-y py-3"
                      />
                    </FormControl>
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />

            <RecaptchaField
              ref={captchaRef}
              action="contact"
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken("")}
              onError={() => setCaptchaToken("")}
              label="Verification"
              required
            />

            <div className="flex justify-center pt-2">
              <WealthLedgeButton
                type="submit"
                variant="send"
                disabled={isSubmitting || !captchaToken}
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                <span {...fieldAttr("wealth.contact.form-submit-label")}>
                  {isSubmitting ? "Sending…" : submitLabel}
                </span>
              </WealthLedgeButton>
            </div>
          </form>
        </Form>
      </div>
    </section>
  );
}
