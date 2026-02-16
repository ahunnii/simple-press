import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Flower2,
  HandHelping,
  MapIcon,
  Users,
} from "lucide-react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { buttonVariants } from "~/components/ui/button";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { PollenGeneralLayout } from "./pollen-general-layout";

type Props = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};
export function PollenGenericPage({ business, page }: Props) {
  return (
    <PollenGeneralLayout
      business={business}
      title="Services"
      subtitle="What We Do"
    >
      <div className="mx-auto max-w-7xl">
        <TiptapRenderer
          content={page.content as TiptapJSON}
          className="prose prose-lg prose-invert prose-headings:text-white prose-p:text-white/80 prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300 prose-strong:text-white prose-code:text-purple-400 prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-white/20 max-w-none"
        />
      </div>
    </PollenGeneralLayout>
  );
}
