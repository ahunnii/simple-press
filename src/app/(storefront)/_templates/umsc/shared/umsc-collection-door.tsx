import Image from "next/image";
import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { hasCustomImage, UmscImageFallback } from "./umsc-image-fallback";

type Props = {
  href: string;
  title: string;
  blurb?: string;
  image?: string;
  /** CSS `aspect-ratio` for the photo. Default "4 / 5" (shop/collections doors use "3 / 2"). */
  aspect?: string;
  titleFieldKey?: string;
  blurbFieldKey?: string;
};

/**
 * UmscCollectionDoor — 4:5 photo, h3, blurb, "Shop →" link whose arrow
 * nudges 4px right on hover (`.umsc-door-arrow` in globals.css).
 */
export function UmscCollectionDoor({
  href,
  title,
  blurb,
  image,
  aspect = "4 / 5",
  titleFieldKey,
  blurbFieldKey,
}: Props) {
  return (
    <Link href={href} className="group relative block">
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: aspect }}
      >
        {hasCustomImage(image) ? (
          <Image
            src={image!}
            alt=""
            fill
            className="umsc-product-card-img object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <UmscImageFallback className="border-0" aspect={aspect} />
        )}
      </div>
      <h3
        {...(titleFieldKey ? fieldAttr(titleFieldKey) : {})}
        className="umsc-serif mt-4 text-[22px] font-normal text-[var(--umsc-ink)]"
      >
        {title}
      </h3>
      {blurb && (
        <p
          {...(blurbFieldKey ? fieldAttr(blurbFieldKey) : {})}
          className="umsc-sans mt-1 text-[14px] leading-[1.5] text-[var(--umsc-muted)]"
        >
          {blurb}
        </p>
      )}
      <span className="umsc-sans mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.13em] text-[var(--umsc-gold-ink)] uppercase">
        Shop
        <span aria-hidden="true" className="umsc-door-arrow">
          →
        </span>
      </span>
    </Link>
  );
}
