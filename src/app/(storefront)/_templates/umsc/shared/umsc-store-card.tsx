import type { CSSProperties } from "react";
import Image from "next/image";

import type { UmscStore } from "../contact/umsc-stores";
import { listItemAttr } from "~/lib/preview/section-attrs";

import { hasCustomImage, UmscImageFallback } from "./umsc-image-fallback";

const LINK_CLASS =
  "umsc-sans inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.13em] text-[var(--umsc-gold-ink)] uppercase no-underline hover:underline";

/** Google Maps search for the shop, built from its name + address. */
function directionsHref(store: UmscStore): string {
  const query = [store.name, store.address.replace(/\s*\n\s*/g, ", ")]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Owner-typed site address → a safe absolute URL. A bare "shop.com" gets
 * https://; any other scheme (javascript:, data:, mailto:…) yields null so the
 * link is dropped — `website` isn't one of `parseTemplateListRows`'s sanitized
 * link keys.
 */
function websiteHref(raw: string): string | null {
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(raw) || raw.startsWith("//"))
    return null;
  return `https://${raw}`;
}

type Props = {
  store: UmscStore;
  /** List field owning the row, for the editor's `data-sp-item` target. */
  fieldKey: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * UmscStoreCard — a shop that carries the owner's work: 3:2 photo, serif
 * name, address, optional note, then "Directions" (Google Maps) and
 * "Website" links. Not a single link — it carries two — so the card itself
 * stays plain. Styled after `UmscCollectionDoor`.
 */
export function UmscStoreCard({ store, fieldKey, className, style }: Props) {
  const website = store.website ? websiteHref(store.website) : null;
  return (
    <article
      className={className}
      style={style}
      {...listItemAttr(fieldKey, store.rowIndex)}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "3 / 2" }}
      >
        {hasCustomImage(store.image) ? (
          <Image
            src={store.image}
            alt={store.alt}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <UmscImageFallback className="border-0" aspect="3 / 2" />
        )}
      </div>
      <h3 className="umsc-serif mt-4 text-[22px] font-normal text-[var(--umsc-ink)]">
        {store.name}
      </h3>
      {store.address && (
        <p className="umsc-sans mt-1 text-[14px] leading-[1.5] whitespace-pre-line text-[var(--umsc-muted)]">
          {store.address}
        </p>
      )}
      {store.note && (
        <p className="umsc-sans mt-2 text-[14px] leading-[1.5] text-[var(--umsc-ink)]">
          {store.note}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        <a
          href={directionsHref(store)}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          Directions
          <span aria-hidden="true">→</span>
          <span className="sr-only"> to {store.name} (opens in new tab)</span>
        </a>
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            Website
            <span aria-hidden="true">→</span>
            <span className="sr-only">
              {" "}
              for {store.name} (opens in new tab)
            </span>
          </a>
        )}
      </div>
    </article>
  );
}
