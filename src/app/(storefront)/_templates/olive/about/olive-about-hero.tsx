import Image from "next/image";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { hasOliveImage, OliveImageFallback, OliveReveal } from "../shared";

type Props = {
  image: string;
  heading: string;
};

/**
 * about.hero — a full-bleed photo with the page title pinned to a white card
 * bottom-right. Not hideable: it carries the page's only h1.
 */
export function OliveAboutHero({ image, heading }: Props) {
  return (
    <section
      aria-label="About Olive Mode"
      {...sectionGroupAttr("about", "hero")}
      className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[16/9]"
    >
      {hasOliveImage(image) ? (
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <OliveImageFallback className="absolute inset-0" size={56} />
      )}

      <OliveReveal className="absolute right-4 bottom-4 left-4 sm:right-8 sm:bottom-8 sm:left-auto sm:max-w-[420px]">
        <div className="olive-card p-6 sm:p-8">
          <h1 className="olive-h1" {...fieldAttr("olive.about.hero-heading")}>
            {heading}
          </h1>
        </div>
      </OliveReveal>
    </section>
  );
}
