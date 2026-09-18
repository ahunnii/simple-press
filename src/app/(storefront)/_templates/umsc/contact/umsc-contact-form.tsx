"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import type {
  CustomRequestExtras,
  CustomRequestProductType,
} from "./compose-custom-request";
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

import { UmscButton } from "../shared/umsc-button";
import {
  UmscFieldError,
  UmscInput,
  UmscLabel,
  UmscSelect,
  UmscTextarea,
  UmscTogglePills,
} from "../shared/umsc-form-fields";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscSection } from "../shared/umsc-section";
import {
  composeCustomRequestMessage,
  composeCustomRequestPrefix,
  EMPTY_CUSTOM_REQUEST_EXTRAS,
} from "./compose-custom-request";
import { UmscContactAside } from "./umsc-contact-aside";

const PRODUCT_TYPE_OPTIONS: {
  value: CustomRequestProductType;
  label: string;
}[] = [
  { value: "", label: "Choose one…" },
  { value: "candles", label: "Candles" },
  { value: "wax-melts", label: "Wax melts" },
  { value: "soaps", label: "Soaps" },
  { value: "body-care", label: "Body care" },
  { value: "home-care", label: "Home care" },
  { value: "bundle-or-favors", label: "Bundle or favors" },
  { value: "not-sure", label: "Not sure" },
];

type Mode = "general" | "custom";

type AsideProps = {
  heading: string;
  lines: { value: string; fieldKey: string }[];
  phone: string;
  hours: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  googleReviewUrl: string;
};

type Props = {
  heading: string;
  generalLabel: string;
  customLabel: string;
  submitLabel: string;
  successHeading: string;
  successBody: string;
  aside: AsideProps;
};

/**
 * UmscContactForm — design.md "Contact #2": the general-question / custom-
 * order toggle, the base `useContactForm` fields, the custom-order extras
 * (folded into `message` via `compose-custom-request.ts`), and the sticky
 * "What to expect" aside. Gated on the `contactForm` flag; `?type=custom`
 * preselects custom mode. Mechanics copied from
 * `../../dream/contact/dream-quote-form.tsx` and `../../vii/contact/vii-contact-form.tsx`
 * — the shared `useContactForm` hook, `RecaptchaField`, `useKeyboardEnter`,
 * `useDirtyForm` — never reimplemented.
 */
