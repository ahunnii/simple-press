"use client"

import {
  authMutationKeys,
  getAuthLinkURL,
  parseAdditionalFieldValue
} from "@better-auth-ui/core"
import {
  AuthPrompts,
  useAuth,
  useFetchOptions,
  useSignUpEmail
} from "@better-auth-ui/react"
import { useIsMutating } from "@tanstack/react-query"
import { Eye, EyeOff } from "lucide-react"
// SIMPLEPRESS LOCAL ADDITION (imports) — `useEffect`/`useRef` are used by the
// terms-acceptance checkbox below.
import { type SyntheticEvent, useEffect, useRef, useState } from "react"
// END SIMPLEPRESS LOCAL ADDITION (imports)
import { toast } from "sonner"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
// SIMPLEPRESS LOCAL ADDITION (imports) — `Checkbox` + `FieldContent` are used
// by the terms-acceptance checkbox below.
import { Checkbox } from "~/components/ui/checkbox"
// END SIMPLEPRESS LOCAL ADDITION (imports)
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator
} from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "~/components/ui/input-group"
import { Spinner } from "~/components/ui/spinner"
import { cn } from "~/lib/utils"
import { AdditionalField } from "./additional-field"
import { ProviderButtons, type SocialLayout } from "./provider-buttons"
// SIMPLEPRESS LOCAL ADDITION (imports) — inline auth error reporting.
// Re-apply after re-fetching this file from the Better Auth UI registry.
import {
  type AuthErrorInfo,
  resolveAuthErrorMessage
} from "~/lib/auth/auth-error-messages"
import { AuthErrorAlert } from "./auth-error-alert"
// END SIMPLEPRESS LOCAL ADDITION (imports)
// SIMPLEPRESS LOCAL ADDITION (imports) — absolute links for the terms
// checkbox: this form renders on tenant subdomains/custom domains, so a
// relative `/platform/policies/...` link would resolve to the merchant's
// site instead of the platform's.
import { env } from "~/env"
// END SIMPLEPRESS LOCAL ADDITION (imports)

export type SignUpProps = {
  className?: string
  socialLayout?: SocialLayout
  socialPosition?: "top" | "bottom"
  /**
   * Runs instead of the post-sign-up redirect, but only when the sign-up
   * created an immediately usable session. Email verification still takes
   * priority, and social sign-ups are unaffected.
   */
  onSignUpSuccess?: () => void
}

/**
 * Renders a sign-up form with name, email, and password fields, optional social provider buttons, and submission handling.
 *
 * Submits credentials to the configured auth client and handles the response:
 * - If email verification is required, shows a notification and navigates to sign-in
 * - On success, refreshes the session and navigates to the configured redirect path
 * - On failure, displays error toasts
 * - Manages a pending state while the request is in-flight
 *
 * @param className - Additional CSS classes applied to the outer container
 * @param socialLayout - Social layout to apply to the component
 * @param socialPosition - Social position to apply to the component
 * @param onSignUpSuccess - Replaces the post-sign-up redirect when the new account is immediately usable
 * @returns The sign-up form React element.
 */
