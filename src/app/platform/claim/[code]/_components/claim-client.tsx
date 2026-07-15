"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, MailCheck } from "lucide-react";

import type { HCaptchaHandle } from "~/components/inputs/hcaptcha-form-field";
import { isValidEmail } from "~/lib/utils";
import { authClient } from "~/server/better-auth/client";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { HCaptchaField } from "~/components/inputs/hcaptcha-form-field";

type ClaimClientProps = {
  /** Invite code, forwarded to POST /api/claim. */
  code: string;
  /** The invited email. This is the ONLY source of the account email — never
   *  user input — so it stays bound to the invite. */
  email: string;
  businessName: string;
  subdomain: string;
  platformDomain: string;
  /** Whether a User with this email already exists (sign-in vs. sign-up). */
  userExists: boolean;
};

/**
 * loading — resolving any existing session on mount
 * signup  — no account yet: create one (email locked to the invite)
 * signin  — account exists: sign in (email locked to the invite)
 * verify  — account created / sign-in blocked pending email verification
 * ready   — already signed in as the verified invited user; one click to claim
 *
 * An in-flight request is tracked separately via `submitting` so the visible
 * phase (and thus which form renders) never changes mid-request.
 */
type Phase = "loading" | "signup" | "signin" | "verify" | "ready";

