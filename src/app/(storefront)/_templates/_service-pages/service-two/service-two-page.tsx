import Image from "next/image";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { db } from "~/server/db";
import { EmbedFrame } from "~/components/embed-frame";
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
    <div className="bg-background text-foreground min-h-screen">
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
              <h1 className="text-foreground text-3xl font-bold sm:text-4xl">
                {service.name}
              </h1>
              {service.description && (
                <p className="text-muted-foreground mt-3 text-base sm:text-lg">
                  {service.description}
                </p>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="border-border bg-muted/30 border-b py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-foreground text-3xl font-bold sm:text-4xl">
              {service.name}
            </h1>
            {service.description && (
              <p className="text-muted-foreground mt-3 text-base sm:text-lg">
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
                  className="bg-muted relative aspect-square overflow-hidden rounded-lg"
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
        <section className="border-border bg-background border-y py-16 md:py-24">
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
                  className="border-border bg-card flex flex-col gap-3 rounded-xl border p-6 shadow-sm"
                >
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                    <hl.icon
                      className="text-primary h-5 w-5"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-foreground font-semibold">{hl.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
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
