"use client";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { parseCardAdditionalFields } from "~/lib/products";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
};

export function PollenProductDetailsTabs({ product }: Props) {
  const additional = parseCardAdditionalFields(product.additionalFields);

  return (
    <Tabs
      defaultValue="overview"
      className="mx-auto w-full max-w-7xl py-12 md:py-20"
    >
      <TabsList variant="line" className="mx-auto">
        <TabsTrigger value="overview">Description</TabsTrigger>
        <TabsTrigger value="additional">Additional Information</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="pt-6">
        <p className="whitespace-pre-line text-lg leading-relaxed text-[#4c566a]">
          {product.description}
        </p>
      </TabsContent>
      <TabsContent value="additional" className="pt-6">
        {additional?.additionalInformation ? (
          <TiptapRenderer
            content={additional.additionalInformation as TiptapJSON}
            className="prose prose-sm max-w-none text-[#4c566a]"
          />
        ) : (
          <p className="text-[#4c566a]">No additional information available.</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
