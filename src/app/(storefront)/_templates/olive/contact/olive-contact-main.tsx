"use client";

import { useEffect, useRef } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { RecaptchaField } from "~/components/inputs/recaptcha-field";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import {
  OliveButton,
  OliveField,
  OliveInput,
  OliveLeafMark,
  OliveTextarea,
} from "../shared";

const MESSAGE_MAX_LENGTH = 500;

type Props = {
  sectionAttrs: Record<string, string>;
  formHeading: string;
  formHeadingFieldKey: string;
  formBody: string;
  formBodyFieldKey: string;
  visitHeading: string;
  visitHeadingFieldKey: string;
  visitBody: string;
  visitBodyFieldKey: string;
  hoursHeading: string;
  hoursHeadingFieldKey: string;
  hoursBody: string;
  hoursBodyFieldKey: string;
};

/**
 * contact.main — the form card (left) and the visit/hours info card (right).
 * Both live in one client component because the form's success state and the
 * two-column grid need to be decided together at render time.
 *
 * The form itself always uses `useContactForm` (never reimplemented), is
 * gated on the `contactForm` flag, and wires hCaptcha exactly the way every
 * other template's contact form does.
 */
export function OliveContactMain({
  sectionAttrs,
  formHeading,
  formHeadingFieldKey,
  formBody,
  formBodyFieldKey,
  visitHeading,
  visitHeadingFieldKey,
  visitBody,
  visitBodyFieldKey,
  hoursHeading,
  hoursHeadingFieldKey,
  hoursBody,
  hoursBodyFieldKey,
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
  } = useContactForm({ messageMaxLength: MESSAGE_MAX_LENGTH });

  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isSuccess) successHeadingRef.current?.focus();
  }, [isSuccess]);

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  const { isEnabled } = useStorefrontFlags();
  const contactEnabled = isEnabled("contactForm");

  const showVisit = visitBody.trim().length > 0;
  const showHours = hoursBody.trim().length > 0;
  const showInfo = showVisit || showHours;

  if (!contactEnabled && !showInfo) return null;

  const errors = form.formState.errors;
  const twoColumn = contactEnabled && showInfo;

  return (
    <section
      {...sectionAttrs}
      aria-label="Contact us"
      className="mx-auto w-full"
      style={{
        maxWidth: "var(--olive-container)",
        paddingBlock: "var(--olive-section-pad-y)",
        paddingInline: "var(--olive-section-pad-x)",
        backgroundColor: "var(--olive-white)",
      }}
    >
      <div
        className={cn(
          "grid grid-cols-1",
          twoColumn && "gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-12",
        )}
      >
        {contactEnabled ? (
          <div className="olive-card p-6 sm:p-8">
            {isSuccess ? (
              <div
                role="status"
                className="flex flex-col items-center gap-4 py-8 text-center"
              >
                <span aria-hidden="true" style={{ color: "var(--olive-leaf)" }}>
                  <OliveLeafMark size={28} />
                </span>
                <h2 ref={successHeadingRef} tabIndex={-1} className="olive-h2">
                  Message sent
                </h2>
                <p className="olive-caption max-w-[40ch]">
                  We read every note and write back within a day or two.
                </p>
                <OliveButton variant="secondary" onClick={resetSuccess}>
                  Send another
                </OliveButton>
              </div>
            ) : (
              <>
                <h2 className="olive-h2" {...fieldAttr(formHeadingFieldKey)}>
                  {formHeading}
                </h2>
                {formBody ? (
                  <p
                    className="mt-2 max-w-[52ch] text-[0.9375rem] leading-relaxed"
                    style={{ color: "var(--olive-ink-soft)" }}
                    {...fieldAttr(formBodyFieldKey)}
                  >
                    {formBody}
                  </p>
                ) : null}

                <form
                  ref={formRef}
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="mt-6 flex flex-col gap-5"
                  noValidate
                >
                  {error ? (
                    <p
                      role="alert"
                      className="p-3 text-[0.875rem]"
                      style={{
                        backgroundColor: "var(--olive-error-bg)",
                        border: "1px solid var(--olive-error-border)",
                        color: "var(--olive-error)",
                        borderRadius: "var(--olive-card-radius)",
                      }}
                    >
                      {error}
                    </p>
                  ) : null}

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <OliveField
                      id="olive-contact-name"
                      label="Name"
                      required
                      error={errors.name?.message}
                    >
                      <OliveInput
                        type="text"
                        autoComplete="name"
                        placeholder="Your name"
                        {...form.register("name")}
                      />
                    </OliveField>
                    <OliveField
                      id="olive-contact-email"
                      label="Email"
                      required
                      error={errors.email?.message}
                    >
                      <OliveInput
                        type="email"
                        autoComplete="email"
                        placeholder="you@email.com"
                        {...form.register("email")}
                      />
                    </OliveField>
                  </div>

                  <OliveField
                    id="olive-contact-phone"
                    label="Phone (optional)"
                    error={errors.phone?.message}
                  >
                    <OliveInput
                      type="tel"
                      autoComplete="tel"
                      placeholder="(313) 555-0100"
                      {...form.register("phone")}
                    />
                  </OliveField>

                  <OliveField
                    id="olive-contact-message"
                    label="Message"
                    required
                    hint={`${messageLength}/${messageMaxLength}`}
                    error={errors.message?.message}
                  >
                    <OliveTextarea
                      placeholder="Tell us how we can help"
                      maxLength={messageMaxLength}
                      {...form.register("message")}
                    />
                  </OliveField>

                  <RecaptchaField
                    ref={captchaRef}
                    action="contact"
                    onVerify={setCaptchaToken}
                    onExpire={() => setCaptchaToken("")}
                    onError={() => setCaptchaToken("")}
                    label="Verification"
                    required
                  />

                  <OliveButton
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || !captchaToken}
                    loading={isSubmitting}
                    className="self-start"
                  >
                    {isSubmitting ? "Sending" : "Send message"}
                  </OliveButton>
                </form>
              </>
            )}
          </div>
        ) : null}

        {showInfo ? (
          <div className="olive-card olive-card-paper flex flex-col gap-6 p-6 sm:p-8">
            {showVisit ? (
              <div>
                <p className="olive-label" {...fieldAttr(visitHeadingFieldKey)}>
                  {visitHeading}
                </p>
                <p
                  className="mt-2 text-[0.9375rem] leading-relaxed whitespace-pre-line"
                  style={{ color: "var(--olive-ink)" }}
                  {...fieldAttr(visitBodyFieldKey)}
                >
                  {visitBody}
                </p>
              </div>
            ) : null}
            {showHours ? (
              <div>
                <p className="olive-label" {...fieldAttr(hoursHeadingFieldKey)}>
                  {hoursHeading}
                </p>
                <p
                  className="mt-2 text-[0.9375rem] leading-relaxed whitespace-pre-line"
                  style={{ color: "var(--olive-ink)" }}
                  {...fieldAttr(hoursBodyFieldKey)}
                >
                  {hoursBody}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
