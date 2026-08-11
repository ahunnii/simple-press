import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { cn } from "~/lib/utils";

import { resolveFields } from "..";
import { RelocationReveal, RelocationRevealGroup } from "./relocation-reveal";
import { RelocationSectionHeading } from "./relocation-section-heading";

/**
 * Trust band that closes every wave page (design.md → Shared component
 * inventory, and every page's last section concept): a charcoal heading over a
 * row of the four association logos (ATA / MMA / Samaritas / HireSafe).
 *
 * Content is global — one edit updates the band on Homepage, Services,
 * Backstory, Reviews, Contact and FAQ — so its fields live in the
 * `global.credentials` group. The homepage renders the shorter heading variant
 * per its screenshot; pass `heading` to override for any other one-off.
 */

const LOGO_KEYS = [
  {
    src: "relocation.global.credentials.logo-1",
    alt: "relocation.global.credentials.logo-1-alt",
  },
  {
    src: "relocation.global.credentials.logo-2",
    alt: "relocation.global.credentials.logo-2-alt",
  },
  {
    src: "relocation.global.credentials.logo-3",
    alt: "relocation.global.credentials.logo-3-alt",
  },
  {
    src: "relocation.global.credentials.logo-4",
    alt: "relocation.global.credentials.logo-4-alt",
  },
] as const;

export function RelocationCredentialsBand({
  customFields,
  heading,
  className,
}: {
  customFields: unknown;
  /** Overrides the standard heading (the homepage passes its shorter variant). */
  heading?: string;
  className?: string;
}) {
  // Self-gate: the band is chrome on six pages, so its visibility toggle lives
  // at the global level (sections.ts → "global.credentials") and is honored
  // here once, not per page.
  if (!isSectionVisible(customFields, "relocation", "global.credentials")) {
    return null;
  }

  const f = resolveFields(customFields, [
    "relocation.global.credentials.heading",
    ...LOGO_KEYS.flatMap((l) => [l.src, l.alt]),
  ]);

  const resolvedHeading =
    heading ?? f["relocation.global.credentials.heading"] ?? "";

  return (
    <section
      {...sectionGroupAttr("global", "credentials")}
      aria-labelledby="relocation-credentials-heading"
      className={cn(
        "w-full bg-[var(--relocation-paper)] py-16 min-[1025px]:py-24",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
        <RelocationReveal>
          <RelocationSectionHeading
            id="relocation-credentials-heading"
            dark
            // Not `fieldAttrs`: the homepage passes an override, so the
            // element's text is not always this field's value.
            className="max-w-[46rem]"
          >
            {resolvedHeading}
          </RelocationSectionHeading>
        </RelocationReveal>

        <RelocationRevealLogos fields={f} />
      </div>
    </section>
  );
}

function RelocationRevealLogos({ fields }: { fields: Record<string, string> }) {
  const logos = LOGO_KEYS.map((keys) => ({
    src: fields[keys.src] ?? "",
    alt: fields[keys.alt] ?? "",
  })).filter((logo) => logo.src !== "");

  if (logos.length === 0) return null;

  return (
    <RelocationRevealGroup className="mt-12">
      <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-10 min-[1025px]:justify-between">
        {logos.map((logo, i) => (
          <li
            key={logo.src}
            className="relocation-reveal-item flex items-center justify-center"
            style={{ ["--i" as string]: Math.min(i, 7) }}
          >
            <img
              src={logo.src}
              alt={logo.alt}
              width={220}
              height={96}
              loading="lazy"
              decoding="async"
              className="block h-16 w-auto max-w-[13.75rem] object-contain min-[1025px]:h-24"
            />
          </li>
        ))}
      </ul>
    </RelocationRevealGroup>
  );
}
