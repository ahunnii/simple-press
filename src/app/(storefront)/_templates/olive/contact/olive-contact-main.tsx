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
  OliveReveal,
  OliveTextarea,
} from "../shared";

const MESSAGE_MAX_LENGTH = 500;

type Props = {
  sectionAttrs: Record<string, string>;
  formHeading: string;
  formHeadingFieldKey: string;
  formBody: string;
  formBodyFieldKey: string;
  successHeading: string;
  successHeadingFieldKey: string;
  successBody: string;
  successBodyFieldKey: string;
  visitHeading: string;
  visitHeadingFieldKey: string;
  /** Settings → General → Business address (display line). */
  address: string;
  visitNotes: string;
  visitNotesFieldKey: string;
  /** Settings → General → Contact Details. */
  phone: string;
  email: string;
  hoursHeading: string;
  hoursHeadingFieldKey: string;
  /** Formatted Settings → Business Hours rows. */
  hoursRows: { label: string; value: string }[];
  /** Legacy free-text hours, used only when `hoursRows` is empty. */
  legacyHours: string;
};

/**
 * contact.main — the form card (left) and the info card (right). The info
 * card's address, phone, email and hours all come from Settings; only the
 * small headings and the optional visiting notes are template fields.
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
  successHeading,
  successHeadingFieldKey,
  successBody,
  successBodyFieldKey,
  visitHeading,
  visitHeadingFieldKey,
  address,
  visitNotes,
  visitNotesFieldKey,
  phone,
  email,
  hoursHeading,
  hoursHeadingFieldKey,
  hoursRows,
  legacyHours,
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

  const notes = visitNotes.trim();
  const showVisit = address.length > 0 || notes.length > 0;
  const showHours = hoursRows.length > 0 || legacyHours.length > 0;
  const showInfo =
    showVisit || phone.length > 0 || email.length > 0 || showHours;

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
                <h2
                  ref={successHeadingRef}
                  tabIndex={-1}
                  className="olive-h2"
                  {...fieldAttr(successHeadingFieldKey)}
                >
                  {successHeading}
                </h2>
                {successBody ? (
                  <p
                    className="olive-caption max-w-[40ch]"
                    {...fieldAttr(successBodyFieldKey)}
                  >
                    {successBody}
                  </p>
                ) : null}
                <OliveButton variant="secondary" onClick={resetSuccess}>
                  Send another
                </OliveButton>
              </div>
            ) : (
              <>
                <OliveReveal>
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
                </OliveReveal>

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
          <div className="lg:sticky lg:top-[calc(var(--olive-header-h)+1.5rem)] lg:self-start">
            {/* The card sizes to its own content and pins under the header while the (taller) form scrolls; wrapper keeps the reveal transform off the sticky element. */}
            <OliveReveal className="olive-card olive-card-paper flex flex-col gap-6 p-6 sm:p-8">
              {showVisit ? (
              <div>
                <p className="olive-label" {...fieldAttr(visitHeadingFieldKey)}>
                  {visitHeading}
                </p>
                {address ? (
                  <p
                    className="mt-2 text-[0.9375rem] leading-relaxed"
                    style={{ color: "var(--olive-ink)" }}
                  >
                    {address}
                  </p>
                ) : null}
                {notes ? (
                  <p
                    className={cn(
                      "text-[0.9375rem] leading-relaxed whitespace-pre-line",
                      address ? "mt-1" : "mt-2",
                    )}
                    style={{
                      color: address
                        ? "var(--olive-ink-soft)"
                        : "var(--olive-ink)",
                    }}
                    {...fieldAttr(visitNotesFieldKey)}
                  >
                    {notes}
                  </p>
                ) : null}
              </div>
            ) : null}
            {phone ? (
              <div>
                <p className="olive-label">Phone</p>
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                  className="mt-2 inline-block text-[0.9375rem] leading-relaxed underline-offset-4 hover:underline"
                  style={{ color: "var(--olive-ink)" }}
                >
                  {phone}
                </a>
              </div>
            ) : null}
            {email ? (
              <div>
                <p className="olive-label">Email</p>
                <a
                  href={`mailto:${email}`}
                  className="mt-2 inline-block text-[0.9375rem] leading-relaxed break-all underline-offset-4 hover:underline"
                  style={{ color: "var(--olive-ink)" }}
                >
                  {email}
                </a>
              </div>
            ) : null}
            {showHours ? (
              <div>
                <p className="olive-label" {...fieldAttr(hoursHeadingFieldKey)}>
                  {hoursHeading}
                </p>
                {hoursRows.length > 0 ? (
                  <dl
                    className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[0.9375rem] leading-relaxed"
                    style={{ color: "var(--olive-ink)" }}
                  >
                    {hoursRows.map((row) => (
                      <div key={row.label} className="contents">
                        <dt>{row.label}</dt>
                        <dd
                          className="m-0"
                          style={{ color: "var(--olive-ink-soft)" }}
                        >
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p
                    className="mt-2 text-[0.9375rem] leading-relaxed whitespace-pre-line"
                    style={{ color: "var(--olive-ink)" }}
                  >
                    {legacyHours}
                  </p>
                )}
              </div>
            ) : null}
            </OliveReveal>
          </div>
        ) : null}
      </div>
    </section>
  );
}
