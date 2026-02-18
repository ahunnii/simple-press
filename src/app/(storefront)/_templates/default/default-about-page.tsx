import Image from "next/image";
import Link from "next/link";

import type { DefaultAboutPageTemplateProps } from "../types";

export async function DefaultAboutPage({
  business,
}: DefaultAboutPageTemplateProps) {
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
          <h2 className="mb-4 text-3xl font-bold">Our Story</h2>
          <p className="text-muted-foreground mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
            dictum, metus in cursus pharetra, augue purus consequat ligula, nec
            faucibus ex nulla eu urna.
          </p>
          <p className="text-muted-foreground mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
            dictum, metus in cursus pharetra, augue purus consequat ligula, nec
            faucibus ex nulla eu urna.
          </p>
          <p className="text-muted-foreground">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
            dictum, metus in cursus pharetra, augue purus consequat ligula, nec
            faucibus ex nulla eu urna.
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
