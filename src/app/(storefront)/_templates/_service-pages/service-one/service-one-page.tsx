import Image from "next/image";
import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { buttonVariants } from "~/components/ui/button";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from ".";

type Service = RouterOutputs["services"]["getBySlug"];
type ServiceItem = Service["items"][number];

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  service: Service;
  items: ServiceItem[];
  embedsEnabled: boolean;
};

/**
 * Service template: service-one — Clean / Minimal
 *
 * Layout:
 * 1. Hero image (full-width, 60vh)
 * 2. Service header (name + description)
 * 3. Intro section (heading + richtext body + optional CTA)
 * 4. Grid of specific service item cards with booking dialog
 */
export async function ServiceTemplateOne({
  service,
  items,
  embedsEnabled,
}: Props) {
  const f = resolveFields(service.customFields, [
    "service-one.hero-image",
    "service-one.intro-heading",
    "service-one.intro-body",
    "service-one.cta-text",
    "service-one.cta-link",
  ]);

  const heroImage = f["service-one.hero-image"] ?? "/placeholder.svg";
  const introHeading = f["service-one.intro-heading"] ?? "";
  const introBodyRaw = f["service-one.intro-body"];
  const ctaText = f["service-one.cta-text"] ?? "";
  const ctaLink = f["service-one.cta-link"] ?? "";

  // Attempt to parse richtext JSON; fall back to plain text rendering
  let introBodyJson: TiptapJSON | null = null;
  if (introBodyRaw) {
    try {
      introBodyJson = JSON.parse(introBodyRaw) as TiptapJSON;
    } catch {
      // not valid JSON — will render as plain text fallback
    }
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative h-[60vh] min-h-[300px] w-full overflow-hidden">
        <Image
          src={heroImage}
          alt={service.name}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 flex items-end pb-12">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-white drop-shadow-md sm:text-4xl lg:text-5xl">
              {service.name}
            </h1>
            {service.description && (
              <p className="mt-3 max-w-2xl text-base text-white/90 drop-shadow sm:text-lg">
                {service.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Intro section ─────────────────────────────────────────────────── */}
      {(Boolean(introHeading) ||
        Boolean(introBodyJson) ||
        Boolean(ctaLink)) && (
        <section className="border-border bg-background border-b py-16 md:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            {introHeading && (
              <h2 className="text-foreground mb-6 text-2xl font-semibold sm:text-3xl">
                {introHeading}
              </h2>
            )}
            {introBodyJson && (
              <div className="prose prose-neutral max-w-none">
                <TiptapRenderer content={introBodyJson} />
              </div>
            )}
            {ctaLink && ctaText && (
              <div className="mt-8">
                <Link href={ctaLink} className={buttonVariants({ size: "lg" })}>
                  {ctaText}
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Specific services grid ─────────────────────────────────────────── */}
      {items.length > 0 && (
        <section className="bg-muted/30 py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-foreground mb-10 text-2xl font-semibold sm:text-3xl">
              Our Services
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <ServiceItemCard
                  key={item.id}
                  item={item}
                  embedsEnabled={embedsEnabled}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ServiceItemCard({
  item,
  embedsEnabled,
}: {
  item: ServiceItem;
  embedsEnabled: boolean;
}) {
  return (
    <div className="border-border bg-card flex flex-col overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md">
      {item.image && (
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-foreground text-base font-semibold">{item.name}</h3>
        {item.description && (
          <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
            {item.description}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
            {item.priceLabel && (
              <span className="bg-muted rounded-full px-2.5 py-0.5 font-medium">
                {item.priceLabel}
              </span>
            )}
            {item.durationLabel && (
              <span className="bg-muted rounded-full px-2.5 py-0.5">
                {item.durationLabel}
              </span>
            )}
          </div>
          <ServiceBookingDialog
            itemName={item.name}
            embedSrc={item.bookingEmbedSrc}
            embedHeight={item.bookingEmbedHeight}
            embedsEnabled={embedsEnabled}
          />
        </div>
      </div>
    </div>
  );
}
