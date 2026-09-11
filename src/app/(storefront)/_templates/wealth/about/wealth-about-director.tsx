import Image from "next/image";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

type Props = {
  image: string;
  imageAlt: string;
  nameTitle: string;
  bio1: string;
  bio2: string;
  bio3: string;
  email: string;
};

/**
 * Narrow-column director spotlight: square headshot, bold name/title line,
 * three bio paragraphs, bold mailto email. Hideable (about.director).
 */
export function WealthAboutDirector({
  image,
  imageAlt,
  nameTitle,
  bio1,
  bio2,
  bio3,
  email,
}: Props) {
  return (
    <section
      aria-label="Director spotlight"
      {...sectionGroupAttr("about", "director")}
      className="py-[calc(var(--wealth-rhythm)*2)]"
    >
      <div className="mx-auto grid w-full max-w-[900px] grid-cols-1 gap-[var(--wealth-rhythm)] px-[var(--wealth-gutter)] sm:grid-cols-[220px_1fr]">
        <div className="relative aspect-square w-full max-w-[220px] overflow-hidden bg-[var(--wealth-surface)]">
          {image ? (
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(min-width: 640px) 220px, 60vw"
              className="object-cover"
            />
          ) : null}
        </div>
        <div>
          <p
            {...fieldAttr("wealth.about.director-name-title")}
            className="font-bold"
            style={{ fontFamily: "var(--font-wealth-body)" }}
          >
            {nameTitle}
          </p>
          <div className="mt-[var(--wealth-rhythm)]">
            {[bio1, bio2, bio3].map((paragraph, i) => (
              <p
                key={i}
                {...fieldAttr(
                  i === 0
                    ? "wealth.about.director-bio-1"
                    : i === 1
                      ? "wealth.about.director-bio-2"
                      : "wealth.about.director-bio-3",
                )}
                className="mt-[var(--wealth-rhythm)] first:mt-0"
              >
                {paragraph}
              </p>
            ))}
          </div>
          {email ? (
            <p className="mt-[var(--wealth-rhythm)]">
              <a
                href={`mailto:${email}`}
                {...fieldAttr("wealth.about.director-email")}
                className="font-bold"
              >
                {email}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
