"use client"

import { getViewURL } from "@better-auth-ui/core"
import {
  useAuth,
  useFetchOptions,
  useRequestPasswordReset
} from "@better-auth-ui/react"
import { type SyntheticEvent, useState } from "react"

import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  // SIMPLEPRESS LOCAL ADDITION — labels the captcha group.
  FieldTitle
} from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { Spinner } from "~/components/ui/spinner"
import { cn } from "~/lib/utils"
import { RESET_LINK_SENT_STORAGE_KEY } from "./reset-link-sent"
// SIMPLEPRESS LOCAL ADDITION (imports) — inline auth error reporting.
// Re-apply after re-fetching this file from the Better Auth UI registry.
import {
  type AuthErrorInfo,
  resolveAuthErrorMessage
} from "~/lib/auth/auth-error-messages"
import { AuthErrorAlert } from "./auth-error-alert"
// END SIMPLEPRESS LOCAL ADDITION (imports)

export type ForgotPasswordProps = {
  className?: string
}

/**
 * Render a card-based "Forgot Password" form that sends a password-reset email.
 *
 * The form displays an email input, submit button, and a link back to sign-in.
 * After a successful request the submitted email is stored in `sessionStorage`
 * and the user is redirected to the reset-link-sent view, which offers to open
 * their email provider.
 *
 * @param className - Optional additional CSS class names applied to the card
 * @returns The forgot-password form UI as a JSX element
 */
export function ForgotPassword({ className }: ForgotPasswordProps) {
  const {
    authClient,
    baseURL,
    basePaths,
    localization,
    navigate,
    plugins,
    viewPaths,
    Link
  } = useAuth()

  const { fetchOptions, resetFetchOptions } = useFetchOptions()

  // SIMPLEPRESS LOCAL ADDITION — inline auth error, rendered in the form
  // instead of only as a toast. Re-apply after a registry re-fetch.
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null)
  // END SIMPLEPRESS LOCAL ADDITION

  const { mutate: requestPasswordReset, isPending } = useRequestPasswordReset(
    authClient,
    {
      onError: (error) => {
        resetFetchOptions()

        // SIMPLEPRESS LOCAL ADDITION — additive; the reset above is upstream.
        setAuthError(resolveAuthErrorMessage(error))
        // END SIMPLEPRESS LOCAL ADDITION
      },
      onSuccess: (_data, { email }) => {
        sessionStorage.setItem(RESET_LINK_SENT_STORAGE_KEY, email)
        navigate({ to: `${basePaths.auth}/${viewPaths.auth.resetLinkSent}` })
      }
    }
  )

  function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()

    // SIMPLEPRESS LOCAL ADDITION — clear the previous failure, then refuse to
    // submit an unsolved captcha.
    //
    // `captchaPlugin` only writes the `x-captcha-response` header once the
    // widget resolves a token, and better-auth's `captcha()` middleware 400s
    // the request when the header is absent.
    //
    // Re-apply after a registry re-fetch.
    setAuthError(null)

    if (Captcha && !fetchOptions?.headers?.["x-captcha-response"]) {
      setAuthError(
        resolveAuthErrorMessage({ error: { code: "MISSING_RESPONSE" } })
      )
      return
    }
    // END SIMPLEPRESS LOCAL ADDITION

    const formData = new FormData(e.currentTarget)
    requestPasswordReset({
      email: formData.get("email") as string,
      redirectTo: getViewURL(
        baseURL,
        basePaths.auth,
        viewPaths.auth.resetPassword
      ),
      fetchOptions
    })
  }

  const Captcha = plugins.find(
    (plugin) => plugin.captchaComponent
  )?.captchaComponent

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
  }>({})

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {localization.auth.forgotPassword}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!fieldErrors.email}>
              <FieldLabel htmlFor="email">{localization.auth.email}</FieldLabel>

              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={localization.auth.emailPlaceholder}
                required
                disabled={isPending}
                onChange={() => {
                  setFieldErrors((prev) => ({
                    ...prev,
                    email: undefined
                  }))
                }}
                onInvalid={(e) => {
                  e.preventDefault()
                  const el = e.target as HTMLInputElement
                  const msg = el.validity.valueMissing
                    ? localization.auth.fieldRequired
                    : localization.auth.invalidEmail

                  setFieldErrors((prev) => ({
                    ...prev,
                    email: msg
                  }))
                }}
                aria-invalid={!!fieldErrors.email}
              />

              <FieldError>{fieldErrors.email}</FieldError>
            </Field>

            {/* SIMPLEPRESS LOCAL ADDITION — the captcha was an unlabelled
                floating widget; it is now a labelled required control with its
                own error slot. Re-apply after a registry re-fetch. */}
            {Captcha && (
              <Field
                aria-labelledby="captcha-label"
                data-invalid={authError?.field === "captcha"}
              >
                <FieldTitle id="captcha-label">
                  <span>
                    Verify you&apos;re human
                    <span aria-hidden="true" className="text-destructive">
                      {" *"}
                    </span>
                  </span>
                  <span className="sr-only">(required)</span>
                </FieldTitle>

                <div className="flex justify-center">{Captcha}</div>

                <FieldError>
                  {authError?.field === "captcha"
                    ? authError.message
                    : undefined}
                </FieldError>
              </Field>
            )}
            {/* END SIMPLEPRESS LOCAL ADDITION */}

            {/* SIMPLEPRESS LOCAL ADDITION — form-level failure notice. */}
            <AuthErrorAlert error={authError} />
            {/* END SIMPLEPRESS LOCAL ADDITION */}

            <div className="flex flex-col gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending && <Spinner />}

                {localization.auth.sendResetLink}
              </Button>
            </div>
          </FieldGroup>
        </form>

        <div className="flex flex-col gap-3 items-center w-full mt-4">
          <FieldDescription className="text-center">
            {localization.auth.rememberYourPassword}{" "}
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
  )
}
