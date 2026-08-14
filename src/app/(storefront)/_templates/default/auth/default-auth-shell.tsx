import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { TemplateField } from "~/lib/template-fields";
import type { RouterOutputs } from "~/trpc/react";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolveTemplateFields, TEMPLATE_FIELDS } from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { PreviewOverlay } from "~/components/preview/preview-overlay";

import { AuthPreviewGuard } from "./auth-preview-guard";
import { DefaultPlatformBadge } from "./default-platform-badge";

const LEGAL_LEAD_IN = {
  "sign-in": "By signing in, you agree to our",
  "sign-up": "By signing up, you agree to our",
  generic: "By utilizing this service, you agree to our",
} as const;

/**
 * The three owner-editable fields this shell reads, as `global`-page key
 * suffixes, mapped to the value used when NOTHING supplies one.
 *
 * Nine templates declare these under `group: "global.authentication"`, but not
 * identically: `sledge` and `noise` declare the image with no `defaultValue`,
 * and four templates (`sledge`, `noise`, `pink`, `vii`) don't declare the
 * logo-size fields at all. These fallbacks are the values this shell hardcoded
 * before it went through `resolveTemplateFields`, so those templates render
 * exactly as they did.
 */
const AUTH_FIELD_FALLBACKS = {
  "authentication-image": "/placeholder.svg",
  "logo-size-width": "80",
  "logo-size-height": "80",
} as const;

type ResolvedAuthFields = {
  /** Background image for the desktop-only left panel; "" hides it. */
  authImageUrl: string;
  logoSizeWidth: string;
  logoSizeHeight: string;
  /**
   * Whether this template declares the auth fields at all — drives the
   * click-to-edit hotspot, since the visual editor only registers a
   * `global.authentication` section for templates that do.
   */
  declaresAuthFields: boolean;
};

/**
 * Resolves the auth fields for `templateId` through the normal template-field
 * pipeline: owner-saved value → the template's declared `defaultValue` →
 * `AUTH_FIELD_FALLBACKS`.
 *
 * The fallback is threaded in as a synthetic `defaultValue` rather than as a
 * `||` on the result so the resolution keeps its exact prior semantics: an
 * ABSENT key falls back, while a key the owner explicitly cleared resolves to
 * `""` (which hides the side image instead of resurrecting the placeholder).
 * Only `defaultValue` is read off the map, so the synthetic entries below need
 * no accurate `type`/`label`.
 */
function resolveAuthFields(
  templateId: string | undefined,
  customFields: unknown,
): ResolvedAuthFields {
  const prefix = `${templateId ?? ""}.global.`;
  const declared = new Map(
    (templateId ? (TEMPLATE_FIELDS[templateId] ?? []) : []).map(
      (field) => [field.key, field] as const,
    ),
  );

  const fieldMap = new Map<string, TemplateField>();
  for (const [suffix, fallback] of Object.entries(AUTH_FIELD_FALLBACKS)) {
    const key = `${prefix}${suffix}`;
    const declaredField = declared.get(key);
    fieldMap.set(key, {
      key,
      label: declaredField?.label ?? suffix,
      description: declaredField?.description ?? "",
      page: "global",
      type: "text",
      defaultValue: declaredField?.defaultValue ?? fallback,
    });
  }

  const resolved = resolveTemplateFields(
    customFields,
    Array.from(fieldMap.keys()),
    fieldMap,
  );

  return {
    authImageUrl: resolved[`${prefix}authentication-image`] ?? "",
    logoSizeWidth: resolved[`${prefix}logo-size-width`] ?? "",
    logoSizeHeight: resolved[`${prefix}logo-size-height`] ?? "",
    declaresAuthFields: declared.has(`${prefix}authentication-image`),
  };
}

/** Pixel size for `next/image`, guarding against a cleared/garbage value. */
function parseLogoSize(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

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

  // Owner-editable fields, resolved through the template registry so each
  // template's declared `defaultValue`s apply (they were previously ignored in
  // favour of hardcoded values). In the visual editor's preview iframe these
  // read from the DRAFT — `business.simplifiedGet` swaps
  // `customFields ← previewCustomFields` under the preview guard.
  const { authImageUrl, logoSizeWidth, logoSizeHeight, declaresAuthFields } =
    resolveAuthFields(
      business?.templateId,
      business?.siteContent?.customFields,
    );

  // Several templates also declare a `global.image-overlay-color` field; the
  // overlay it drives is still commented out below. To wire it up, add
  // `"image-overlay-color": "#000000"` to AUTH_FIELD_FALLBACKS above and read
  // it off the resolved record.

  const brandName = isPlatformRoot ? "SimplePress" : business.name;

  return (
    <div className="bg-background flex min-h-screen">
      {/* ── Left panel (desktop only) ──
          Click-to-edit hotspot for the visual editor's "Authentication" page.
          Only emitted for templates that declare the fields — otherwise there
          is no matching editor section for the overlay to open. */}
      <div
        {...(declaresAuthFields
          ? sectionGroupAttr("global", "authentication")
          : {})}
        className="bg-primary relative hidden overflow-hidden lg:flex lg:w-1/2"
      >
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
                width={parseLogoSize(logoSizeWidth, 80)}
                height={parseLogoSize(logoSizeHeight, 80)}
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

            {/* Live auth form. Neutralised (only) inside the editor preview
                iframe — see AuthPreviewGuard: the iframe's nav guard blocks
                link clicks but not form submissions, so an owner poking at
                the preview would really sign in and navigate it away. */}
            <AuthPreviewGuard>{children}</AuthPreviewGuard>

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

      {/*
        Auth routes never enter `(storefront)/layout.tsx`, which is where the
        overlay is normally mounted, so the hotspot above would be dead here
        without this. Mounted unconditionally — the overlay self-disables
        outside a preview iframe (see `preview-overlay.tsx`), the same pattern
        the storefront layout uses.

        `PreviewFieldPatcher` is deliberately NOT mounted: it only patches
        `[data-sp-field]` text nodes for text/textarea fields, and all three
        auth fields are image/number types, which always take the
        draft-save + iframe-reload path anyway.
      */}
      <PreviewOverlay />
    </div>
  );
}
