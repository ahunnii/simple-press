"use client";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { parseCardAdditionalFields } from "~/lib/products";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
};

export function ModernProductDetailsTabs({ product }: Props) {
  const additional = parseCardAdditionalFields(product.additionalFields);

  return (
    <div className="border-border mt-16 border-t">
      <Tabs defaultValue="description">
        <TabsList variant="line">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="additional">Additional Information</TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="py-8">
          <p className="text-muted-foreground max-w-2xl leading-relaxed whitespace-pre-line">
            {product.description ?? "No description available."}
          </p>
        </TabsContent>

        <TabsContent value="additional" className="py-8">
          {additional?.additionalInformation ? (
            <TiptapRenderer
              content={additional.additionalInformation as TiptapJSON}
              className="prose prose-sm dark:prose-invert max-w-2xl"
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              No additional information available.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
