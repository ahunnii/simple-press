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

export function DefaultProductDetailsTabs({ product }: Props) {
  const additional = parseCardAdditionalFields(product.additionalFields);

  return (
    <div className="mt-12 border-t pt-8">
      <Tabs defaultValue="description">
        <TabsList variant="line">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="additional">Additional Information</TabsTrigger>
        </TabsList>

        <TabsContent value="description">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-gray-600 leading-relaxed">
                {product.description ?? "No description available."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="additional">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              {additional?.additionalInformation ? (
                <TiptapRenderer
                  content={additional.additionalInformation as TiptapJSON}
                  className="prose prose-sm dark:prose-invert max-w-none"
                />
              ) : (
                <p className="text-gray-500 text-sm">
                  No additional information available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
