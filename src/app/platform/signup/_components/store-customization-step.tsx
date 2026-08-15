"use client";

import { useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Loader2, Mail } from "lucide-react";

import type { SignupFormData } from "./wizard-client";
import type { RecaptchaHandle } from "~/components/inputs/recaptcha-field";
import { authClient } from "~/server/better-auth/client";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { RecaptchaField } from "~/components/inputs/recaptcha-field";
import { OwnerTermsAcceptance } from "~/components/legal/owner-terms-acceptance";

type StoreCustomizationStepProps = {
  formData: Partial<SignupFormData>;
  onBack?: () => void;
};

export function StoreCustomizationStep({
  formData,
  onBack,
}: StoreCustomizationStepProps) {
  const captchaRef = useRef<RecaptchaHandle>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [heroTitle, setHeroTitle] = useState(
    formData.heroTitle ?? `Welcome to ${formData.businessName ?? "Our Store"}`,
  );
  const [heroSubtitle, setHeroSubtitle] = useState(formData.heroSubtitle ?? "");
  const [aboutText, setAboutText] = useState(formData.aboutText ?? "");
  const [primaryColor, setPrimaryColor] = useState(
    formData.primaryColor ?? "#3b82f6",
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // This single step creates BOTH the account and the store, so one checkbox
  // covers both relationships: platform ToS + Privacy (account) and the Seller
  // & Merchant Agreement + Acceptable Use Policy (store). The flag below is only
  // a UI gate — `/api/onboarding` re-checks it and stamps the timestamps itself.
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  // With requireEmailVerification, signup returns no session. Persist a draft,
  // send the verification email with callbackURL back to /platform/signup/continue,
  // and show this phase until they verify.
  const [phase, setPhase] = useState<"form" | "verify">("form");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acceptedTerms) {
      setTermsError(
        "Please accept the terms and policies to create your store.",
      );
      return;
    }
    setTermsError(null);
    setIsSubmitting(true);

    const completeFormData = {
      ...formData,
      heroTitle,
      heroSubtitle,
      aboutText,
      primaryColor,
      // Explicit acceptance flag — the server rejects the request without it.
      acceptedTerms: true as const,
    };

    try {
      if (!formData.email || !formData.password || !formData.name) {
        setError("Please fill in all account details");
        return;
      }
      if (!formData.businessName || !formData.subdomain) {
        setError("Please fill in all business details");
        return;
      }

      // Mint a fresh token right before submitting rather than reusing
      // whatever was staged — this form is long enough (hero title,
      // subtitle, about text, colors) that a staged token can easily be
      // past its 120s TTL by the time the user actually submits.
      const freshCaptchaToken =
        (await captchaRef.current?.execute()) ?? captchaToken;

      // Persist a signed draft BEFORE signup. requireEmailVerification means
      // signUp.email returns no session, so /api/onboarding cannot run until
      // the owner verifies and lands on /platform/signup/continue.
      const draftResponse = await fetch("/api/onboarding/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          businessName: formData.businessName,
          subdomain: formData.subdomain,
          customDomain: formData.customDomain,
          templateId: formData.templateId ?? "modern",
          heroTitle,
          heroSubtitle,
          aboutText,
          primaryColor,
          invitationCode: formData.invitationCode,
          aftoken: formData.aftoken,
          acceptedTerms: true,
        }),
      });
      if (!draftResponse.ok) {
        const draftErr = (await draftResponse.json()) as { error?: string };
        setError(draftErr.error ?? "Failed to save signup progress");
        return;
      }

      // Terms-of-service acceptance signal. The `acceptedTerms` guard above
      // already refused to submit without the checkbox, so this is that fact
      // carried over the wire — the server now REJECTS /sign-up/email without
      // it (see resolvePlatformTermsAcceptance). Spread rather than a literal
      // property because the client params type doesn't declare this key and a
      // literal would fail TypeScript's excess-property check; same technique
      // as `additionalFieldValues` in ~/components/auth/sign-up.tsx.
      const termsSignal: Record<string, unknown> = { termsAccepted: true };

      const continueUrl = `${window.location.origin}/platform/signup/continue`;

      const { error: signUpError } = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        ...termsSignal,
        callbackURL: continueUrl,
        fetchOptions: {
          headers: {
            "x-captcha-response": freshCaptchaToken,
          },
        },
      });

      if (signUpError) {
        // Signup is two steps (create account, then create store). If the store
        // step failed on a previous attempt, the account already exists AND the
        // user was auto-signed-in. On retry signUp.email now errors with
        // "already exists" — but that's this same user finishing setup, not a
        // conflict. Only surface the error if we're NOT already signed in as
        // this email; otherwise fall through to the onboarding call.
        const { data: sessionData } = await authClient.getSession();
        const signedInAsEmail =
          sessionData?.user?.email?.toLowerCase() ===
          formData.email.toLowerCase();
        if (!signedInAsEmail) {
          setError(signUpError.message ?? "Failed to create account");
          return;
        }
      }

      // With requireEmailVerification, sign-up does NOT create a live session —
      // the owner must verify first. Only proceed to onboarding if a verified
      // session actually exists; otherwise show the verify state.
      const { data: sessionData } = await authClient.getSession();
      if (
        sessionData?.user?.email?.toLowerCase() ===
          formData.email.toLowerCase() &&
        sessionData.user.emailVerified === true
      ) {
        const response = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(completeFormData),
        });

        const data = (await response.json()) as {
          error?: string;
          redirectUrl?: string;
          businessId?: string;
        };

        if (!response.ok) {
          setError(data.error ?? "Failed to create your store");
          return;
        }

        window.location.href = data.redirectUrl ?? "";
        return;
      }

      setPhase("verify");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (phase === "verify") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a verification link to {formData.email}. Open it to finish
            creating your store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              After you verify, you&apos;ll return here automatically and we
              will create your store. Keep this browser available — the setup
              details are saved securely for one hour.
            </AlertDescription>
          </Alert>
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customize your store</CardTitle>
        <CardDescription>
          Add some basic information. You can change this anytime.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <label
              htmlFor="heroTitle"
              className="mb-2 block text-sm font-medium"
            >
              Homepage Title
            </label>
            <Input
              id="heroTitle"
              type="text"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder="Welcome to our store"
              autoFocus
            />
            <p className="mt-1 text-sm text-gray-500">
              This will be the main heading on your homepage
            </p>
          </div>

          <div>
            <label
              htmlFor="heroSubtitle"
              className="mb-2 block text-sm font-medium"
            >
              Homepage Subtitle (Optional)
            </label>
            <Input
              id="heroSubtitle"
              type="text"
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              placeholder="Quality products for everyone"
            />
          </div>

          <div>
            <label
              htmlFor="aboutText"
              className="mb-2 block text-sm font-medium"
            >
              About Your Business (Optional)
            </label>
            <Textarea
              id="aboutText"
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              placeholder="Tell customers about your business..."
              rows={4}
            />
          </div>

          <div>
            <label
              htmlFor="primaryColor"
              className="mb-2 block text-sm font-medium"
            >
              Brand Color
            </label>
            <div className="flex items-center gap-3">
              <Input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-20"
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              This color will be used for buttons and accents
            </p>
          </div>

          {/* Preview */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="mb-2 text-xs font-medium text-gray-500">Preview</p>
            <div
              className="rounded-lg p-6 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <h3 className="mb-2 text-2xl font-bold">{heroTitle}</h3>
              {heroSubtitle && (
                <p className="text-sm opacity-90">{heroSubtitle}</p>
              )}
            </div>
          </div>

          <RecaptchaField
            ref={captchaRef}
            action="auth"
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken("")}
            onError={() => setCaptchaToken("")}
            label="Verification"
            required
          />

          <Alert>
            <AlertDescription>
              Don&apos;t worry about making everything perfect. You can add
              images, products, and customize further after your store is
              created.
            </AlertDescription>
          </Alert>

          <OwnerTermsAcceptance
            id="signup-terms-acceptance"
            checked={acceptedTerms}
            onCheckedChange={(next) => {
              setAcceptedTerms(next);
              if (next) setTermsError(null);
            }}
            includePlatformTerms
            disabled={isSubmitting}
            error={termsError}
          />

          <div className="flex gap-3">
            {onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating your store...
                </>
              ) : (
                "Create My Store"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
