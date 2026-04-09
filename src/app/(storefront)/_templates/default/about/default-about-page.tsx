import Image from "next/image";
import Link from "next/link";

import type { DefaultAboutPageTemplateProps } from "../../types";

import { resolveFields } from "..";

export async function DefaultAboutPage({
  business,
}: DefaultAboutPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "default.about.heading",
    "default.about.paragraph-1",
    "default.about.paragraph-2",
    "default.about.paragraph-3",
  ]);

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">About Us</h1>
        <div className="text-muted-foreground flex items-center text-sm">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>About</span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="mb-16 grid items-center gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-3xl font-bold">
            {f["default.about.heading"]}
          </h2>
          <p className="text-muted-foreground mb-4">
            {f["default.about.paragraph-1"]}
          </p>
          <p className="text-muted-foreground mb-4">
            {f["default.about.paragraph-2"]}
          </p>
          <p className="text-muted-foreground">
            {f["default.about.paragraph-3"]}
          </p>
        </div>
        <div className="relative h-[300px] overflow-hidden rounded-lg md:h-[400px]">
          <Image
            src="/placeholder.svg"
            alt="About"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}
