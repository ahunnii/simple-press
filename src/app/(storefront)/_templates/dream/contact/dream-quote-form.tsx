"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import type {
  QuoteExtras,
  QuoteSetting,
  QuoteYesNo,
} from "./compose-quote-message";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { CONTACT_MESSAGE_MAX_LENGTH } from "~/lib/validators/contact";
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
import { DreamRadioPills } from "../shared/dream-input";
import { DreamSection } from "../shared/dream-section";
import { DreamSteps } from "../shared/dream-steps";
import {
  composeQuoteMessage,
  composeQuotePrefix,
  EMPTY_QUOTE_EXTRAS,
} from "./compose-quote-message";

type Step = {
  heading: string;
  body: string;
  headingFieldKey: string;
  bodyFieldKey: string;
};

type Props = {
  heading: string;
  intro: string;
  themeHelper: string;
  submitLabel: string;
  successHeading: string;
  successBody: string;
  nextHeading: string;
  nextSteps: Step[];
};

type ExtrasKey = keyof QuoteExtras;
type ExtrasErrors = Partial<Record<ExtrasKey, string>>;

const SETTING_OPTIONS = [
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "both", label: "Both" },
];

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Not sure" },
];

/**
 * The Estimate Quote form (design.md "Per-page section concepts › Estimate
 * Quote"). Renders the entire `contact.form` section: the form itself, a
 * sticky "What happens next" aside, and (on success) a focused success
 * panel replacing both. Mechanics copied from
 * `wealth/contact/wealth-contact-form.tsx` — the shared `useContactForm`
 * hook, `RecaptchaField`, `useKeyboardEnter`, `useDirtyForm` — never
 * reimplemented.
 *
 * `name`/`email`/`phone`/`preferredContactMethod`/`message` are registered
 * with the hook's react-hook-form instance. The event-specific extras
 * (date, time, location, setting, colors, draping/throne-chair/full-decor,
 * a photo link) are local state, folded into the submitted `message` via
 * `composeQuoteMessage` ahead of the free-text theme description.
 */
