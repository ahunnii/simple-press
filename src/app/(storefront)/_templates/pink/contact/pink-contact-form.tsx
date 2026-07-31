"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import type { ContactFormValues } from "~/lib/validators/contact";
import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { HCaptchaField } from "~/components/inputs/hcaptcha-form-field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { PinkHairlineGrid } from "../shared/pink-hairline-grid";

export type PinkContactTopic = {
  name?: string;
  blurb?: string;
  messageLabel?: string;
  messagePlaceholder?: string;
  _id?: string;
};

/** Trims `raw` and falls back to `fallback` for both `undefined` and empty/whitespace-only strings. */
function trimmedOrFallback(raw: string | undefined, fallback: string): string {
  const trimmed = raw?.trim();
  if (trimmed) {
    return trimmed;
  }
  return fallback;
}

const DEFAULT_TOPICS: PinkContactTopic[] = [
  {
    name: "Custom orders",
    blurb: "A doll, a piece of jewelry, or something else made just for you.",
    messageLabel: "Tell me what you have in mind",
    messagePlaceholder: "Sizes, colors, timeline — whatever you've got.",
  },
  {
    name: "Make & takes",
    blurb: "Bringing a workshop to your group.",
    messageLabel: "Tell me about your group",
    messagePlaceholder: "Group size, dates that work, and where.",
  },
  {
    name: "Something else",
    blurb: "Questions, press, or anything else.",
    messageLabel: "What's on your mind",
    messagePlaceholder: "Ask away.",
  },
];

type Props = {
  topicsVisible: boolean;
  topicsHeading: string;
  topics: PinkContactTopic[];
  formHeading: string;
  referenceLabel: string;
  referencePlaceholder: string;
  marketingLabel: string;
  defaultMessageLabel: string;
  defaultMessagePlaceholder: string;
  submitLabel: string;
  emailNotePrefix: string;
  supportEmail?: string | null;
};

/**
 * Combines `contact.topics` and `contact.form` into one interactive island —
 * selecting a topic rewrites the message field's label/placeholder here, so
 * both sections must share client state.
 *
 * Uses the shared `useContactForm` hook for all state/validation/submission
 * (never reimplemented). `ContactFormValues`'s payload has no `subject` or
 * marketing-opt-in field, so the selected topic, the optional reference
 * value, and the marketing checkbox are folded into the composed `message`
 * text before submit — the owner still receives them (in the notification
 * email), just not as separate structured columns. See build report for
 * the full rationale.
 */
