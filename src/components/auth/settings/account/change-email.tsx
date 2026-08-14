"use client";

import type { SyntheticEvent } from "react";
import { useState } from "react";
import { getViewURL } from "@better-auth-ui/core";
import { useAuth, useChangeEmail, useSession } from "@better-auth-ui/react";
import { toast } from "sonner";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Spinner } from "~/components/ui/spinner";

export type ChangeEmailProps = {
  className?: string;
};

/**
 * Render a card containing a form to view and update the authenticated user's email.
 *
 * Shows a loading skeleton until session data is available, displays the current
 * email as the form's default value, and sends a verification email to the
 * new address upon successful submission.
 *
 * @returns A JSX element rendering the change-email card and form
 */
export function ChangeEmail({ className }: ChangeEmailProps) {
  const { authClient, basePaths, baseURL, localization, viewPaths } = useAuth();
  const { data: session } = useSession(authClient);

  const { mutate: changeEmail, isPending } = useChangeEmail(authClient, {
    onSuccess: () => toast.success(localization.settings.changeEmailSuccess),
  });

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
  }>({});

  function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    changeEmail({
      newEmail: formData.get("email") as string,
      callbackURL: getViewURL(
        baseURL,
        basePaths.settings,
        viewPaths.settings.account,
      ),
    });
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">
        {localization.settings.changeEmail}
      </h2>

      <form onSubmit={handleSubmit}>
        <Card className={cn(className)}>
          <CardContent className="flex flex-col gap-6">
            <Field data-invalid={!!fieldErrors.email}>
              <FieldLabel htmlFor="email">{localization.auth.email}</FieldLabel>

              {session ? (
                <Input
                  key={session?.user.email}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={session?.user.email}
                  placeholder={localization.auth.emailPlaceholder}
                  disabled={isPending}
                  required
                  onChange={() => {
                    setFieldErrors((prev) => ({
                      ...prev,
                      email: undefined,
                    }));
                  }}
                  onInvalid={(e) => {
                    e.preventDefault();
                    setFieldErrors((prev) => ({
                      ...prev,
                      email: (e.target as HTMLInputElement).validationMessage,
                    }));
                  }}
                  aria-invalid={!!fieldErrors.email}
                />
              ) : (
                <Skeleton>
                  <Input className="invisible" />
                </Skeleton>
              )}

              <FieldError>{fieldErrors.email}</FieldError>
            </Field>
          </CardContent>

          {/* SIMPLEPRESS LOCAL ADDITION — restore right-aligned action + top padding that the
              old better-auth-ui CardFooter provided (bare shadcn CardFooter has no vertical
              padding above the border-t divider); re-apply after re-fetching this file from
              the Better Auth UI registry. */}
          <CardFooter className="justify-end border-t pt-6">
            <Button type="submit" size="sm" disabled={isPending || !session}>
              {isPending && <Spinner />}

              {localization.settings.updateEmail}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
