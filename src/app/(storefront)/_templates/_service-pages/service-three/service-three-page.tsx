import Image from "next/image";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
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
 * Service template: service-three — Editorial
 *
 * Layout:
 * 1. Full-bleed hero image with service name + subheading overlay
 * 2. Editorial body (richtext) — two-column with secondary image on desktop
 * 3. Pull quote (if present)
 * 4. Grid of specific service item cards with booking dialog
 */
export async function ServiceTemplateThree({
  service,
  items,
  embedsEnabled,
}: Props) {
  const f = resolveFields(service.customFields, [
    "service-three.hero-image",
    "service-three.subheading",
    "service-three.body",
    "service-three.secondary-image",
    "service-three.quote",
  ]);

  const heroImage = f["service-three.hero-image"] ?? "/placeholder.svg";
  const subheading = f["service-three.subheading"] ?? "";
  const bodyRaw = f["service-three.body"];
  const secondaryImage = f["service-three.secondary-image"] ?? "";
  const quote = f["service-three.quote"] ?? "";

  // Parse body richtext JSON
  let bodyJson: TiptapJSON | null = null;
  if (bodyRaw) {
    try {
      bodyJson = JSON.parse(bodyRaw) as TiptapJSON;
    } catch {
      // not JSON
    }
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative h-[70vh] min-h-[360px] w-full overflow-hidden">
        <Image
          src={heroImage}
          alt={service.name}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex items-end pb-14">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
            {subheading && (
              <p className="mb-2 text-sm font-semibold tracking-widest text-white/80 uppercase">
                {subheading}
              </p>
            )}
            <h1 className="text-4xl leading-tight font-bold text-white drop-shadow-md sm:text-5xl lg:text-6xl">
              {service.name}
            </h1>
            {service.description && (
              <p className="mt-4 max-w-2xl text-base text-white/85 drop-shadow sm:text-lg">
                {service.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Editorial body + secondary image ─────────────────────────────── */}
      {(bodyJson ?? secondaryImage) && (
        <section className="py-20 md:py-32">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div
              className={`grid gap-12 ${
                secondaryImage ? "lg:grid-cols-2 lg:items-start" : ""
              }`}
            >
              {bodyJson && (
                <div className="prose prose-neutral max-w-none">
                  <TiptapRenderer content={bodyJson} />
                </div>
              )}
              {secondaryImage && (
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl">
                  <Image
                    src={secondaryImage}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Pull quote ────────────────────────────────────────────────────── */}
      {quote && (
        <section className="border-border bg-muted/30 border-y py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <blockquote className="text-center">
              <span
                className="text-muted-foreground/40 text-5xl leading-none select-none"
                aria-hidden="true"
              >
                &ldquo;
              </span>
              <p className="text-foreground mt-2 text-xl leading-relaxed font-medium italic sm:text-2xl">
                {quote}
              </p>
              <span
                className="text-muted-foreground/40 mt-2 block text-5xl leading-none select-none"
                aria-hidden="true"
              >
                &rdquo;
              </span>
            </blockquote>
          </div>
        </section>
      )}

      {/* ── Specific services grid ─────────────────────────────────────────── */}
      {items.length > 0 && (
        <section className="py-16 md:py-24">
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
