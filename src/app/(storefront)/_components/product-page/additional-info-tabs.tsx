"use client";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { parseCardAdditionalFields } from "~/lib/products";
import { isContentEmpty } from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type StyleProps = {
  tabsClassName?: string;
  tabsListClassName?: string;
  tabsContentClassName?: string;
  tabsTriggerClassName?: string;
  cardContentClassName?: string;
  tipTapRendererClassName?: string;
  contentClassName?: string;
};

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  styleProps?: StyleProps;
  includeCard?: boolean;
};

export function ProductDetailsAdditionalInfoTabs({
  product,
  styleProps,
  includeCard = true,
}: Props) {
  const additional = parseCardAdditionalFields(product.additionalFields);

  const isAdditionalEmpty = isContentEmpty(
    additional?.additionalInformation as TiptapJSON,
  );

  return (
    <Tabs
      defaultValue="description"
      className={cn(
        "mx-auto w-full max-w-7xl py-12 md:py-20",
        styleProps?.tabsClassName,
      )}
    >
      <TabsList
        variant="line"
        className={cn("mx-auto", styleProps?.tabsListClassName)}
      >
        <TabsTrigger
          value="description"
          className={cn(styleProps?.tabsTriggerClassName)}
        >
          Description
        </TabsTrigger>
        <TabsTrigger
          value="additional"
          className={cn(styleProps?.tabsTriggerClassName)}
        >
          Additional Information
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="description"
        className={cn(styleProps?.tabsContentClassName)}
      >
        {includeCard && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent
              className={cn(
                "text-muted-foreground text-sm",
                styleProps?.cardContentClassName,
              )}
            >
              {product?.description}
            </CardContent>
          </Card>
        )}
        {!includeCard && (
          <p className={cn(styleProps?.contentClassName)}>
            {product?.description}
          </p>
        )}
      </TabsContent>
      <TabsContent value="additional">
        {includeCard && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent
              className={cn(
                "text-muted-foreground text-sm",
                styleProps?.cardContentClassName,
              )}
            >
              {!isAdditionalEmpty ? (
                <TiptapRenderer
                  content={additional.additionalInformation as TiptapJSON}
                  className={cn(
                    "prose prose-sm dark:prose-invert max-w-none",
                    styleProps?.tipTapRendererClassName,
                  )}
                />
              ) : (
                <p>No additional information available.</p>
              )}
            </CardContent>
          </Card>
        )}
        {!includeCard && (
          <>
            {!isAdditionalEmpty ? (
              <TiptapRenderer
                content={additional.additionalInformation as TiptapJSON}
                className={cn(
                  "prose prose-sm dark:prose-invert max-w-none",
                  styleProps?.tipTapRendererClassName,
                )}
              />
            ) : (
              <p
                className={cn(
                  "prose prose-sm dark:prose-invert max-w-none",
                  styleProps?.tipTapRendererClassName,
                )}
              >
                No additional information available.
              </p>
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
