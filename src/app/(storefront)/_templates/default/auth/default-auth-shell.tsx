import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { cn } from "~/lib/utils";

import { DefaultPlatformBadge } from "./default-platform-badge";

const LEGAL_LEAD_IN = {
  "sign-in": "By signing in, you agree to our",
  "sign-up": "By signing up, you agree to our",
  generic: "By utilizing this service, you agree to our",
} as const;

type Props = {
  /** `null` => platform root (e.g. platform admins / invited team members). */
  business: RouterOutputs["business"]["simplifiedGet"];
  /** Left-panel `<h1>`. Callers resolve their own platform-root wording. */
  headline: string;
  /** Left-panel lede under the headline. */
  subhead: string;
  /** Optional block rendered between the lede and the callout (sign-up benefits). */
  beforeCallout?: ReactNode;
  /** Contents of the `bg-primary-foreground/10` box. Omit to hide the box. */
  callout?: ReactNode;
  /** Extra classes for that box (sign-up needs `mt-8` under its benefits list). */
  calloutClassName?: string;
  /** Renders `DefaultPlatformBadge` above the card — store pages only. */
  badgeView?: "sign-in" | "sign-up" | null;
  /** Lead-in wording for the bottom legal strip. Omit to hide the strip. */
  legalFooter?: "sign-in" | "sign-up" | "generic" | null;
  /** Scrolls the right panel and makes the mobile top bar sticky (sign-up). */
  scrollable?: boolean;
  /** The auth card itself. */
  children: ReactNode;
};

/**
 * Split-screen shell shared by the default template's auth pages
 * (sign-in, sign-up, forgot-password, reset-password).
 *
 * Used at both store subdomains (business != null) and the platform root
 * (business == null); `isPlatformRoot` drives every copy branch.
 */
export function DefaultAuthShell({
  business,
  headline,
  subhead,
  beforeCallout,
  callout,
  calloutClassName,
  badgeView,
  legalFooter,
  scrollable = false,
  children,
}: Props) {
  const isPlatformRoot = !business;
  const themeSpecificFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const authImageUrl =
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
  //     `${business?.templateId}.global.image-overlay-color`
  //   ]?.trim() ?? "#000000";

  const brandName = isPlatformRoot ? "SimplePress" : business.name;

  return (
    <div className="bg-background flex min-h-screen">
      {/* ── Left panel (desktop only) ── */}
      <div className="bg-primary relative hidden overflow-hidden lg:flex lg:w-1/2">
        {authImageUrl && (
          <div
            className={cn(
              "absolute inset-0 bg-cover bg-center opacity-20",
              // `bg-[#${imageOverlayColor}]`,
            )}
            style={{
              backgroundImage: `url('${authImageUrl}')`,
              // backgroundColor: imageOverlayColor,
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
                alt={resolveLogoAlt(
                  business.siteContent?.logoAltText,
                  business.name,
                )}
                width={parseInt(logoSizeWidth)}
                height={parseInt(logoSizeHeight)}
                className="rounded-full"
              />
            ) : (
              <span className="text-xl font-bold">{brandName}</span>
            )}
          </Link>

          {/* Headline */}
          <div className="max-w-md">
            <h1 className="mb-4 text-4xl font-bold text-balance">{headline}</h1>
            <p className="text-primary-foreground/80 mb-8 text-lg">{subhead}</p>

            {beforeCallout}

            {/* Platform context callout */}
            {callout && (
              <div
                className={cn(
                  "bg-primary-foreground/10 border-primary-foreground/20 rounded-lg border p-4",
                  calloutClassName,
                )}
              >
                <p className="text-primary-foreground/90 text-sm leading-relaxed">
                  {callout}
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
                  <span className="sr-only"> (opens in new tab)</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div
        className={cn("flex flex-1 flex-col", scrollable && "overflow-y-auto")}
      >
        {/* Mobile top bar */}
        <div
          className={cn(
            "border-b p-4 lg:hidden",
            scrollable && "bg-background sticky top-0 z-10",
          )}
        >
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
                {brandName}
              </span>
            </div>

            {/*
             * Platform context banner shown on the form side.
             * This is the key UX element:
             * - Tells user this is a SimplePress account
             * - Prevents "I got hacked" confusion if they already have one
             */}
            {badgeView && !isPlatformRoot && (
              <DefaultPlatformBadge
                businessName={business.name}
                view={badgeView}
              />
            )}

            {children}

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

        {legalFooter && (
          <div className="text-muted-foreground border-t p-4 text-center text-xs">
            {LEGAL_LEAD_IN[legalFooter]}{" "}
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
        )}
      </div>
    </div>
  );
}
