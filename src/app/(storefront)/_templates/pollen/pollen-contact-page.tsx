import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { buttonVariants } from "~/components/ui/button";

type Props = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
};

export function PollenContactPage({ business }: Props) {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <Image
          src="https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1920&h=600&fit=crop"
          alt=""
          fill
          className="object-cover blur-sm brightness-75"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-[#2a351f]/90" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-sm font-medium tracking-wider text-[#A8D081] uppercase">
            Let&apos;s Talk
          </p>
          <h1 className="text-5xl font-bold text-white md:text-6xl lg:text-7xl">
            Contact Us
          </h1>
        </div>
      </section>

      {/* <ContactClient /> */}

      {/* CTA Section */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <Image
          src="/dpc-call-to-action.webp"
          alt=""
          fill
          className="object-cover blur-sm brightness-75"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 flex min-h-[50vh] items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-6 text-sm font-medium tracking-wider text-[#A8D081] uppercase">
              No Obligation · Usually Respond Within 24 Hours
            </p>
            <h2 className="mb-6 text-4xl leading-tight font-bold text-white md:text-5xl lg:text-6xl">
              Ready to Transform Your Space?
            </h2>
            <p className="mx-auto mb-10 max-w-xl leading-relaxed text-white md:text-lg">
              Whether you&apos;re dreaming of a pollinator-friendly garden or
              planning a community green space, we&apos;re here to bring your
              vision to life. Get your free consultation today and join us in
              making Detroit greener, one project at a time.
            </p>
            <Link
              href="/contact"
              className={buttonVariants({
                size: "lg",
                className:
                  "rounded-full bg-[#5e8b4a] px-8 py-6 text-base font-medium text-white shadow-lg hover:bg-[#4d7a3d]",
              })}
            >
              Request a Quote Today
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