export function SignUp({
  className,
  socialLayout,
  socialPosition = "bottom",
  onSignUpSuccess
}: SignUpProps) {
  const {
    additionalFields,
    authClient,
    basePaths,
    emailAndPassword,
    localization,
    plugins,
    redirectTo,
    socialProviders,
    viewPaths,
    navigate,
    Link
  } = useAuth()

  const { fetchOptions, resetFetchOptions } = useFetchOptions()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // SIMPLEPRESS LOCAL ADDITION — inline auth error, rendered in the form
  // instead of only as a toast. Re-apply after a registry re-fetch.
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null)
  // END SIMPLEPRESS LOCAL ADDITION

  const { mutate: signUpEmail, isPending: signUpEmailPending } = useSignUpEmail(
    authClient,
    {
      onError: (error) => {
        setPassword("")
        setConfirmPassword("")
        resetFetchOptions()

        // SIMPLEPRESS LOCAL ADDITION — additive; everything above is upstream.
        setAuthError(resolveAuthErrorMessage(error))
        // END SIMPLEPRESS LOCAL ADDITION
      },
      onSuccess: (_data, { email }) => {
        if (emailAndPassword?.requireEmailVerification) {
          sessionStorage.setItem("better-auth-ui.verify-email", email)
          navigate({
            to: getAuthLinkURL(
              `${basePaths.auth}/${viewPaths.auth.verifyEmail}`,
              redirectTo
            )
          })
        } else if (onSignUpSuccess) {
          onSignUpSuccess()
        } else {
          navigate({ to: redirectTo })
        }
      }
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
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false)

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  // SIMPLEPRESS LOCAL ADDITION — platform terms-of-service acceptance.
  //
  // This account is portable across every storefront on the platform, so it
  // can only carry acceptance of SimplePress's own Terms of Service +
  // Privacy Policy here — never an individual merchant's terms (those are
  // captured per-order at checkout, see `Order.termsAcceptedAt`). The
  // checkbox below only *signals* that the box was checked; the actual
  // timestamp and policy version are stamped server-side in
  // `src/server/better-auth/config.tsx`, which is the only place allowed to
  // decide "when" and "which version" — the client cannot supply either.
  //
  // Wired the same way `CheckboxField` in `additional-field.tsx` documents:
  // Radix's `CheckboxPrimitive.Root` renders a `<button role="checkbox">`
  // plus its own hidden bubble `<input type="checkbox" required>`, and that
  // bubble input's `invalid` event does not bubble — so a parent
  // `onInvalid` prop never fires. A capture-phase listener on the wrapping
  // `Field` reaches it on the way down instead, suppresses the native
  // balloon, and renders the message through `<FieldError>` like every
  // sibling field.
  //
  // Re-apply after a registry re-fetch.
  const termsFieldRef = useRef<HTMLDivElement>(null)
  const [termsError, setTermsError] = useState<string>()

  useEffect(() => {
    const node = termsFieldRef.current
    if (!node) return

    const handleInvalid = (event: Event) => {
      event.preventDefault()

      if (event.target instanceof HTMLInputElement) {
        setTermsError(event.target.validationMessage)
      }
    }

    node.addEventListener("invalid", handleInvalid, true)
    return () => node.removeEventListener("invalid", handleInvalid, true)
  }, [])

  const platformOrigin = `https://${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`
  const platformTermsUrl = `${platformOrigin}/platform/policies/terms-of-service`
  const platformPrivacyUrl = `${platformOrigin}/platform/policies/privacy-policy`
  // END SIMPLEPRESS LOCAL ADDITION

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    // SIMPLEPRESS LOCAL ADDITION — drop the previous failure before retrying.
    setAuthError(null)
    // END SIMPLEPRESS LOCAL ADDITION

    const formData = new FormData(e.currentTarget)
    // `emailAndPassword.name === false` hides the name field and submits "".
    const name = (formData.get("name") as string | null) ?? ""
    const email = formData.get("email") as string

    if (emailAndPassword?.confirmPassword && password !== confirmPassword) {
      toast.error(localization.auth.passwordsDoNotMatch)
      setPassword("")
      setConfirmPassword("")
      return
    }

    const additionalFieldValues: Record<string, unknown> = {}

    for (const field of additionalFields ?? []) {
      if (!field.signUp || field.readOnly) continue
      const value = parseAdditionalFieldValue(
        field,
        formData.get(field.name) as string | null
      )

      if (field.validate) {
        try {
          await field.validate(value)
        } catch (error) {
          toast.error(error instanceof Error ? error.message : String(error))
          return
        }
      }

      if (value !== undefined) {
        additionalFieldValues[field.name] = value
      }
    }

    // SIMPLEPRESS LOCAL ADDITION — terms-of-service acceptance signal.
    //
    // The terms checkbox is `required`, so native validation already
    // refused to dispatch this `submit` event unless it was checked; this
    // is just that fact carried over the wire as an explicit boolean.
    // `config.tsx` reads it to decide *whether* to stamp
    // `termsAcceptedAt`, but computes the timestamp and version itself —
    // the client never gets to supply either. Folded into
    // `additionalFieldValues` (typed `Record<string, unknown>`) rather than
    // passed as its own literal property below, since `useSignUpEmail`'s
    // params type doesn't declare this key and a literal property would
    // fail TypeScript's excess-property check; a spread does not.
    // Re-apply after a registry re-fetch.
    additionalFieldValues.termsAccepted = true
    // END SIMPLEPRESS LOCAL ADDITION

    // SIMPLEPRESS LOCAL ADDITION — refuse to submit an unsolved captcha.
    //
    // `captchaPlugin` only writes the `x-captcha-response` header once the
    // widget resolves a token, and better-auth's `captcha()` middleware 400s
    // the request when the header is absent. Checked last, after the cheap
    // local validations, so nobody solves a captcha only to be told their
    // passwords do not match.
    //
    // Re-apply after a registry re-fetch.
    if (Captcha && !fetchOptions?.headers?.["x-captcha-response"]) {
      setAuthError(
        resolveAuthErrorMessage({ error: { code: "MISSING_RESPONSE" } })
      )
      return
    }
    // END SIMPLEPRESS LOCAL ADDITION

    signUpEmail({
      name,
      email,
      password,
      ...additionalFieldValues,
      fetchOptions
    })
  }

  const showSeparator =
    emailAndPassword?.enabled && socialProviders && socialProviders.length > 0

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <AuthPrompts view="signUp" />
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {localization.auth.signUp}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-6">
          {socialPosition === "top" && (
            <>
              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons socialLayout={socialLayout} view="signUp" />
              )}

              {showSeparator && (
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card text-xs flex items-center">
                  {localization.auth.or}
                </FieldSeparator>
              )}
            </>
          )}

          {emailAndPassword?.enabled && (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                {emailAndPassword.name !== false && (
                  <Field data-invalid={!!fieldErrors.name}>
                    <FieldLabel htmlFor="name">
                      {localization.auth.name}
                    </FieldLabel>

                    <Input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder={localization.auth.namePlaceholder}
                      required
                      disabled={isPending}
                      onChange={() => {
                        setFieldErrors((prev) => ({
                          ...prev,
                          name: undefined
                        }))
                      }}
                      onInvalid={(e) => {
                        e.preventDefault()

                        setFieldErrors((prev) => ({
                          ...prev,
                          name: localization.auth.fieldRequired
                        }))
                      }}
                      aria-invalid={!!fieldErrors.name}
                    />

                    <FieldError>{fieldErrors.name}</FieldError>
                  </Field>
                )}

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

                {additionalFields?.map(
                  (field) =>
                    field.signUp === "above" && (
                      <AdditionalField
                        key={field.name}
                        name={field.name}
                        field={field}
                        isPending={isPending}
                        optionalLabel={localization.auth.optional}
                      />
                    )
                )}

                <Field data-invalid={!!fieldErrors.password}>
                  <FieldLabel htmlFor="password">
                    {localization.auth.password}
                  </FieldLabel>

                  <InputGroup>
                    <InputGroupInput
                      id="password"
                      name="password"
                      type={isPasswordVisible ? "text" : "password"}
                      autoComplete="new-password"
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

                {emailAndPassword?.confirmPassword && (
                  <Field data-invalid={!!fieldErrors.confirmPassword}>
                    <FieldLabel htmlFor="confirmPassword">
                      {localization.auth.confirmPassword}
                    </FieldLabel>

                    <InputGroup>
                      <InputGroupInput
                        id="confirmPassword"
                        name="confirmPassword"
                        type={isConfirmPasswordVisible ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)

                          setFieldErrors((prev) => ({
                            ...prev,
                            confirmPassword: undefined
                          }))
                        }}
                        placeholder={
                          localization.auth.confirmPasswordPlaceholder
                        }
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
                            confirmPassword: msg
                          }))
                        }}
                        aria-invalid={!!fieldErrors.confirmPassword}
                      />

                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          size="icon-xs"
                          aria-label={
                            isConfirmPasswordVisible
                              ? localization.auth.hidePassword
                              : localization.auth.showPassword
                          }
                          title={
                            isConfirmPasswordVisible
                              ? localization.auth.hidePassword
                              : localization.auth.showPassword
                          }
                          onClick={() =>
                            setIsConfirmPasswordVisible((visible) => !visible)
                          }
                        >
                          {isConfirmPasswordVisible ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>

                    <FieldError>{fieldErrors.confirmPassword}</FieldError>
                  </Field>
                )}

                {additionalFields?.map(
                  (field) =>
                    field.signUp &&
                    field.signUp !== "above" && (
                      <AdditionalField
                        key={field.name}
                        name={field.name}
                        field={field}
                        isPending={isPending}
                        optionalLabel={localization.auth.optional}
                      />
                    )
                )}

                {/* SIMPLEPRESS LOCAL ADDITION — platform terms-of-service
                    checkbox. See the state/refs declared above for why this
                    needs its own capture-phase listener instead of the
                    `onInvalid` prop the fields above use.
                    Re-apply after a registry re-fetch. */}
                <Field
                  ref={termsFieldRef}
                  orientation="horizontal"
                  data-invalid={!!termsError}
                >
                  <Checkbox
                    id="termsAccepted"
                    name="termsAccepted"
                    required
                    disabled={isPending}
                    onCheckedChange={() => setTermsError(undefined)}
                    aria-invalid={!!termsError}
                  />

                  <FieldContent>
                    <FieldLabel htmlFor="termsAccepted" className="font-normal">
                      I agree to SimplePress&apos;s{" "}
                      <a
                        href={platformTermsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href={platformPrivacyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        Privacy Policy
                      </a>
                    </FieldLabel>

                    <FieldError>{termsError}</FieldError>
                  </FieldContent>
                </Field>
                {/* END SIMPLEPRESS LOCAL ADDITION */}

                {/* SIMPLEPRESS LOCAL ADDITION — reCAPTCHA v3 is invisible, so
                    this slot renders only Google's required disclosure text,
                    as fine print above the submit button.

                    Deliberately NOT a labelled/required Field. It was one back
                    when this was a visible hCaptcha checkbox that needed a
                    label; with nothing to interact with, that markup announced
                    "Verify you're human, required" to screen readers over an
                    empty field, and told sighted users to complete a step that
                    does not exist. Captcha errors now surface through
                    `AuthErrorAlert` below — the only place left to put them.
                    Re-apply after a registry re-fetch. */}
                {Captcha}
                {/* END SIMPLEPRESS LOCAL ADDITION */}

                {/* SIMPLEPRESS LOCAL ADDITION — form-level failure notice. */}
                <AuthErrorAlert error={authError} />
                {/* END SIMPLEPRESS LOCAL ADDITION */}

                <div className="flex flex-col gap-3">
                  <Button type="submit" disabled={isPending}>
                    {signUpEmailPending && <Spinner />}

                    {localization.auth.signUp}
                  </Button>

                  {plugins.flatMap((plugin) =>
                    (plugin.authButtons ?? []).map((AuthButton, index) => (
                      <AuthButton
                        key={`${plugin.id}-${index.toString()}`}
                        view="signUp"
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
                <ProviderButtons socialLayout={socialLayout} view="signUp" />
              )}
            </>
          )}
        </div>

        {emailAndPassword?.enabled && (
          <div className="flex flex-col gap-3 items-center w-full mt-4">
            <FieldDescription className="text-center">
              {localization.auth.alreadyHaveAnAccount}{" "}
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
        )}
      </CardContent>
    </Card>
  )
}
