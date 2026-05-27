import Image from "next/image";
import Link from "next/link";
import { AuthView } from "@daveyplate/better-auth-ui";
import { ArrowLeft } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";

import { DefaultPlatformBadge } from "./default-platform-badge";

type Props = {
  redirectTo: string;
  business: RouterOutputs["business"]["simplifiedGet"];
};

export function DefaultForgotPasswordPage({ redirectTo, business }: Props) {
  const isPlatformRoot = !business;
  const themeSpecificFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const signInImageUrl =
    themeSpecificFields?.[
      `${business?.templateId}.global.authentication-image`
    ]?.trim() ?? "/placeholder.svg";

  const logoSizeWidth =
    themeSpecificFields?.[
      `${business?.templateId}.global.logo-size-width`
    ]?.trim() ?? "80";

  const logoSizeHeight =
    themeSpecificFields?.[
      `${business?.templateId}.global.logo-size-height`
    ]?.trim() ?? "80";
  return (
    <div className="bg-background flex min-h-screen">
      {/* ── Left panel (desktop only) ── */}
      <div className="bg-primary relative hidden overflow-hidden lg:flex lg:w-1/2">
        {signInImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage: `url('${signInImageUrl}')`,
            }}
          />
        )}

        <div className="text-primary-foreground relative z-10 flex flex-col justify-between p-12">
          {/* Logo / name */}
          <Link
            href="/"
            className="text-primary-foreground flex w-fit items-center gap-2 transition-opacity hover:opacity-80"
          >
            {business?.siteContent?.logoUrl ? (
              <Image
                src={business.siteContent.logoUrl}
                alt={business.name}
                width={parseInt(logoSizeWidth)}
                height={parseInt(logoSizeHeight)}
                className="rounded-full"
              />
            ) : (
              <span className="text-xl font-bold">
                {isPlatformRoot ? "SimplePress" : business.name}
              </span>
            )}
          </Link>

          {/* Headline */}
          <div className="max-w-md">
            <h1 className="mb-4 text-4xl font-bold text-balance">
              {isPlatformRoot
                ? "Forgot your password?"
                : `Forgot your password?`}
            </h1>
            <p className="text-primary-foreground/80 mb-8 text-lg">
              {isPlatformRoot
                ? "Enter your email to reset your password."
                : `Enter your email to reset your password for ${business.name}.`}
            </p>

            {/* Platform context callout — only shown on store pages */}
            {!isPlatformRoot && (
              <div className="bg-primary-foreground/10 border-primary-foreground/20 rounded-lg border p-4">
                <p className="text-primary-foreground/90 text-sm leading-relaxed">
                  <span className="font-semibold">
                    Using a SimplePress account.
                  </span>{" "}
                  Your login works across all stores on the SimplePress platform
                  — one account, everywhere. Resetting your password will sign
                  you out of all other stores.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-primary-foreground/60 text-sm">
            {isPlatformRoot ? (
              <>© 2026 SimplePress. All rights reserved.</>
            ) : (
              <>
                © 2026 {business.name}. All rights reserved.
                <span className="text-muted-foreground mx-2">|</span>
                Site created with{" "}
                <Link
                  href="https://simplepress.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground underline"
                >
                  SimplePress
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="border-b p-4 lg:hidden">
          <Link
            href="/"
            className="text-foreground flex w-fit items-center gap-2 transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm">Back to Home</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md space-y-6">
            {/* Mobile brand */}
            <div className="flex flex-col items-center gap-2 lg:hidden">
              <span className="text-foreground text-xl font-bold">
                {isPlatformRoot ? "SimplePress" : business.name}
              </span>
            </div>

            {/* Platform context banner — mobile + desktop right panel */}
            {!isPlatformRoot && (
              <DefaultPlatformBadge
                businessName={business.name}
                view="sign-in"
              />
            )}

            <AuthView
              view="FORGOT_PASSWORD"
              redirectTo={redirectTo}
              classNames={{ base: "max-w-full" }}
            />

            <div className="mt-4 hidden text-left lg:block">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>

        <div className="text-muted-foreground border-t p-4 text-center text-xs">
          By utilizing this service, you agree to our{" "}
          <Link
            href="/platform/terms-of-service"
            className="text-primary hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/platform/privacy-policy"
            className="text-primary hover:underline"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
