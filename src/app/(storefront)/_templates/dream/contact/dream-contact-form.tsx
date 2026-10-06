"use client";

import { useEffect, useRef } from "react";
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

import { DreamButton } from "../shared/dream-button";
import { DreamHeading } from "../shared/dream-heading";
import {
  DreamInput,
  DreamRadioPills,
  DreamTextarea,
} from "../shared/dream-input";
import { DREAM_QUOTE_HREF } from "../shared/dream-quote-href";
import { DreamSection } from "../shared/dream-section";

type Props = {
  heading: string;
  intro: string;
  submitLabel: string;
  successHeading: string;
  successBody: string;
  eventCardHeading: string;
  eventCardBody: string;
  eventCardCtaLabel: string;
};

/**
 * The "Ask a question" form (`contact.form` section): a short note to
 * Selest, with a sticky "Planning an event?" card beside it that hands
 * event requests to the Estimate Quote page (`DREAM_QUOTE_HREF`). On
 * success the form is replaced by a focused confirmation card in the same
 * two-column grid while the event card stays put. Mechanics copied from
 * `wealth/contact/wealth-contact-form.tsx` — the shared `useContactForm`
 * hook, `RecaptchaField`, `useKeyboardEnter`, `useDirtyForm` — never
 * reimplemented.
 */
export function DreamContactForm({
  heading,
  intro,
  submitLabel,
  successHeading,
  successBody,
  eventCardHeading,
  eventCardBody,
  eventCardCtaLabel,
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
  } = useContactForm({
    // Room for a real question ("do you drape tents in October?") — the
    // platform's 180 default is about two sentences. Server cap is 1000.
    messageMaxLength: 500,
    showSuccessToast: false,
  });

  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isSuccess) {
      // Focus without scrolling, then bring the section's top into view
      // ourselves so the sticky header (scroll-margin-top on the section)
      // never covers the confirmation. Smooth only when motion is welcome.
      const heading = successHeadingRef.current;
      heading?.focus({ preventScroll: true });
      const prefersNoMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      heading?.closest("section")?.scrollIntoView({
        block: "start",
        behavior: prefersNoMotion ? "auto" : "smooth",
      });
    }
  }, [isSuccess]);

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  const { isEnabled } = useStorefrontFlags();
  if (!isEnabled("contactForm")) return null;

  const sectionAttrs = sectionGroupAttr("contact", "form");
  const charsLeft = Math.max(0, messageMaxLength - messageLength);

  const eventCard = (
    <div className="lg:sticky lg:top-[calc(var(--dream-header-h)+32px)] lg:self-start">
      <div className="dream-card flex flex-col items-start gap-4">
        <DreamHeading as="h3" fieldKey="dream.contact.event-card-heading">
          {eventCardHeading}
        </DreamHeading>
        <p
          className="text-[var(--dream-soft)]"
          {...fieldAttr("dream.contact.event-card-body")}
        >
          {eventCardBody}
        </p>
        <DreamButton href={DREAM_QUOTE_HREF} variant="primary">
          <span {...fieldAttr("dream.contact.event-card-cta-label")}>
            {eventCardCtaLabel}
          </span>
        </DreamButton>
      </div>
    </div>
  );

  if (isSuccess) {
    return (
      <DreamSection
        sectionAttrs={sectionAttrs}
        aria-label="Message sent"
        className="scroll-mt-[calc(var(--dream-header-h)+24px)]"
      >
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
          <div role="status" className="dream-card flex flex-col gap-4">
            <h2
              ref={successHeadingRef}
              tabIndex={-1}
              className="dream-heading"
              {...fieldAttr("dream.contact.form-success-heading")}
            >
              {successHeading}
            </h2>
            <p
              className="max-w-[60ch] text-[var(--dream-soft)]"
              {...fieldAttr("dream.contact.form-success-body")}
            >
              {successBody}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4">
              <DreamButton href="/" variant="primary">
                Back to home
              </DreamButton>
              <button
                type="button"
                onClick={resetSuccess}
                className="dream-link cursor-pointer bg-transparent"
              >
                Send another message
              </button>
            </div>
          </div>

          {eventCard}
        </div>
      </DreamSection>
    );
  }

  return (
    <DreamSection sectionAttrs={sectionAttrs} aria-label="Contact form">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div>
          <DreamHeading as="h2" fieldKey="dream.contact.form-heading">
            {heading}
          </DreamHeading>
          {intro ? (
            <p
              className="mt-4 max-w-[60ch] text-[var(--dream-soft)]"
              {...fieldAttr("dream.contact.form-intro")}
            >
              {intro}
            </p>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-6 rounded-[var(--dream-radius-input)] border border-[var(--dream-error)] px-4 py-3 text-sm text-[var(--dream-error)]"
            >
              {error}
            </p>
          ) : null}

          <Form {...form}>
            <form
              ref={formRef}
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-8 flex flex-col gap-6"
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <label className="flex flex-col gap-2 text-sm">
                        <span>
                          Name{" "}
                          <span className="text-[var(--dream-soft)]">
                            (required)
                          </span>
                        </span>
                        <FormControl>
                          <DreamInput
                            {...field}
                            type="text"
                            autoComplete="name"
                            required
                          />
                        </FormControl>
                      </label>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <label className="flex flex-col gap-2 text-sm">
                        <span>
                          Email{" "}
                          <span className="text-[var(--dream-soft)]">
                            (required)
                          </span>
                        </span>
                        <FormControl>
                          <DreamInput
                            {...field}
                            type="email"
                            autoComplete="email"
                            required
                          />
                        </FormControl>
                      </label>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex flex-col gap-2 text-sm">
                      <span>Phone</span>
                      <FormControl>
                        <DreamInput {...field} type="tel" autoComplete="tel" />
                      </FormControl>
                    </label>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredContactMethod"
                render={({ field }) => (
                  <DreamRadioPills
                    name={field.name}
                    legend="Preferred contact method"
                    options={[
                      { value: "email", label: "Email" },
                      { value: "phone", label: "Phone" },
                      { value: "no-preference", label: "No preference" },
                    ]}
                    value={field.value as string}
                    onChange={field.onChange}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex flex-col gap-2 text-sm">
                      <div className="flex items-baseline justify-between gap-3">
                        <span>
                          Message{" "}
                          <span className="text-[var(--dream-soft)]">
                            (required)
                          </span>
                        </span>
                        <span className="text-xs text-[var(--dream-soft)]">
                          {charsLeft} characters left
                        </span>
                      </div>
                      <FormControl>
                        <DreamTextarea
                          {...field}
                          required
                          rows={5}
                          maxLength={messageMaxLength}
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

              <div>
                <DreamButton
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || !captchaToken}
                >
                  {isSubmitting && (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  <span {...fieldAttr("dream.contact.form-submit-label")}>
                    {isSubmitting ? "Sending…" : submitLabel}
                  </span>
                </DreamButton>
              </div>
            </form>
          </Form>
        </div>

        {eventCard}
      </div>
    </DreamSection>
  );
}
