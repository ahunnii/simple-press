import Image from "next/image";

import { fieldAttr } from "~/lib/preview/section-attrs";

type Props = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  excerpt?: string;
  imageUrl?: string;
  /** Spread on the header root for the preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
  /** Resolved-field keys for live-text patching (vii pattern). */
  titleFieldKey?: string;
  subtitleFieldKey?: string;
  excerptFieldKey?: string;
};

export function ModernGeneralLayout({
  children,
  title,
  subtitle,

  excerpt,
  imageUrl,
  sectionAttrs,
  titleFieldKey,
  subtitleFieldKey,
  excerptFieldKey,
}: Props) {
  return (
    <div className="bg-background">
      {imageUrl ? (
        <>
          <section className="relative overflow-hidden" {...sectionAttrs}>
            <div className="relative h-[50vh] min-h-[400px]">
              <>
                <Image
                  src={imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  priority
                />
                <div className="bg-foreground/60 absolute inset-0" />
              </>

              <div className="absolute inset-0 flex items-center">
                <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
                  <div className="max-w-xl">
                    {subtitle && (
                      <p
                        className={
                          "text-background/90 text-xs font-semibold tracking-widest uppercase"
                        }
                        {...(subtitleFieldKey
                          ? fieldAttr(subtitleFieldKey)
                          : {})}
                      >
                        {subtitle}
                      </p>
                    )}
                    <h1
                      className={
                        "text-background mt-2 font-serif text-4xl text-balance md:text-6xl"
                      }
                      {...(titleFieldKey ? fieldAttr(titleFieldKey) : {})}
                    >
                      {title}
                    </h1>
                    {excerpt && (
                      <p
                        className="text-background/90 mt-4 max-w-lg"
                        {...(excerptFieldKey ? fieldAttr(excerptFieldKey) : {})}
                      >
                        {excerpt}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="border-border border-b" {...sectionAttrs}>
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
            {subtitle && (
              <p
                className="text-muted-foreground text-xs font-semibold tracking-widest uppercase"
                {...(subtitleFieldKey ? fieldAttr(subtitleFieldKey) : {})}
              >
                {subtitle}
              </p>
            )}
            <h1
              className="text-foreground mt-2 font-serif text-4xl md:text-5xl"
              {...(titleFieldKey ? fieldAttr(titleFieldKey) : {})}
            >
              {title}
            </h1>
            {excerpt && (
              <p
                className="text-muted-foreground mt-4 max-w-lg"
                {...(excerptFieldKey ? fieldAttr(excerptFieldKey) : {})}
              >
                {excerpt}
              </p>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
