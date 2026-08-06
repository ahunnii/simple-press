"use client"

import { authMutationKeys } from "@better-auth-ui/core"
import {
  AuthPrompts,
  useAuth,
  useFetchOptions,
  useSignInEmail
} from "@better-auth-ui/react"
import { useIsMutating } from "@tanstack/react-query"
import { Eye, EyeOff } from "lucide-react"
import { type SyntheticEvent, useState } from "react"

import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Checkbox } from "~/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  // SIMPLEPRESS LOCAL ADDITION — labels the captcha group.
  FieldTitle
} from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "~/components/ui/input-group"
import { Spinner } from "~/components/ui/spinner"
import { useSignInContinuation } from "~/lib/auth/use-sign-in-continuation"
import { cn } from "~/lib/utils"
import { LastUsedBadge } from "./last-login-method/last-used-badge"
import { ProviderButtons, type SocialLayout } from "./provider-buttons"
// SIMPLEPRESS LOCAL ADDITION (imports) — inline auth error reporting.
// Re-apply after re-fetching this file from the Better Auth UI registry.
import {
  type AuthErrorInfo,
  resolveAuthErrorMessage
} from "~/lib/auth/auth-error-messages"
import { AuthErrorAlert } from "./auth-error-alert"
// END SIMPLEPRESS LOCAL ADDITION (imports)

export type SignInProps = {
  className?: string
  socialLayout?: SocialLayout
  socialPosition?: "top" | "bottom"
}

/**
 * Render the sign-in form UI with email/password, magic link, and social provider options.
 *
 * @param className - Optional additional container class names
 * @param socialLayout - Layout style for social provider buttons
 * @param socialPosition - Position of social provider buttons; `"top"` or `"bottom"`. Defaults to `"bottom"`.
 * @returns The rendered sign-in UI as a JSX element
 */
