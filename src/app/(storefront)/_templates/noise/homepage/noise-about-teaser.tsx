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
    <section className="border-b border-foreground/20 py-20 px-7">
      <div className="mx-auto max-w-7xl grid gap-16 lg:grid-cols-2 lg:items-center">
        {/* Image */}
        <FadeIn direction="left">
          <div className="relative aspect-[3/4] w-full overflow-hidden border border-foreground/20">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={displayHeading}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))` }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <p
                    className="font-serif italic select-none leading-none"
                    style={{ fontSize: "clamp(5rem, 14vw, 10rem)", color: "var(--vn-bone)", opacity: 0.1 }}
                  >
                    VN
                  </p>
                </div>
              </div>
            )}
          </div>
        </FadeIn>

        {/* Text */}
        <FadeIn direction="right" delay={0.15}>
          <div className="flex flex-col gap-8">
            <div>
              <p className="mb-5 font-mono text-[9.5px] tracking-[0.4em] uppercase text-muted-foreground">
                Section / 01 — The Brand
              </p>
              <h2
                className="font-serif italic leading-tight tracking-tight"
                style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.02em" }}
              >
                {displayHeading}
              </h2>
            </div>

            <div
              className="h-px w-16"
              style={{ background: "var(--vn-rule)" }}
            />

            {bodyContent ? (
              <TiptapRenderer
                content={bodyContent as TiptapJSON}
                className="prose prose-sm max-w-none leading-relaxed [&_p]:text-muted-foreground"
              />
            ) : (
              <p className="font-sans text-base leading-relaxed text-muted-foreground max-w-[44ch]">
                Visual Noise is Detroit&apos;s home for haute couture crochet fashion.
                Every garment is handcrafted with intention — a wearable statement
                that refuses to whisper.
              </p>
            )}

            <Link
              href={displayButtonLink}
              className="inline-flex items-center gap-4 font-mono text-[10px] tracking-[0.3em] uppercase transition-opacity hover:opacity-60 w-fit"
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
