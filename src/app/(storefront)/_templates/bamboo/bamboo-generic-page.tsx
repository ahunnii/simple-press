import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Beaker,
  Check,
  Droplets,
  Leaf,
  Shield,
  Timer,
} from "lucide-react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import {
  FadeIn,
  PageTransition,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
} from "./bamboo-animations";

export const metadata: Metadata = {
  title: "Septic-Safe Bamboo Toilet Paper",
  description:
    "Learn why Finally Results bamboo toilet paper is 100% septic-safe. Fast-dissolving, chemical-free, and gentle on all septic and sewer systems.",
};

const benefits = [
  {
    icon: Timer,
    title: "Fast Dissolving",
    description:
      "Our bamboo fibers break apart within minutes of contact with water -- significantly faster than traditional toilet paper. This rapid dissolution means fewer clogs and less stress on your system.",
  },
  {
    icon: Leaf,
    title: "100% Natural Fibers",
    description:
      "Made from pure bamboo pulp with no synthetic additives, our paper decomposes naturally in any septic environment. No plastic fibers, no polyester threads, nothing that lingers.",
  },
  {
    icon: Beaker,
    title: "Chemical-Free Processing",
    description:
      "We avoid chlorine bleach, dyes, inks, and fragrances that can disrupt the delicate bacterial balance your septic system relies on to break down waste.",
  },
  {
    icon: Shield,
    title: "Independently Tested",
    description:
      "Every batch is tested against industry-standard dissolution benchmarks to ensure it meets or exceeds septic-safety requirements for all residential and commercial systems.",
  },
];

const faqs = [
  {
    question: "Is bamboo toilet paper really safe for septic systems?",
    answer:
      "Yes. Bamboo toilet paper is inherently septic-safe because bamboo fibers are shorter and softer than hardwood tree fibers, allowing them to break down much faster in water. Our products are specifically engineered and tested for rapid dissolution in all types of septic and sewer systems.",
  },
  {
    question: 'How does it compare to "septic-safe" traditional brands?',
    answer:
      'Many conventional brands labeled "septic-safe" still use long hardwood fibers, wet-strength resins, or chemical treatments that slow degradation. Our bamboo paper uses zero wet-strength additives and dissolves measurably faster in independent testing.',
  },
  {
    question: "Will it cause clogs in my plumbing?",
    answer:
      "No. Our bamboo toilet paper is designed to begin dissolving within seconds of being submerged. It will not cause clogs in standard residential plumbing, RV systems, boat heads, or composting toilets.",
  },
  {
    question: "What about low-flow toilets?",
    answer:
      "Our products are ideal for low-flow and dual-flush toilets. Because the paper dissolves quickly with minimal water, it actually performs better than many conventional brands in water-efficient fixtures.",
  },
  {
    question: "Is it safe for RV and boat systems?",
    answer:
      "Absolutely. Our bamboo toilet paper is one of the best choices for portable, RV, and marine sanitation systems. Its rapid breakdown means less residue in holding tanks and fewer treatment chemicals needed.",
  },
];

const comparisonData = [
  {
    feature: "Dissolution Speed",
    bamboo: "Under 60 seconds",
    traditional: "3-5 minutes",
  },
  {
    feature: "Wet-Strength Additives",
    bamboo: "None",
    traditional: "Often added",
  },
  {
    feature: "Chemical Bleaching",
    bamboo: "None",
    traditional: "Chlorine-based",
  },
  {
    feature: "Septic Bacteria Impact",
    bamboo: "Neutral",
    traditional: "Can disrupt",
  },
  {
    feature: "Fiber Type",
    bamboo: "Short, soft bamboo",
    traditional: "Long hardwood",
  },
  { feature: "Biodegradable", bamboo: "Fully", traditional: "Varies" },
];

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};
export function BambooGenericPage({ page }: Props) {
  return (
    <PageTransition>
      {/* Hero */}
      <section className="bg-secondary">
        <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-8 px-4 py-16 md:flex-row md:py-24 lg:px-8">
          <FadeIn
            direction="right"
            className="flex flex-1 flex-col items-start gap-6"
          >
            {/* <span className="rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              Septic-Safe Guarantee
            </span> */}
            <h1 className="text-foreground font-serif text-4xl leading-tight font-bold tracking-tight md:text-5xl">
              <span className="text-balance">{page.title}</span>
            </h1>
            <p className="text-muted-foreground max-w-md text-lg leading-relaxed">
              {page.excerpt}
            </p>
            {/* <div className="flex flex-wrap items-center gap-4">
              <Button size="lg" asChild>
                <Link href="/shop">
                  Shop Septic-Safe Products <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div> */}
          </FadeIn>
          <FadeIn direction="left" delay={0.15} className="relative flex-1">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
              <Image
                src="/images/septic-safe.jpg"
                alt="Illustration showing bamboo toilet paper dissolving safely in a septic system"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <FadeIn direction="up">
          <div className="mx-auto max-w-4xl">
            <TiptapRenderer
              content={page.content as TiptapJSON}
              className="prose prose-lg prose-invert prose-headings:text-white prose-p:text-white/80 prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300 prose-strong:text-white prose-code:text-purple-400 prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-white/20 max-w-none"
            />
          </div>
        </FadeIn>
      </section>
    </PageTransition>
  );
}
