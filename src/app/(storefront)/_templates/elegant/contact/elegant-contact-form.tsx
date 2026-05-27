"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

import { useContactForm } from "~/hooks/use-contact-form";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Form } from "~/components/ui/form";
import { HCaptchaField } from "~/components/inputs/hcaptcha-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

export function ElegantContactForm() {
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

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  if (isSuccess) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 999,
          background: "var(--el-sage, #4a5240)",
          color: "var(--el-paper, #fbf8f2)",
          margin: "0 auto 18px",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <CheckCircle2 style={{ width: 22, height: 22 }} />
        </div>
        <h3 style={{
          fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
          fontSize: 28,
          fontWeight: 400,
          color: "var(--el-ink, #1c1a17)",
          marginBottom: 8,
        }}>
          Thank you.
        </h3>
        <p style={{
          fontSize: 15,
          color: "var(--el-ink-soft, #6b6659)",
          fontFamily: "var(--font-sans, sans-serif)",
          marginBottom: 20,
        }}>
          We&apos;ll be in touch within a day.
        </p>
        <button
          type="button"
          onClick={resetSuccess}
          style={{
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--el-ink-soft, #6b6659)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
      >
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <InputFormField
          form={form}
          name="name"
          label="Name *"
          className="flex flex-col gap-1.5"
          labelClassName="text-muted-foreground text-sm"
          placeholder="Jane Doe"
          required
        />

        <InputFormField
          form={form}
          name="email"
          label="Email *"
          className="flex flex-col gap-1.5"
          labelClassName="text-muted-foreground text-sm"
          type="email"
          placeholder="jane@example.com"
          required
        />

        <InputFormField
          form={form}
          name="phone"
          label="Phone (optional)"
          className="flex flex-col gap-1.5"
          labelClassName="text-muted-foreground text-sm"
          type="tel"
          placeholder="+1 555 123 4567"
        />

        <TextareaFormField
          form={form}
          name="message"
          label="Message *"
          className="flex flex-col gap-1.5"
          labelClassName="text-muted-foreground text-sm"
          textareaClassName="resize-none"
          messageLength={messageLength}
          maxLength={messageMaxLength}
          placeholder="How can we help you?"
          required
        />

        <HCaptchaField
          ref={captchaRef}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken("")}
          onError={() => setCaptchaToken("")}
          label="Verification"
          required
        />

        <button
          type="submit"
          disabled={isSubmitting || !captchaToken}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px 26px",
            borderRadius: 999,
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 500,
            background: "var(--el-ink, #1c1a17)",
            color: "var(--el-paper, #fbf8f2)",
            border: "none",
            cursor: isSubmitting || !captchaToken ? "not-allowed" : "pointer",
            opacity: isSubmitting || !captchaToken ? 0.5 : 1,
            fontFamily: "var(--font-sans, sans-serif)",
            width: "100%",
            transition: "background 0.4s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send message"
          )}
        </button>
      </form>
    </Form>
  );
}
