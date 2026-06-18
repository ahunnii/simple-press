import Image from "next/image";

import type { RouterOutputs } from "~/trpc/react";
import { db } from "~/server/db";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { type TiptapJSON, TiptapRenderer } from "~/components/tiptap-renderer";
import { EmbedFrame } from "~/components/embed-frame";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";

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
 * Service template: service-two — Media Rich
 *
 * Layout:
 * 1. Hero video (autoplay background)
 * 2. Service header (name + description)
 * 3. Photo gallery
 * 4. Intro body (richtext)
 * 5. Highlight cards (icon + title + description)
 * 6. Grid of specific service item cards with booking dialog
 */
export async function ServiceTemplateTwo({
  service,
  items,
  embedsEnabled,
}: Props) {
  const f = resolveFields(service.customFields, [
    "service-two.hero-video",
    "service-two.gallery",
    "service-two.intro-body",
    "service-two.highlight-list",
  ]);

  const heroVideoSrc = f["service-two.hero-video"] ?? "";
  const galleryId = f["service-two.gallery"] ?? "";
  const introBodyRaw = f["service-two.intro-body"];

  // Parse intro richtext JSON
  let introBodyJson: TiptapJSON | null = null;
  if (introBodyRaw) {
    try {
      introBodyJson = JSON.parse(introBodyRaw) as TiptapJSON;
    } catch {
      // not JSON
    }
  }

  // Fetch gallery if a gallery ID is set
  const gallery = galleryId
    ? await db.gallery.findUnique({
        where: { id: galleryId },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      })
    : null;

  // Parse highlight list
  const highlights = parseTemplateIconListRows(
    getListFieldValue(service.customFields, "service-two.highlight-list"),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Hero video ────────────────────────────────────────────────────── */}
      {heroVideoSrc ? (
        <section className="relative w-full bg-black">
          <div className="mx-auto max-w-7xl">
            <EmbedFrame
              src={heroVideoSrc}
              title={`${service.name} video`}
              className="aspect-video w-full"
            />
          </div>
          <div className="bg-background px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
                {service.name}
              </h1>
              {service.description && (
                <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                  {service.description}
                </p>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="border-b border-border bg-muted/30 py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              {service.name}
            </h1>
            {service.description && (
              <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                {service.description}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Gallery ───────────────────────────────────────────────────────── */}
      {gallery && gallery.images.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
              {gallery.images.map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                >
                  <Image
                    src={img.url}
                    alt={img.altText ?? ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Intro body ────────────────────────────────────────────────────── */}
      {introBodyJson && (
        <section className="border-y border-border bg-background py-16 md:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="prose prose-neutral max-w-none">
              <TiptapRenderer content={introBodyJson} />
            </div>
          </div>
        </section>
      )}

      {/* ── Highlights ────────────────────────────────────────────────────── */}
      {highlights && highlights.length > 0 && (
        <section className="bg-muted/40 py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((hl, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <hl.icon
                      className="h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="font-semibold text-foreground">{hl.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {hl.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Specific services grid ─────────────────────────────────────────── */}
      {items.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-2xl font-semibold text-foreground sm:text-3xl">
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
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
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
        <h3 className="text-base font-semibold text-foreground">{item.name}</h3>
        {item.description && (
          <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {item.priceLabel && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium">
                {item.priceLabel}
              </span>
            )}
            {item.durationLabel && (
              <span className="rounded-full bg-muted px-2.5 py-0.5">
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
