"use server";
import { About } from "~/app/_components/sections/about";
import { CTA } from "~/app/_components/sections/cta";
import { Events } from "~/app/_components/sections/events";

import { Hero } from "~/app/_components/sections/hero";
import { Testimonials } from "~/app/_components/sections/testimonials";
import { api } from "~/trpc/server";

export default async function Home() {
  const events = await api.event.getUpcoming();
  const siteContent = await api.siteContent.getByKeys({
    keys: ["hero.headline"],
  });
  return (
    <>
      <Hero title={siteContent[0]?.value ?? ""} />
      <About />
      <Events events={events ?? []} />
      <Testimonials />
      <CTA />
    </>
  );
}
