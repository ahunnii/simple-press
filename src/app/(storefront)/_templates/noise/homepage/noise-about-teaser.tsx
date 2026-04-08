import Image from "next/image";
import Link from "next/link";

import type { RichTextFieldValue } from "~/lib/template-fields";
import { FadeIn } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import type { TiptapJSON } from "~/components/tiptap-renderer";

type NoiseAboutTeaserProps = {
  imageUrl?: string;
  heading?: string;
  bodyContent?: RichTextFieldValue | null;
  buttonText?: string;
  buttonLink?: string;
};

export function NoiseAboutTeaser({
  imageUrl,
  heading,
  bodyContent,
  buttonText,
  buttonLink,
}: NoiseAboutTeaserProps) {
  const displayHeading = heading ?? "The Art of Noise";
  const displayButtonText = buttonText ?? "Our Story";
  const displayButtonLink = buttonLink ?? "/about";

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
      <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
        {/* Image */}
        <FadeIn direction="left">
          <div className="relative aspect-[3/4] w-full overflow-hidden">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={displayHeading}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <div className="absolute inset-0 bg-muted" />
            )}
          </div>
        </FadeIn>

        {/* Text */}
        <FadeIn direction="right" delay={0.15}>
          <div className="flex flex-col gap-8">
            <div>
              <p className="mb-4 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
                The Brand
              </p>
              <h2 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
                {displayHeading}
              </h2>
            </div>

            {bodyContent ? (
              <TiptapRenderer
                content={bodyContent as TiptapJSON}
                className="prose prose-sm text-muted-foreground max-w-none leading-relaxed [&_p]:text-muted-foreground"
              />
            ) : (
              <p className="font-sans text-base leading-relaxed text-muted-foreground">
                Visual Noise is Detroit&apos;s home for haute couture crochet fashion.
                Every garment is handcrafted with intention — a wearable statement
                that refuses to whisper.
              </p>
            )}

            <Link
              href={displayButtonLink}
              className="inline-flex items-center gap-3 font-sans text-[10px] tracking-[0.3em] uppercase text-foreground transition-opacity hover:opacity-60"
            >
              <span>{displayButtonText}</span>
              <span className="h-px w-12 bg-foreground" />
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
