"use client"

import { getAuthLinkURL } from "@better-auth-ui/core"
import { useAuth } from "@better-auth-ui/react"
import { useEffect, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { FieldDescription } from "~/components/ui/field"
import { cn } from "~/lib/utils"
import { OpenEmailButton } from "./open-email-button"
import { useIsHydrated } from "./use-is-hydrated"

/** `sessionStorage` key the forgot-password form stores the submitted email under. */
export const RESET_LINK_SENT_STORAGE_KEY = "better-auth-ui.reset-link-sent"

export type ResetLinkSentProps = {
  className?: string
}

/**
 * Render a card confirming that a password-reset email was sent, with a
 * button to open the user's email provider.
 *
 * The target email is read from `sessionStorage` (set when the forgot-password
 * form redirects here); the OpenEmail button is only shown when an email is
 * stored and resolves to a known provider.
 *
 * @param className - Additional CSS classes applied to the card
 * @returns The reset-link-sent card React element
 */
export function ResetLinkSent({ className }: ResetLinkSentProps) {
  const { basePaths, localization, redirectTo, viewPaths, Link } = useAuth()

  const isHydrated = useIsHydrated()
  const [email, setEmail] = useState(
    (isHydrated && sessionStorage.getItem(RESET_LINK_SENT_STORAGE_KEY)) || ""
  )

  useEffect(() => {
    setEmail(sessionStorage.getItem(RESET_LINK_SENT_STORAGE_KEY) ?? "")
  }, [])

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {localization.auth.checkYourEmailTitle}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-4">
          <FieldDescription>
            {email
              ? localization.auth.resetLinkSentTo.replace("{{email}}", email)
              : localization.auth.passwordResetEmailSent}
          </FieldDescription>

          {email && <OpenEmailButton email={email} />}
        </div>

        {/* SIMPLEPRESS LOCAL ADDITION — "Not seeing it?" help block. Re-apply
            after re-fetching this file from the Better Auth UI registry.

            Adds spam-folder guidance plus a way forward for visitors who
            entered an email with no account — matches the same treatment
            added to verify-email.tsx. */}
        <div className="flex flex-col gap-2 mt-4">
          <FieldDescription className="font-medium text-foreground">
            Not seeing it?
          </FieldDescription>
          <ul className="flex flex-col gap-1.5 pl-4 text-sm text-muted-foreground list-disc marker:text-muted-foreground">
            <li>Check your spam or promotions folder.</li>
            <li>
              If no account exists for that address, no email is sent.{" "}
              <Link
                href={getAuthLinkURL(
                  `${basePaths.auth}/${viewPaths.auth.signUp}`,
                  redirectTo
                )}
                className="underline underline-offset-4"
              >
                Create an account
              </Link>
              .
            </li>
          </ul>
        </div>
        {/* END SIMPLEPRESS LOCAL ADDITION */}

        <div className="flex flex-col gap-3 items-center w-full mt-4">
          <FieldDescription className="text-center">
            {localization.auth.rememberYourPassword}{" "}
            <Link
              href={getAuthLinkURL(
                `${basePaths.auth}/${viewPaths.auth.signIn}`,
                redirectTo
              )}
              className="underline underline-offset-4"
            >
              {localization.auth.signIn}
            </Link>
          </FieldDescription>
        </div>
      </CardContent>
    </Card>
  )
}
