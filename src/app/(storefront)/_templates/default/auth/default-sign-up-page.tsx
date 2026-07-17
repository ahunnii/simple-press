import Image from "next/image";
import Link from "next/link";
import { AuthView } from "@daveyplate/better-auth-ui";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";

import { DefaultPlatformBadge } from "./default-platform-badge";

export const metadata = {
  title: "Sign Up",
};

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]> | null;
  redirectTo?: string;
};

/**
 * Used at both store subdomains (business != null) and the platform root
 * (business == null — e.g. an invited team member creating their account).
 */
export function DefaultSignUpPage({ business, redirectTo }: Props) {
  const isPlatformRoot = !business;
  const themeSpecificFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const signUpImageUrl =
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

  // const imageOverlayColor =
  //   themeSpecificFields?.[
  //     `${business.templateId}.global.image-overlay-color`
  //   ]?.trim() ?? "#000000";

  return (
    <div className="bg-background flex min-h-screen">
      {/* ── Left panel (desktop only) ── */}
      <div className="bg-primary relative hidden overflow-hidden lg:flex lg:w-1/2">
        {signUpImageUrl && (
          <div
            className={cn(
              "absolute inset-0 bg-cover bg-center opacity-20",
              // `bg-[#${imageOverlayColor}]`,
            )}
            style={{
              backgroundImage: `url('${signUpImageUrl}')`,
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
              {isPlatformRoot ? "Create your account" : `Join ${business.name}`}
            </h1>
            <p className="text-primary-foreground/80 mb-8 text-lg">
              Create your SimplePress account to track orders, engage with the
              shop, and enjoy a seamless shopping experience.
            </p>

            {/* Benefits */}
            <div className="space-y-4">
              {[
                "Access your orders and account history",
                "Your account works across all SimplePress stores",
                "Engage with the shop by leaving product reviews and testimonials",
              ].map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <div className="bg-primary-foreground/20 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <p className="text-primary-foreground/90 text-sm">
                    {benefit}
                  </p>
                </div>
              ))}
            </div>

            {/* Platform context callout */}
            <div className="bg-primary-foreground/10 border-primary-foreground/20 mt-8 rounded-lg border p-4">
              <p className="text-primary-foreground/90 text-sm leading-relaxed">
                <span className="font-semibold">One account, all stores.</span>{" "}
                You&apos;re creating a SimplePress platform account
                {isPlatformRoot ? "" : ` — not just an account for ${business.name}`}
                . If you already shop at another SimplePress store, you already
                have an account. Just sign in.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-primary-foreground/60 text-sm">
            © 2026 {isPlatformRoot ? "SimplePress" : business.name}. All rights
            reserved.
            {!isPlatformRoot && (
              <>
                <span className="text-muted-foreground mx-2">|</span>
                Site created with{" "}
                <Link
                  href="https://simplepress.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground underline"
                >
                  SimplePress<span className="sr-only"> (opens in new tab)</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Mobile top bar */}
        <div className="bg-background sticky top-0 z-10 border-b p-4 lg:hidden">
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
            <div className="flex flex-col items-center gap-1 lg:hidden">
              <span className="text-foreground text-xl font-bold">
                {isPlatformRoot ? "SimplePress" : business.name}
              </span>
            </div>

            {/*
             * Platform context banner shown on the form side.
             * This is the key UX element:
             * - Tells user this is a SimplePress account
             * - Prevents "I got hacked" confusion if they already have one
             */}
            {!isPlatformRoot && (
              <DefaultPlatformBadge
                businessName={business.name}
                view="sign-up"
              />
            )}

            <AuthView
              view="SIGN_UP"
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
          By signing up, you agree to our{" "}
          <Link
            href="/platform/policies/terms-of-service"
            className="text-primary hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/platform/policies/privacy-policy"
            className="text-primary hover:underline"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
