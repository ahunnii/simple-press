import Image from "next/image";

import { cn } from "~/lib/utils";

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  excerpt?: string;
  imageUrl?: string;
};

export function ModernGeneralLayout({
  children,
  title,
  subtitle,

  excerpt,
  imageUrl,
}: Props) {
  return (
    <div className="bg-background">
      {imageUrl ? (
        <>
          <section className="relative overflow-hidden">
            <div className="relative h-[50vh] min-h-[400px]">
              <>
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="bg-foreground/40 absolute inset-0" />
              </>

              <div className="absolute inset-0 flex items-center">
                <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
                  <div className="max-w-xl">
                    <p
                      className={
                        "text-background/70 text-xs font-semibold tracking-widest uppercase"
                      }
                    >
                      {subtitle}
                    </p>
                    <h1
                      className={
                        "text-background mt-2 font-serif text-4xl text-balance md:text-6xl"
                      }
                    >
                      {title}
                    </h1>
                    {excerpt && (
                      <p className="text-muted-foreground mt-4 max-w-lg">
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
        <div className="border-border border-b">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              {subtitle}
            </p>
            <h1 className="text-foreground mt-2 font-serif text-4xl md:text-5xl">
              {title}
            </h1>
            <p className="text-muted-foreground mt-4 max-w-lg">{excerpt}</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
