"use client";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { parseCardAdditionalFields } from "~/lib/products";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
};
export function HappyBambooProductDetailsTabs({ product }: Props) {
  const additional = parseCardAdditionalFields(product.additionalFields);

  return (
    <Tabs
      defaultValue="overview"
      className="mx-auto w-full max-w-7xl py-12 md:py-20"
    >
      <TabsList variant="line" className="mx-auto">
        <TabsTrigger value="overview">Description</TabsTrigger>
        <TabsTrigger value="analytics">Additional Information</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            <p className="text-muted-foreground mt-3 text-lg leading-relaxed whitespace-pre-line">
              {product?.description}
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="analytics">
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {additional?.additionalInformation ? (
              <TiptapRenderer
                content={additional.additionalInformation as TiptapJSON}
                className="prose prose-sm dark:prose-invert max-w-none"
              />
            ) : (
              <p>No additional information available.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
