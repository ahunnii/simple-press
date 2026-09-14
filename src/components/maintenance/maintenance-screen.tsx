import Image from "next/image";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type {
  ResolvedMaintenanceCta,
  ResolvedMaintenanceLaunch,
} from "~/lib/maintenance-config";
import { normalizeMaintenanceMessage } from "~/lib/maintenance-config";
import { cn } from "~/lib/utils";
import { buttonVariants } from "~/components/ui/button";
import { LaunchCountdown } from "~/components/maintenance/launch-countdown";
import { TiptapRenderer } from "~/components/tiptap-renderer";

/**
 * Shared maintenance/"coming soon" fallback screen, rendered for any
 * template that does not register its own `MaintenancePage` (see
 * `t.MaintenancePage` in `src/app/(storefront)/layout.tsx` and
 * `src/app/page.tsx`). All owner-editable fields (`overline`, `headline`,
 * `image`, `location`, `launch`) are optional and additive — with none set
 * this renders the original hardcoded "Coming soon" / "We'll be back soon"
 * copy, unchanged.
 */
type Props = {
  variant: "maintenance" | "coming_soon";
  message?: string | TiptapJSON | null;
  cta?: ResolvedMaintenanceCta | null;
  businessName?: string | null;
  /** `null`/unset → no eyebrow line above the headline. */
  overline?: string | null;
  /** `null`/unset → falls back to the hardcoded "Coming soon" / "We'll be back soon" copy. */
  headline?: string | null;
  /** A validated http(s) URL; `null`/unset → no flyer image. */
  image?: string | null;
  /** `null`/unset → omitted from the when-line. */
  location?: string | null;
  /** Pre-formatted, business-timezone launch window; `null`/unset → no when-line/countdown. */
  launch?: ResolvedMaintenanceLaunch | null;
};

export function MaintenanceScreen({
  variant,
  message,
  cta,
  businessName,
  overline,
  headline,
  image,
  location,
  launch,
}: Props) {
  const heading =
    headline ??
    (variant === "coming_soon" ? "Coming soon" : "We'll be back soon");

  const subtext =
    variant === "coming_soon"
      ? "This shop is getting ready. Check back soon."
      : "This shop is temporarily undergoing maintenance. Please check back in a little while.";

  return (
    <>
      {/*
        React 19 (used by this app's Next 15 app-router build) hoists any
        <title>/<meta>/<link> tag rendered by a component — regardless of
        where in the tree it lives — into the document <head> at commit
        time. Previously this tag rendered visually inside <body> with no
        head-hoisting guarantee prior to React 19; Google only honors the
        robots meta tag when it resolves into <head>. Keeping it as a plain
        rendered <meta> here (rather than a `metadata` export) is
        intentional: MaintenanceScreen is shared by three different
        page/layout server components (src/app/page.tsx,
        src/app/admin/layout.tsx, src/app/(storefront)/layout.tsx) that are
        out of scope for this fix, so the tag travels with the component
        itself instead of requiring each call site to add its own
        `generateMetadata`/`metadata.robots`.
      */}
      <meta name="robots" content="noindex" />
      <div className="bg-background flex min-h-dvh flex-col items-center justify-center px-4">
        <main className="flex max-w-lg flex-col items-center text-center">
          {businessName && (
            <p className="text-muted-foreground mb-4 text-sm font-medium tracking-widest uppercase">
              {businessName}
            </p>
          )}
          {overline && (
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-[0.2em] uppercase">
              {overline}
            </p>
          )}
          <h1 className="text-foreground mb-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            {heading}
          </h1>
          <p className="text-muted-foreground max-w-md text-base leading-relaxed sm:text-lg">
            {subtext}
          </p>
          {image && (
            <figure className="border-border/60 bg-muted/30 mt-6 w-full max-w-[420px] rounded-md border p-1.5">
              <Image
                src={image}
                alt={headline ?? "Grand opening flyer"}
                width={840}
                height={1050}
                sizes="(max-width: 480px) 100vw, 420px"
                style={{ width: "100%", height: "auto", display: "block" }}
                className="rounded-sm"
              />
            </figure>
          )}
          {(launch ?? location) && (
            <p className="text-foreground mt-6 text-sm font-medium tracking-wide">
              {launch && (
                <time dateTime={launch.dateTimeAttr}>
                  {launch.dateText}
                  {launch.timeText ? ` · ${launch.timeText}` : ""}
                </time>
              )}
              {launch && location ? " · " : null}
              {location && <span>{location}</span>}
            </p>
          )}
          {launch && (
            <LaunchCountdown
              targetIso={launch.startAt}
              label={variant === "coming_soon" ? "Opening in" : "Back in"}
              pastLabel={variant === "coming_soon" ? "Now open" : "We're back"}
              className={cn(
                "text-foreground mt-5",
                "[&_[data-caption]]:text-muted-foreground [&_[data-caption]]:mb-2 [&_[data-caption]]:block [&_[data-caption]]:text-xs [&_[data-caption]]:font-medium [&_[data-caption]]:tracking-[0.2em] [&_[data-caption]]:uppercase",
                "[&_[data-value]]:text-3xl [&_[data-value]]:leading-none [&_[data-value]]:font-semibold sm:[&_[data-value]]:text-4xl",
                "[&_[data-label]]:text-muted-foreground [&_[data-label]]:mt-1.5 [&_[data-label]]:text-[10px] [&_[data-label]]:tracking-[0.18em] [&_[data-label]]:uppercase",
              )}
            />
          )}
          {typeof message === "string" && message ? (
            <p className="text-foreground/80 mt-4 max-w-md text-sm leading-relaxed">
              {message}
            </p>
          ) : message ? (
            (() => {
              const normalized = normalizeMaintenanceMessage(message);
              return normalized ? (
                <TiptapRenderer
                  content={normalized}
                  className={cn(
                    "text-foreground/80 mt-4 max-w-md text-sm leading-relaxed",
                    "[&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_a]:text-foreground [&_>*:first-child]:mt-0 [&_a]:underline [&_a]:underline-offset-2 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-medium [&_h4]:mt-3 [&_h4]:font-medium [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-left [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-left",
                  )}
                />
              ) : null;
            })()
          ) : null}
          {cta && (
            <a
              href={cta.href}
              className={cn(buttonVariants(), "mt-6")}
              {...(cta.type === "external" && {
                target: "_blank",
                rel: "noopener noreferrer",
              })}
            >
              {cta.label}
            </a>
          )}
        </main>
      </div>
    </>
  );
}
