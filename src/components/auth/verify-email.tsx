"use client";

import { useEffect, useState } from "react";
import { useAuth, useSendVerificationEmail } from "@better-auth-ui/react";
import { toast } from "sonner";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { FieldDescription } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";

import { OpenEmailButton } from "./open-email-button";
import { useIsHydrated } from "./use-is-hydrated";

export type VerifyEmailProps = {
  className?: string;
};

/** Seconds the resend button stays disabled to prevent spamming the endpoint. */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Render a card prompting the user to verify their email, with a resend button
 * that is rate-limited by a cooldown timer.
 *
 * The target email is read from `sessionStorage` (set when sign-up or sign-in
 * redirects here); the OpenEmail/Resend controls are only shown when an email
 * is stored. The resend button is disabled while a cooldown is active and shows
 * the remaining seconds.
 *
 * @param className - Additional CSS classes applied to the card
 * @returns The verify-email card React element
 */
export function VerifyEmail({ className }: VerifyEmailProps) {
  const {
    authClient,
    basePaths,
    baseURL,
    localization,
    redirectTo,
    viewPaths,
    Link,
  } = useAuth();

  const isHydrated = useIsHydrated();
  const [email, setEmail] = useState(
    (isHydrated && sessionStorage.getItem("better-auth-ui.verify-email")) || "",
  );
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    setEmail(sessionStorage.getItem("better-auth-ui.verify-email") ?? "");
  }, []);

  useEffect(() => {
    if (cooldown <= 0 || !email) return;

    const interval = setInterval(() => {
      setCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldown, email]);

  const { mutate: sendVerificationEmail, isPending } = useSendVerificationEmail(
    authClient,
    {
      onSuccess: () => {
        toast.success(localization.auth.verificationEmailSent);
        setCooldown(RESEND_COOLDOWN_SECONDS);
      },
    },
  );

  const isCoolingDown = cooldown > 0;

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {localization.auth.verifyEmail}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-4">
          <FieldDescription>
            {localization.auth.checkYourEmail}
          </FieldDescription>

          {email && (
            <div className="flex flex-col gap-3">
              <OpenEmailButton email={email} />

              <Button
                type="button"
                variant="outline"
                disabled={!email || isCoolingDown || isPending}
                onClick={() =>
                  sendVerificationEmail({
                    email,
                    callbackURL: `${baseURL}${redirectTo}`,
                  })
                }
              >
                {isPending && <Spinner />}

                {isCoolingDown
                  ? localization.auth.resendIn.replace(
                      "{{seconds}}",
                      String(cooldown),
                    )
                  : localization.auth.resend}
              </Button>
            </div>
          )}
        </div>

        {/* SIMPLEPRESS LOCAL ADDITION — "Not seeing it?" help block. Re-apply
            after re-fetching this file from the Better Auth UI registry.

            Gives visitors a way out of the duplicate-signup dead end: better-auth
            deliberately returns a fake success when someone signs up with an
            email that already has an account (anti-enumeration protection), so
            without this they'd wait forever for a verification email that was
            never sent. The third bullet is the fix. It is deliberately
            unconditional — render it for every visitor, never gate it on a
            server-side existence check, so it can never reveal whether a given
            email is registered. */}
        <div className="mt-4 flex flex-col gap-2">
          <FieldDescription className="text-foreground font-medium">
            Not seeing it?
          </FieldDescription>
          <ul className="text-muted-foreground marker:text-muted-foreground flex list-disc flex-col gap-1.5 pl-4 text-sm">
            <li>
              Delivery can take a minute. Check your spam or promotions folder.
            </li>
            <li>Double-check the address you entered.</li>
            <li>
              Already have a SimplePress account with this address? You
              won&apos;t receive a new verification email —{" "}
              <Link
                href={`${basePaths.auth}/${viewPaths.auth.signIn}`}
                className="underline underline-offset-4"
              >
                sign in
              </Link>{" "}
              or{" "}
              <Link
                href={`${basePaths.auth}/${viewPaths.auth.forgotPassword}`}
                className="underline underline-offset-4"
              >
                reset your password
              </Link>{" "}
              instead.
            </li>
          </ul>
        </div>
        {/* END SIMPLEPRESS LOCAL ADDITION */}

        <div className="mt-4 flex w-full flex-col items-center gap-3">
          <FieldDescription className="text-center">
            {localization.auth.alreadyVerifiedYourEmail}{" "}
            <Link
              href={`${basePaths.auth}/${viewPaths.auth.signIn}`}
              className="underline underline-offset-4"
            >
              {localization.auth.signIn}
            </Link>
          </FieldDescription>
        </div>
      </CardContent>
    </Card>
  );
}
