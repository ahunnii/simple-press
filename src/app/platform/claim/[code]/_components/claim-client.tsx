"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOut,
  MailCheck,
} from "lucide-react";
import { toast } from "sonner";

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
 * loading  — resolving any existing session on mount
 * mismatch — a DIFFERENT account is signed in; must sign out before claiming
 * signup   — no account yet: create one (email locked to the invite)
 * signin   — account exists: sign in (email locked to the invite)
 * verify   — account created / sign-in blocked pending email verification
 * ready    — already signed in as the verified invited user; one click to claim
 *
 * An in-flight request is tracked separately via `submitting` so the visible
 * phase (and thus which form renders) never changes mid-request.
 */
type Phase =
  | "loading"
  | "mismatch"
  | "signup"
  | "signin"
  | "verify"
  | "ready";

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
  // Email of a DIFFERENT signed-in account, populated only in the "mismatch"
  // phase so we can name it in the copy.
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  // Resend "verification email" cooldown, in seconds (0 = ready to send).
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const subdomainPreview = `${subdomain}.${platformDomain}`;

  // Where the verification link should land the owner AFTER they verify. Better
  // Auth threads this through signUp.email / signIn.email / sendVerificationEmail
  // into the `/verify-email?...&callbackURL=` link; on success it redirects here.
  // A relative path resolves against the platform base URL (claim flows run on
  // the platform domain, so sendVerificationEmail does NOT rewrite the host).
  const callbackURL = `/platform/claim/${code}`;

  // Resolve the current session into the right phase. Shared by the mount effect
  // and the "sign out and continue" action so signing out re-runs the same check.
  const mountedRef = useRef(true);
  const resolveSession = useCallback(async () => {
    try {
      const { data } = await authClient.getSession();
      const currentEmail = data?.user?.email?.toLowerCase();
      if (currentEmail === email.toLowerCase()) {
        // Right account. If already verified (e.g. they clicked the verification
        // link, which auto-signs them in, then returned here) go straight to the
        // one-click claim; otherwise into the normal auth forms.
        if (!mountedRef.current) return;
        setSessionEmail(null);
        setPhase(
          data?.user?.emailVerified === true
            ? "ready"
            : userExists
              ? "signin"
              : "signup",
        );
        return;
      }
      if (data?.user) {
        // A DIFFERENT account is signed in. Never render the auth forms (and thus
        // never fire signUp/signIn) while a wrong session is live.
        if (!mountedRef.current) return;
        setSessionEmail(data.user.email);
        setPhase("mismatch");
        return;
      }
    } catch {
      // Ignore — fall through to the appropriate auth form.
    }
    if (mountedRef.current) setPhase(userExists ? "signin" : "signup");
  }, [email, userExists]);

  // On mount, resolve any existing session.
  useEffect(() => {
    mountedRef.current = true;
    void resolveSession();
    return () => {
      mountedRef.current = false;
    };
  }, [resolveSession]);

  // Tick the resend cooldown down to zero.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

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
        // Land the verification link back on THIS claim page (verified +
        // auto-signed-in) so the mount check drops into the ready-to-claim state.
        callbackURL,
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
        // If the account is unverified, requireEmailVerification makes Better Auth
        // auto-resend the verification email using THIS callbackURL — keeping the
        // return path on the claim page even for the sign-in branch.
        callbackURL,
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

  // Wrong-account state: sign out the mismatched session, then re-run the session
  // check — which drops the user into the normal sign-up / sign-in branch.
  const handleSignOut = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await authClient.signOut();
      setSessionEmail(null);
      setPhase("loading");
      await resolveSession();
    } catch {
      setError("Couldn't sign you out. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Resend the verification email to the invited address (never a free-typed one),
  // with a light client-side cooldown so the button can't be hammered.
  const handleResend = async () => {
    if (resending || resendCooldown > 0) return;
    setError(null);
    setResending(true);
    try {
      const { error: resendError } = await authClient.sendVerificationEmail({
        email,
        callbackURL,
      });
      if (resendError) {
        toast.error(
          resendError.message ?? "Couldn't send the verification email.",
        );
        return;
      }
      toast.success("Verification email sent");
      setResendCooldown(30);
    } catch {
      toast.error("Couldn't send the verification email.");
    } finally {
      setResending(false);
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

  if (phase === "mismatch") {
    return (
      <>
        {SiteHeader}
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You&apos;re signed in as <strong>{sessionEmail}</strong>, but this
              invitation was sent to <strong>{email}</strong>. To claim this
              website you need to continue as <strong>{email}</strong>.
            </AlertDescription>
          </Alert>
          {ErrorAlert}
          <Button className="w-full" disabled={busy} onClick={handleSignOut}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing out…
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out and continue
              </>
            )}
          </Button>
          <p className="text-center text-sm text-gray-500">
            <Link href="/" className="font-medium underline">
              Go to your dashboard instead
            </Link>
          </p>
        </CardContent>
      </>
    );
  }

  if (phase === "verify") {
    const resendLabel =
      resendCooldown > 0
        ? `Resend verification email (${resendCooldown}s)`
        : "Resend verification email";
    return (
      <>
        {SiteHeader}
        <CardContent className="space-y-4">
          <Alert>
            <MailCheck className="h-4 w-4" />
            <AlertDescription>
              Check <strong>{email}</strong> for a verification link — it will
              bring you back here to finish claiming your site.
            </AlertDescription>
          </Alert>
          {ErrorAlert}
          <Button className="w-full" onClick={handleVerifiedContinue}>
            I&apos;ve verified my email — continue
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={resending || resendCooldown > 0}
            onClick={handleResend}
          >
            {resending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              resendLabel
            )}
          </Button>
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