export function ClaimClient({
  code,
  email,
  businessName,
  subdomain,
  platformDomain,
  userExists,
}: ClaimClientProps) {
  const captchaRef = useRef<HCaptchaHandle>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subdomainPreview = `${subdomain}.${platformDomain}`;

  // On mount, resolve an existing session. If the invited owner already verified
  // (e.g. they clicked the verification link, which auto-signs them in, then
  // returned here), skip straight to a one-click claim.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data } = await authClient.getSession();
        const sessionEmail = data?.user?.email?.toLowerCase();
        if (
          active &&
          sessionEmail === email.toLowerCase() &&
          data?.user?.emailVerified === true
        ) {
          setPhase("ready");
          return;
        }
      } catch {
        // Ignore — fall through to the appropriate auth form.
      }
      if (active) setPhase(userExists ? "signin" : "signup");
    })();
    return () => {
      active = false;
    };
  }, [email, userExists]);

  const resetCaptcha = () => {
    captchaRef.current?.reset();
    setCaptchaToken("");
  };

  /** Consume the invite once a verified session exists. */
  const claim = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as {
        error?: string;
        redirectUrl?: string;
      };
      if (!res.ok) {
        // A 403 about verification means the session isn't verified yet.
        if (res.status === 403 && /verify/i.test(data.error ?? "")) {
          setPhase("verify");
          return;
        }
        setError(data.error ?? "Failed to claim your site.");
        return;
      }
      if (data.redirectUrl) {
        // Leave `submitting` true — we're navigating away.
        window.location.href = data.redirectUrl;
        return;
      }
      setError("Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setSubmitting(true);
    try {
      const { error: signUpError } = await authClient.signUp.email({
        // Email comes from the server-passed invite, NOT a user-editable field.
        email,
        password,
        name: name.trim(),
        fetchOptions: { headers: { "x-captcha-response": captchaToken } },
      });

      if (signUpError) {
        // If the account already exists AND we're signed in as this email, it's
        // this same owner finishing setup — fall through. Otherwise surface it.
        const { data: sessionData } = await authClient.getSession();
        const signedIn =
          sessionData?.user?.email?.toLowerCase() === email.toLowerCase();
        if (!signedIn) {
          resetCaptcha();
          setError(signUpError.message ?? "Failed to create account");
          return;
        }
      }

      // With requireEmailVerification, sign-up does NOT create a live session —
      // the owner must verify first. Re-check: only proceed to claim if a
      // verified session actually exists; otherwise show the verify state.
      const { data: sessionData } = await authClient.getSession();
      if (
        sessionData?.user?.email?.toLowerCase() === email.toLowerCase() &&
        sessionData.user.emailVerified === true
      ) {
        await claim();
        return;
      }
      setPhase("verify");
    } catch {
      resetCaptcha();
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError("This invitation has an invalid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setSubmitting(true);
    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
        fetchOptions: { headers: { "x-captcha-response": captchaToken } },
      });

      if (signInError) {
        // requireEmailVerification blocks unverified sign-in and re-sends the
        // verification email — steer the owner to the verify state.
        if (
          signInError.status === 403 ||
          /verif/i.test(signInError.message ?? "")
        ) {
          setPhase("verify");
          return;
        }
        resetCaptcha();
        setError(signInError.message ?? "Incorrect email or password");
        return;
      }

      await claim();
    } catch {
      resetCaptcha();
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Re-check verification after the owner reports having verified.
  const handleVerifiedContinue = async () => {
    setError(null);
    try {
      const { data } = await authClient.getSession();
      if (
        data?.user?.email?.toLowerCase() === email.toLowerCase() &&
        data.user.emailVerified === true
      ) {
        await claim();
        return;
      }
      setError(
        "We can't confirm your email is verified yet. Click the link in the email, then try again.",
      );
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  const busy = submitting;

  // ── Site header (shown in every phase) ─────────────────────────────────────
  const SiteHeader = (
    <CardHeader>
      <CardTitle>Claim {businessName}</CardTitle>
      <CardDescription>
        Your site is ready at{" "}
        <span className="font-medium">{subdomainPreview}</span>. Confirm your
        account to take ownership and make it live.
      </CardDescription>
    </CardHeader>
  );

  const EmailField = (
    <div>
      <label htmlFor="claim-email" className="mb-2 block text-sm font-medium">
        Email Address
      </label>
      <Input
        id="claim-email"
        type="email"
        value={email}
        readOnly
        disabled
        aria-describedby="claim-email-help"
        className="bg-muted"
      />
      <p id="claim-email-help" className="mt-1 text-sm text-gray-500">
        This invitation is bound to this email and can&apos;t be changed.
      </p>
    </div>
  );

  const ErrorAlert = error ? (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;

  if (phase === "loading") {
    return (
      <>
        {SiteHeader}
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        </CardContent>
      </>
    );
  }

  if (phase === "verify") {
    return (
      <>
        {SiteHeader}
        <CardContent className="space-y-4">
          <Alert>
            <MailCheck className="h-4 w-4" />
            <AlertDescription>
              We sent a verification email to <strong>{email}</strong>. Click the
              link inside, then return to this page to finish claiming your site.
            </AlertDescription>
          </Alert>
          {ErrorAlert}
          <Button className="w-full" onClick={handleVerifiedContinue}>
            I&apos;ve verified my email — continue
          </Button>
          <p className="text-center text-sm text-gray-500">
            Keep this link handy: {`platform/claim/${code}`}
          </p>
        </CardContent>
      </>
    );
  }

  if (phase === "ready") {
    return (
      <>
        {SiteHeader}
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              You&apos;re signed in as {email}. Claim {businessName} to make it
              live.
            </AlertDescription>
          </Alert>
          {ErrorAlert}
          <Button className="w-full" disabled={busy} onClick={() => claim()}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Claiming…
              </>
            ) : (
              "Claim my site"
            )}
          </Button>
        </CardContent>
      </>
    );
  }

  if (phase === "signin") {
    return (
      <>
        {SiteHeader}
        <CardContent>
          <form onSubmit={handleSignin} className="space-y-4">
            {ErrorAlert}
            {EmailField}
            <div>
              <label
                htmlFor="claim-password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>
              <Input
                id="claim-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                autoFocus
              />
            </div>
            <HCaptchaField
              ref={captchaRef}
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken("")}
              onError={() => setCaptchaToken("")}
              label="Verification"
              required
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in & claim"
              )}
            </Button>
          </form>
        </CardContent>
      </>
    );
  }

  // signup
  return (
    <>
      {SiteHeader}
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          {ErrorAlert}
          <div>
            <label
              htmlFor="claim-name"
              className="mb-2 block text-sm font-medium"
            >
              Full Name
            </label>
            <Input
              id="claim-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
              autoFocus
            />
          </div>
          {EmailField}
          <div>
            <label
              htmlFor="claim-new-password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>
            <Input
              id="claim-new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div>
            <label
              htmlFor="claim-confirm-password"
              className="mb-2 block text-sm font-medium"
            >
              Confirm Password
            </label>
            <Input
              id="claim-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
            />
          </div>
          <HCaptchaField
            ref={captchaRef}
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken("")}
            onError={() => setCaptchaToken("")}
            label="Verification"
            required
          />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating your account…
              </>
            ) : (
              "Create account & claim"
            )}
          </Button>
        </form>
      </CardContent>
    </>
  );
}
