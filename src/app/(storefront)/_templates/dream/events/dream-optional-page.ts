import { resolveLogoAlt } from "~/lib/logo-alt";

/**
 * Small helpers shared by dream's optional pages (events, event detail,
 * videos, donate, FAQ — parity PF20). They live here rather than in
 * `shared/` because that folder belongs to the template's core primitives.
 */

/** First non-blank string wins (a cleared field resolves to "", not null). */
export function firstFilled(
  ...candidates: (string | null | undefined)[]
): string {
  return candidates.find((c) => c?.trim()) ?? "";
}

type LogoSource = {
  name?: string | null;
  siteContent?: {
    logoUrl?: string | null;
    logoAltText?: string | null;
  } | null;
};

/**
 * The page-hero logo, resolved exactly as `DreamGenericPage` does it: the
 * business logo, else dream's bundled mark, with the shared alt-text rule.
 */
export function resolveDreamPageLogo(business: LogoSource): {
  logoUrl: string;
  logoAlt: string;
} {
  return {
    logoUrl:
      business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp",
    logoAlt: resolveLogoAlt(
      business.siteContent?.logoAltText,
      business.name ?? "",
    ),
  };
}