export function SignIn({
  className,
  socialLayout,
  socialPosition = "bottom"
}: SignInProps) {
  const {
    authClient,
    basePaths,
    emailAndPassword,
    localization,
    plugins,
    socialProviders,
    viewPaths,
    navigate,
    Link
  } = useAuth()

  const { fetchOptions, resetFetchOptions } = useFetchOptions()
  const continueSignIn = useSignInContinuation()

  const [password, setPassword] = useState("")

  // SIMPLEPRESS LOCAL ADDITION — inline auth error, rendered in the form
  // instead of only as a toast. Re-apply after a registry re-fetch.
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null)
  // END SIMPLEPRESS LOCAL ADDITION

  const { mutate: signInEmail, isPending: signInEmailPending } = useSignInEmail(
    authClient,
    {
      onError: (error, { email }) => {
        setPassword("")

        // SIMPLEPRESS LOCAL ADDITION — additive; the existing reset,
        // navigation, and toast behaviour below is untouched.
        setAuthError(resolveAuthErrorMessage(error))
        // END SIMPLEPRESS LOCAL ADDITION

        if (error.error?.code === "EMAIL_NOT_VERIFIED") {
          sessionStorage.setItem("better-auth-ui.verify-email", email)
          navigate({
            to: `${basePaths.auth}/${viewPaths.auth.verifyEmail}`
          })
        }

        resetFetchOptions()
      },
      onSuccess: (data) => continueSignIn(data)
    }
  )

  const signInMutating = useIsMutating({
    mutationKey: authMutationKeys.signIn.all
  })
  const signUpMutating = useIsMutating({
    mutationKey: authMutationKeys.signUp.all
  })
  const isPending = signInMutating + signUpMutating > 0

  const Captcha = plugins.find(
    (plugin) => plugin.captchaComponent
  )?.captchaComponent

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    // SIMPLEPRESS LOCAL ADDITION — clear the previous failure, then refuse to
    // submit an unsolved captcha.
    //
    // `captchaPlugin` only writes the `x-captcha-response` header once the
    // widget resolves a token, and better-auth's `captcha()` middleware 400s
    // the request when the header is absent. Catching that here keeps the
    // round trip (and the wasted attempt against the auth rate limit) out of
    // the picture and points the user straight at the widget.
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
    const email = formData.get("email") as string
    const rememberMe = formData.get("rememberMe") === "on"

    signInEmail({
      email,
      password,
      ...(emailAndPassword?.rememberMe ? { rememberMe } : {}),
      fetchOptions
    })
  }

  const showSeparator =
    emailAndPassword?.enabled && socialProviders && socialProviders.length > 0

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <AuthPrompts view="signIn" />
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {localization.auth.signIn}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-6">
          {socialPosition === "top" && (
            <>
              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons socialLayout={socialLayout} view="signIn" />
              )}

              {showSeparator && (
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card m-0 text-xs flex items-center">
                  {localization.auth.or}
                </FieldSeparator>
              )}
            </>
          )}

          {emailAndPassword?.enabled && (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field data-invalid={!!fieldErrors.email}>
                  <FieldLabel htmlFor="email">
                    {localization.auth.email}
                  </FieldLabel>

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

                <Field data-invalid={!!fieldErrors.password}>
                  <FieldLabel htmlFor="password">
                    {localization.auth.password}
                  </FieldLabel>

                  <InputGroup>
                    <InputGroupInput
                      id="password"
                      name="password"
                      type={isPasswordVisible ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)

                        setFieldErrors((prev) => ({
                          ...prev,
                          password: undefined
                        }))
                      }}
                      placeholder={localization.auth.passwordPlaceholder}
                      required
                      minLength={emailAndPassword?.minPasswordLength}
                      maxLength={emailAndPassword?.maxPasswordLength}
                      disabled={isPending}
                      onInvalid={(e) => {
                        e.preventDefault()
                        const el = e.target as HTMLInputElement
                        const min = emailAndPassword?.minPasswordLength
                        const max = emailAndPassword?.maxPasswordLength
                        const msg = el.validity.valueMissing
                          ? localization.auth.fieldRequired
                          : el.validity.tooShort
                            ? localization.auth.tooShort.replace(
                                "{{min}}",
                                String(min)
                              )
                            : localization.auth.tooLong.replace(
                                "{{max}}",
                                String(max)
                              )

                        setFieldErrors((prev) => ({
                          ...prev,
                          password: msg
                        }))
                      }}
                      aria-invalid={!!fieldErrors.password}
                    />

                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-xs"
                        aria-label={
                          isPasswordVisible
                            ? localization.auth.hidePassword
                            : localization.auth.showPassword
                        }
                        title={
                          isPasswordVisible
                            ? localization.auth.hidePassword
                            : localization.auth.showPassword
                        }
                        onClick={() => {
                          setIsPasswordVisible((visible) => !visible)
                        }}
                      >
                        {isPasswordVisible ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>

                  <FieldError>{fieldErrors.password}</FieldError>
                </Field>

                {emailAndPassword.rememberMe && (
                  <Field className="my-1">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="rememberMe"
                        name="rememberMe"
                        disabled={isPending}
                      />

                      <FieldLabel
                        htmlFor="rememberMe"
                        className="cursor-pointer text-sm font-normal"
                      >
                        {localization.auth.rememberMe}
                      </FieldLabel>
                    </div>
                  </Field>
                )}

                {/* SIMPLEPRESS LOCAL ADDITION — the captcha was an unlabelled
                    floating widget; it is now a labelled required control with
                    its own error slot. Re-apply after a registry re-fetch. */}
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
                  <Button
                    type="submit"
                    className="relative overflow-visible"
                    disabled={isPending}
                  >
                    {signInEmailPending && <Spinner />}

                    {localization.auth.signIn}

                    <LastUsedBadge method="email" floating />
                  </Button>

                  {plugins.flatMap((plugin) =>
                    (plugin.authButtons ?? []).map((AuthButton, index) => (
                      <AuthButton
                        key={`${plugin.id}-${index.toString()}`}
                        view="signIn"
                      />
                    ))
                  )}
                </div>
              </FieldGroup>
            </form>
          )}

          {socialPosition === "bottom" && (
            <>
              {showSeparator && (
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card text-xs flex items-center">
                  {localization.auth.or}
                </FieldSeparator>
              )}

              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons socialLayout={socialLayout} view="signIn" />
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 items-center w-full mt-4">
          {emailAndPassword?.enabled && emailAndPassword?.forgotPassword && (
            <Link
              href={`${basePaths.auth}/${viewPaths.auth.forgotPassword}`}
              className="self-center text-sm underline-offset-4 hover:underline"
            >
              {localization.auth.forgotPasswordLink}
            </Link>
          )}

          {emailAndPassword?.enabled && (
            <FieldDescription className="text-center">
              {localization.auth.needToCreateAnAccount}{" "}
              <Link
                href={`${basePaths.auth}/${viewPaths.auth.signUp}`}
                className="underline underline-offset-4"
              >
                {localization.auth.signUp}
              </Link>
            </FieldDescription>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