export function DreamQuoteForm({
  heading,
  intro,
  themeHelper,
  submitLabel,
  successHeading,
  successBody,
  nextHeading,
  nextSteps,
}: Props) {
  const [extras, setExtras] = useState<QuoteExtras>(EMPTY_QUOTE_EXTRAS);
  const [extrasErrors, setExtrasErrors] = useState<ExtrasErrors>({});
  const extrasRefs = useRef<Partial<Record<ExtrasKey, HTMLElement | null>>>({});

  // The hook rebuilds its zod schema every render, so recomputing the
  // dynamic cap off the CURRENT extras on every render keeps the theme
  // description's budget honest as the owner fills in event details.
  const prefix = composeQuotePrefix(extras);
  const dynamicMessageMaxLength = Math.max(
    120,
    CONTACT_MESSAGE_MAX_LENGTH - prefix.length - 2,
  );

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
  } = useContactForm({ messageMaxLength: dynamicMessageMaxLength });

  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isSuccess) {
      successHeadingRef.current?.focus();
      setExtras(EMPTY_QUOTE_EXTRAS);
      setExtrasErrors({});
    }
  }, [isSuccess]);

  function setExtra<K extends ExtrasKey>(key: K, value: QuoteExtras[K]) {
    setExtras((prev) => ({ ...prev, [key]: value }));
  }

  function registerExtraRef(key: ExtrasKey) {
    return (el: HTMLElement | null) => {
      extrasRefs.current[key] = el;
    };
  }

  function validateExtras(): boolean {
    const errors: ExtrasErrors = {};
    if (!extras.eventDate.trim()) {
      errors.eventDate = "Enter the event date.";
    }
    if (!extras.location.trim()) {
      errors.location = "Enter the event location.";
    }
    if (!extras.setting) {
      errors.setting = "Choose a setting.";
    }
    if (!extras.fullDecor) {
      errors.fullDecor = "Let Selest know if you'd like full decor.";
    }
    if (extras.photoLink.trim()) {
      try {
        new URL(extras.photoLink.trim());
      } catch {
        errors.photoLink = "Enter a valid link, including https://.";
      }
    }

    setExtrasErrors(errors);

    const firstInvalid = (Object.keys(errors) as ExtrasKey[])[0];
    if (firstInvalid) {
      extrasRefs.current[firstInvalid]?.focus();
      return false;
    }
    return true;
  }

  // Data callback (not a submit-event handler) so both the form's onSubmit
  // AND `useKeyboardEnter`'s own internal `form.handleSubmit(...)` call run
  // the same extras validation + composition before the shared hook's mutate.
  const handleFormSubmit = async (data: Parameters<typeof onSubmit>[0]) => {
    if (!validateExtras()) return;

    const composed = composeQuoteMessage(extras, data.message);
    if (composed.length > CONTACT_MESSAGE_MAX_LENGTH) {
      form.setError("message", {
        message:
          "Your theme description is too long once combined with the event details above. Please shorten it.",
      });
      return;
    }

    await onSubmit({ ...data, message: composed });
  };

  useKeyboardEnter(form, handleFormSubmit);
  useDirtyForm(isDirty);

  const { isEnabled } = useStorefrontFlags();
  if (!isEnabled("contactForm")) return null;

  const composedSubmit = form.handleSubmit(handleFormSubmit);
  const sectionAttrs = sectionGroupAttr("contact", "form");
  const charsLeft = Math.max(0, messageMaxLength - messageLength);

  if (isSuccess) {
    return (
      <DreamSection
        sectionAttrs={sectionAttrs}
        aria-label="Estimate Quote request sent"
      >
        <div
          role="status"
          className="mx-auto flex max-w-[560px] flex-col items-center gap-3 text-center"
        >
          <h2
            ref={successHeadingRef}
            tabIndex={-1}
            className="dream-heading"
            {...fieldAttr("dream.contact.form-success-heading")}
          >
            {successHeading}
          </h2>
          <p
            className="text-[var(--dream-soft)]"
            {...fieldAttr("dream.contact.form-success-body")}
          >
            {successBody}
          </p>
          <button
            type="button"
            onClick={resetSuccess}
            className="dream-link mt-4 cursor-pointer bg-transparent"
          >
            Send another request
          </button>
        </div>
      </DreamSection>
    );
  }

  return (
    <DreamSection sectionAttrs={sectionAttrs} aria-label="Estimate Quote form">
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
              onSubmit={composedSubmit}
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
                          <input
                            {...field}
                            type="text"
                            autoComplete="name"
                            required
                            className="dream-input"
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
                          <input
                            {...field}
                            type="email"
                            autoComplete="email"
                            required
                            className="dream-input"
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
                        <input
                          {...field}
                          type="tel"
                          autoComplete="tel"
                          className="dream-input"
                        />
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

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span>
                    Event date{" "}
                    <span className="text-[var(--dream-soft)]">(required)</span>
                  </span>
                  <input
                    ref={registerExtraRef("eventDate")}
                    type="date"
                    required
                    value={extras.eventDate}
                    onChange={(e) => setExtra("eventDate", e.target.value)}
                    className="dream-input"
                    aria-invalid={extrasErrors.eventDate ? true : undefined}
                    aria-describedby={
                      extrasErrors.eventDate
                        ? "dream-quote-event-date-error"
                        : undefined
                    }
                  />
                  {extrasErrors.eventDate ? (
                    <span
                      id="dream-quote-event-date-error"
                      role="alert"
                      className="text-sm text-[var(--dream-error)]"
                    >
                      {extrasErrors.eventDate}
                    </span>
                  ) : null}
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Event time</span>
                  <input
                    type="time"
                    value={extras.eventTime}
                    onChange={(e) => setExtra("eventTime", e.target.value)}
                    className="dream-input"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm">
                <span>
                  Location{" "}
                  <span className="text-[var(--dream-soft)]">(required)</span>
                </span>
                <input
                  ref={registerExtraRef("location")}
                  type="text"
                  required
                  maxLength={80}
                  value={extras.location}
                  onChange={(e) => setExtra("location", e.target.value)}
                  className="dream-input"
                  aria-invalid={extrasErrors.location ? true : undefined}
                  aria-describedby={
                    extrasErrors.location
                      ? "dream-quote-location-error"
                      : undefined
                  }
                />
                {extrasErrors.location ? (
                  <span
                    id="dream-quote-location-error"
                    role="alert"
                    className="text-sm text-[var(--dream-error)]"
                  >
                    {extrasErrors.location}
                  </span>
                ) : null}
              </label>

              <div ref={registerExtraRef("setting")} tabIndex={-1}>
                <DreamRadioPills
                  aria-invalid={extrasErrors.setting ? true : undefined}
                  aria-describedby={
                    extrasErrors.setting
                      ? "dream-quote-setting-error"
                      : undefined
                  }
                  name="setting"
                  legend="Setting (required)"
                  options={SETTING_OPTIONS}
                  value={extras.setting}
                  onChange={(value) =>
                    setExtra("setting", value as QuoteSetting)
                  }
                />
                {extrasErrors.setting ? (
                  <span
                    id="dream-quote-setting-error"
                    role="alert"
                    className="text-sm text-[var(--dream-error)]"
                  >
                    {extrasErrors.setting}
                  </span>
                ) : null}
              </div>

              <label className="flex flex-col gap-2 text-sm">
                <span>Colors</span>
                <input
                  type="text"
                  maxLength={60}
                  value={extras.colors}
                  onChange={(e) => setExtra("colors", e.target.value)}
                  className="dream-input"
                />
              </label>

              <DreamRadioPills
                name="draping"
                legend="Draping"
                options={YES_NO_OPTIONS}
                value={extras.draping}
                onChange={(value) => setExtra("draping", value as QuoteYesNo)}
              />

              <DreamRadioPills
                name="throneChair"
                legend="Throne chair"
                options={YES_NO_OPTIONS}
                value={extras.throneChair}
                onChange={(value) =>
                  setExtra("throneChair", value as QuoteYesNo)
                }
              />

              <div ref={registerExtraRef("fullDecor")} tabIndex={-1}>
                <DreamRadioPills
                  aria-invalid={extrasErrors.fullDecor ? true : undefined}
                  aria-describedby={
                    extrasErrors.fullDecor
                      ? "dream-quote-full-decor-error"
                      : undefined
                  }
                  name="fullDecor"
                  legend="Full decor by Dream Your Theme (required)"
                  options={YES_NO_OPTIONS}
                  value={extras.fullDecor}
                  onChange={(value) =>
                    setExtra("fullDecor", value as QuoteYesNo)
                  }
                />
                {extrasErrors.fullDecor ? (
                  <span
                    id="dream-quote-full-decor-error"
                    role="alert"
                    className="text-sm text-[var(--dream-error)]"
                  >
                    {extrasErrors.fullDecor}
                  </span>
                ) : null}
              </div>

              <label className="flex flex-col gap-2 text-sm">
                <span>Link to photos of the space</span>
                <input
                  ref={registerExtraRef("photoLink")}
                  type="url"
                  maxLength={200}
                  placeholder="https://…"
                  value={extras.photoLink}
                  onChange={(e) => setExtra("photoLink", e.target.value)}
                  className="dream-input"
                  aria-invalid={extrasErrors.photoLink ? true : undefined}
                  aria-describedby={
                    extrasErrors.photoLink
                      ? "dream-quote-photo-link-error"
                      : undefined
                  }
                />
                {extrasErrors.photoLink ? (
                  <span
                    id="dream-quote-photo-link-error"
                    role="alert"
                    className="text-sm text-[var(--dream-error)]"
                  >
                    {extrasErrors.photoLink}
                  </span>
                ) : null}
              </label>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex flex-col gap-2 text-sm">
                      <div className="flex items-baseline justify-between gap-3">
                        <span>
                          Theme description{" "}
                          <span className="text-[var(--dream-soft)]">
                            (required)
                          </span>
                        </span>
                        <span className="text-xs text-[var(--dream-soft)]">
                          {charsLeft} characters left for your theme
                        </span>
                      </div>
                      {themeHelper ? (
                        <span
                          className="text-xs text-[var(--dream-soft)]"
                          {...fieldAttr("dream.contact.form-theme-helper")}
                        >
                          {themeHelper}
                        </span>
                      ) : null}
                      <FormControl>
                        <textarea
                          {...field}
                          required
                          rows={5}
                          maxLength={messageMaxLength}
                          className="dream-input dream-textarea"
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

        <div className="lg:sticky lg:top-[calc(var(--dream-header-h)+32px)] lg:self-start">
          <div className="dream-card">
            <DreamHeading as="h3" fieldKey="dream.contact.form-next-heading">
              {nextHeading}
            </DreamHeading>
            <div className="mt-6">
              <DreamSteps steps={nextSteps} />
            </div>
          </div>
        </div>
      </div>
    </DreamSection>
  );
}