export function UmscContactForm({
  heading,
  generalLabel,
  customLabel,
  submitLabel,
  successHeading,
  successBody,
  aside,
}: Props) {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(() =>
    searchParams.get("type") === "custom" ? "custom" : "general",
  );
  const [extras, setExtras] = useState<CustomRequestExtras>(
    EMPTY_CUSTOM_REQUEST_EXTRAS,
  );
  const extrasIdBase = useId();
  const productTypeId = `${extrasIdBase}-product-type`;
  const quantityId = `${extrasIdBase}-quantity`;
  const dateNeededId = `${extrasIdBase}-date-needed`;
  const occasionId = `${extrasIdBase}-occasion`;
  const scentColourNotesId = `${extrasIdBase}-scent-colour-notes`;

  const prefix = mode === "custom" ? composeCustomRequestPrefix(extras) : "";
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
      setExtras(EMPTY_CUSTOM_REQUEST_EXTRAS);
    }
  }, [isSuccess]);

  function setExtra<K extends keyof CustomRequestExtras>(
    key: K,
    value: CustomRequestExtras[K],
  ) {
    setExtras((prev) => ({ ...prev, [key]: value }));
  }

  const handleFormSubmit = async (data: Parameters<typeof onSubmit>[0]) => {
    const composed =
      mode === "custom"
        ? composeCustomRequestMessage(extras, data.message)
        : data.message;
    if (composed.length > CONTACT_MESSAGE_MAX_LENGTH) {
      form.setError("message", {
        message:
          "Your message is too long once combined with the order details above. Please shorten it.",
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
      <UmscSection
        tone="cream"
        aria-label="Message sent"
        sectionAttrs={sectionAttrs}
      >
        <div
          role="status"
          className="mx-auto flex max-w-[560px] flex-col items-center gap-4 border border-[var(--umsc-line)] bg-[var(--umsc-white)] px-8 py-14 text-center"
        >
          <h2
            ref={successHeadingRef}
            tabIndex={-1}
            {...fieldAttr("umsc.contact.form-success-heading")}
            className="umsc-serif text-[clamp(26px,3.2vw,34px)] leading-[1.1] text-[var(--umsc-ink)]"
          >
            {successHeading}
          </h2>
          <p
            {...fieldAttr("umsc.contact.form-success-body")}
            className="umsc-sans m-0 text-[15px] text-[var(--umsc-muted)]"
          >
            {successBody}
          </p>
          <UmscButton
            as="button"
            type="button"
            variant="link"
            onClick={resetSuccess}
          >
            Send another message
          </UmscButton>
        </div>
      </UmscSection>
    );
  }

  return (
    <UmscSection
      tone="paper"
      aria-label="Contact form"
      sectionAttrs={sectionAttrs}
    >
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div>
          {heading && (
            <UmscHeading as="h2" fieldKey="umsc.contact.form-heading">
              {heading}
            </UmscHeading>
          )}

          <UmscTogglePills
            aria-label="What can we help with?"
            className="mt-6"
            value={mode}
            onChange={setMode}
            options={[
              {
                value: "general",
                label: (
                  <span {...fieldAttr("umsc.contact.toggle-general-label")}>
                    {generalLabel}
                  </span>
                ),
              },
              {
                value: "custom",
                label: (
                  <span {...fieldAttr("umsc.contact.toggle-custom-label")}>
                    {customLabel}
                  </span>
                ),
              },
            ]}
          />

          {error && (
            <UmscFieldError className="mt-6 rounded-[var(--radius)] border border-[var(--umsc-error)] px-4 py-3 text-sm">
              {error}
            </UmscFieldError>
          )}

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
                      <label className="flex flex-col gap-2">
                        <UmscLabel as="span" required>
                          Name
                        </UmscLabel>
                        <FormControl>
                          <UmscInput
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
                      <label className="flex flex-col gap-2">
                        <UmscLabel as="span" required>
                          Email
                        </UmscLabel>
                        <FormControl>
                          <UmscInput
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
                    <label className="flex flex-col gap-2">
                      <UmscLabel as="span">Phone</UmscLabel>
                      <FormControl>
                        <UmscInput {...field} type="tel" autoComplete="tel" />
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
                  <FormItem>
                    <label className="flex flex-col gap-2">
                      <UmscLabel as="span">Preferred contact method</UmscLabel>
                      <FormControl>
                        <UmscSelect
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                        >
                          <option value="no-preference">No preference</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                        </UmscSelect>
                      </FormControl>
                    </label>
                  </FormItem>
                )}
              />

              {mode === "custom" && (
                <div className="flex flex-col gap-6 border-t border-[var(--umsc-line)] pt-6">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={productTypeId}>
                      <UmscLabel as="span">Product type</UmscLabel>
                    </label>
                    <UmscSelect
                      id={productTypeId}
                      value={extras.productType}
                      onChange={(e) =>
                        setExtra(
                          "productType",
                          e.target.value as CustomRequestProductType,
                        )
                      }
                    >
                      {PRODUCT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </UmscSelect>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label htmlFor={quantityId}>
                        <UmscLabel as="span">Quantity</UmscLabel>
                      </label>
                      <UmscInput
                        id={quantityId}
                        type="text"
                        inputMode="numeric"
                        maxLength={40}
                        value={extras.quantity}
                        onChange={(e) => setExtra("quantity", e.target.value)}
                        placeholder="e.g. 24"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label htmlFor={dateNeededId}>
                        <UmscLabel as="span">Date needed</UmscLabel>
                      </label>
                      <UmscInput
                        id={dateNeededId}
                        type="date"
                        value={extras.dateNeeded}
                        onChange={(e) => setExtra("dateNeeded", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor={occasionId}>
                      <UmscLabel as="span">Occasion</UmscLabel>
                    </label>
                    <UmscInput
                      id={occasionId}
                      type="text"
                      maxLength={120}
                      value={extras.occasion}
                      onChange={(e) => setExtra("occasion", e.target.value)}
                      placeholder="e.g. Wedding favors"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor={scentColourNotesId}>
                      <UmscLabel as="span">Scent or colour notes</UmscLabel>
                    </label>
                    <UmscTextarea
                      id={scentColourNotesId}
                      rows={3}
                      maxLength={300}
                      value={extras.scentColourNotes}
                      onChange={(e) =>
                        setExtra("scentColourNotes", e.target.value)
                      }
                      placeholder="Any scents, colors, or containers you have in mind"
                    />
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-baseline justify-between gap-3">
                      <UmscLabel
                        as="span"
                        id={`${extrasIdBase}-message-label`}
                        required
                      >
                        {mode === "custom" ? "Tell us more" : "Message"}
                      </UmscLabel>
                      <span
                        id={`${extrasIdBase}-message-budget`}
                        className="umsc-sans text-[12px] text-[var(--umsc-muted)]"
                        aria-live="polite"
                      >
                        {charsLeft} characters left
                      </span>
                    </div>
                    <FormControl>
                      <UmscTextarea
                        {...field}
                        aria-labelledby={`${extrasIdBase}-message-label`}
                        aria-describedby={`${extrasIdBase}-message-budget`}
                        required
                        rows={5}
                        maxLength={messageMaxLength}
                        placeholder={
                          mode === "custom"
                            ? "Tell us anything else about your order…"
                            : "Tell us how we can help…"
                        }
                        className="mt-2"
                      />
                    </FormControl>
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
                <button
                  type="submit"
                  disabled={isSubmitting || !captchaToken}
                  className="umsc-btn umsc-btn-gold"
                >
                  {isSubmitting && (
                    <Loader2
                      className="mr-2 inline size-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  <span {...fieldAttr("umsc.contact.form-submit-label")}>
                    {isSubmitting ? "Sending…" : submitLabel}
                  </span>
                </button>
              </div>
            </form>
          </Form>
        </div>

        <div className="lg:sticky lg:top-[112px] lg:self-start">
          <UmscContactAside {...aside} />
        </div>
      </div>
    </UmscSection>
  );
}

export function UmscContactFormFallback() {
  return (
    <UmscSection tone="paper" aria-hidden="true">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div className="h-[520px]" />
        <div className="h-[320px]" />
      </div>
    </UmscSection>
  );
}