export function PinkContactForm({
  topicsVisible,
  topicsHeading,
  topics,
  formHeading,
  referenceLabel,
  referencePlaceholder,
  marketingLabel,
  defaultMessageLabel,
  defaultMessagePlaceholder,
  submitLabel,
  emailNotePrefix,
  supportEmail,
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
  } = useContactForm({ messageMaxLength: 600 });

  const { isEnabled } = useStorefrontFlags();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [reference, setReference] = useState("");
  const [wantsUpdates, setWantsUpdates] = useState(false);

  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isSuccess) {
      successHeadingRef.current?.focus();
      setSelectedIndex(null);
      setReference("");
      setWantsUpdates(false);
    }
  }, [isSuccess]);

  const items = topics.length > 0 ? topics : DEFAULT_TOPICS;
  const selectedTopic = selectedIndex != null ? items[selectedIndex] : undefined;
  const messageLabel = trimmedOrFallback(selectedTopic?.messageLabel, defaultMessageLabel);
  const messagePlaceholder = trimmedOrFallback(
    selectedTopic?.messagePlaceholder,
    defaultMessagePlaceholder,
  );

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  if (!isEnabled("contactForm")) return null;

  const composedSubmit = form.handleSubmit((data: ContactFormValues) => {
    const parts: string[] = [];
    if (selectedTopic?.name) parts.push(`Topic: ${selectedTopic.name}`);
    if (reference.trim()) parts.push(`Reference: ${reference.trim()}`);
    parts.push(data.message);
    if (wantsUpdates) parts.push(`(${marketingLabel})`);
    return onSubmit({ ...data, message: parts.join("\n\n") });
  });

  if (isSuccess) {
    return (
      <section
        className="px-5 py-16 md:px-10 md:py-24"
        {...sectionGroupAttr("contact", "form")}
      >
        <div
          className="mx-auto flex max-w-[640px] flex-col items-center gap-4 p-12 text-center"
          style={{ background: "var(--pink-panel)", border: "1px solid var(--pink-line)" }}
        >
          <h2
            ref={successHeadingRef}
            tabIndex={-1}
            className="pink-display"
            style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.015em" }}
          >
            Got it — thank you.
          </h2>
          <p className="max-w-[42ch] text-[15px] leading-[1.7]" style={{ color: "var(--pink-muted)" }}>
            We read every note and reply as soon as we can.
          </p>
          <button type="button" onClick={resetSuccess} className="pink-btn pink-btn-ghost mt-2">
            Send another
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* ── contact.topics ─────────────────────────────────────────────── */}
      {topicsVisible && (
        <section
          className="px-5 pt-16 md:px-10 md:pt-24"
          {...sectionGroupAttr("contact", "topics")}
        >
          <div className="mx-auto max-w-[1400px]">
            <h2
              className="pink-display mb-6"
              style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.015em" }}
              {...fieldAttr("pink.contact.topics-heading")}
            >
              {topicsHeading}
            </h2>
            <PinkHairlineGrid columnsClassName="grid-cols-1 sm:grid-cols-2">
              {items.map((topic, i) => {
                const selected = i === selectedIndex;
                return (
                  <button
                    key={topic._id ?? i}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedIndex(selected ? null : i)}
                    className="flex flex-col gap-2 p-6 text-left transition-colors"
                    style={{
                      background: selected ? "var(--pink-ink)" : "var(--pink-paper)",
                      color: selected ? "var(--pink-paper)" : "var(--pink-ink)",
                    }}
                  >
                    <span className="pink-display text-[17px] font-semibold">{topic.name ?? ""}</span>
                    <span
                      className="text-[14px] leading-[1.5]"
                      style={{ color: selected ? "var(--pink-ink-muted)" : "var(--pink-subtle)" }}
                    >
                      {topic.blurb ?? ""}
                    </span>
                  </button>
                );
              })}
            </PinkHairlineGrid>
          </div>
        </section>
      )}

      {/* ── contact.form ───────────────────────────────────────────────── */}
      <section
        className="px-5 py-16 md:px-10 md:py-24"
        {...sectionGroupAttr("contact", "form")}
      >
        <div className="mx-auto max-w-[1400px]">
          <h2
            className="pink-display mb-8"
            style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.015em" }}
            {...fieldAttr("pink.contact.form-heading")}
          >
            {formHeading}
          </h2>

          <Form {...form}>
            <form
              ref={formRef}
              onSubmit={composedSubmit}
              className="flex max-w-[820px] flex-col gap-6"
            >
              {error && (
                <p
                  role="alert"
                  className="p-4 text-[14px]"
                  style={{
                    background: "var(--pink-error-bg)",
                    border: "1px solid var(--pink-error-border)",
                    color: "var(--pink-error)",
                  }}
                >
                  {error}
                </p>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="pink-label">
                        Name <span aria-hidden="true">*</span>
                      </FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          type="text"
                          required
                          placeholder="Your name"
                          className="pink-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="pink-label">
                        Email <span aria-hidden="true">*</span>
                      </FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          type="email"
                          required
                          placeholder="you@email.com"
                          className="pink-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="pink-label">Phone (optional)</FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          type="tel"
                          placeholder="(313) 555-0100"
                          className="pink-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel className="pink-label" {...fieldAttr("pink.contact.form-reference-label")}>
                    {referenceLabel}
                  </FormLabel>
                  <FormControl>
                    <input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      type="text"
                      placeholder={referencePlaceholder}
                      className="pink-input"
                    />
                  </FormControl>
                </FormItem>
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-baseline justify-between gap-3">
                      <FormLabel className="pink-label">
                        {messageLabel} <span aria-hidden="true">*</span>
                      </FormLabel>
                      <span className="text-[12px]" style={{ color: "var(--pink-subtle)" }}>
                        {messageLength}/{messageMaxLength}
                      </span>
                    </div>
                    <FormControl>
                      <textarea
                        {...field}
                        required
                        rows={6}
                        placeholder={messagePlaceholder}
                        maxLength={messageMaxLength}
                        className="pink-input resize-y"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* The whole row is the target — the wrapping <label> means the
                  text toggles the box, so the 16px input is not the hit area.
                  At one line the row still measured ~21px, 3px under WCAG
                  2.5.8's 24px floor; the spacing exception most likely covered
                  it (the control is isolated), but a min-height removes the
                  argument, and 44px on touch pointers meets the template's own
                  bar. The checkbox stays 16px so the form's density is
                  unchanged (audit 2026-07-31, P3-1). */}
              <label
                className="flex min-h-6 cursor-pointer items-center gap-3 text-[14px] [@media(pointer:coarse)]:min-h-11"
                style={{ color: "var(--pink-muted)" }}
              >
                <input
                  type="checkbox"
                  checked={wantsUpdates}
                  onChange={(e) => setWantsUpdates(e.target.checked)}
                  className="h-4 w-4"
                  style={{ accentColor: "var(--pink-rose)" }}
                />
                <span {...fieldAttr("pink.contact.form-marketing-label")}>{marketingLabel}</span>
              </label>

              <HCaptchaField
                ref={captchaRef}
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken("")}
                onError={() => setCaptchaToken("")}
                label="Verification"
                required
              />

              <div
                className="flex flex-wrap items-center justify-between gap-4 pt-6"
                style={{ borderTop: "1px solid var(--pink-line)" }}
              >
                <button
                  type="submit"
                  disabled={isSubmitting || !captchaToken}
                  className="pink-btn pink-btn-solid"
                  style={{ padding: "18px 34px", fontSize: "15px" }}
                  {...fieldAttr("pink.contact.form-submit-label")}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {isSubmitting ? "Sending…" : submitLabel}
                </button>
                {supportEmail && (
                  <p className="text-[13px]" style={{ color: "var(--pink-subtle)" }}>
                    <span {...fieldAttr("pink.contact.form-email-note")}>{emailNotePrefix}</span>{" "}
                    <a href={`mailto:${supportEmail}`} style={{ color: "var(--pink-rose)" }}>
                      {supportEmail}
                    </a>
                  </p>
                )}
              </div>
            </form>
          </Form>
        </div>
      </section>
    </>
  );
}
