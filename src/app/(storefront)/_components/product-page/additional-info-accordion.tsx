import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { parseCardAdditionalFields } from "~/lib/products";
import { isContentEmpty } from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type StyleProps = {
  accordionClassName?: string;
  accordionItemClassName?: string;
  accordionTriggerClassName?: string;
  accordionContentClassName?: string;
  tipTapRendererClassName?: string;
};

export function ProductDetailsAdditionalInfoAccordion({
  product,
  styleProps,
}: {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  styleProps?: StyleProps;
}) {
  const additional = parseCardAdditionalFields(product.additionalFields);

  const isAdditionalEmpty = isContentEmpty(
    additional?.additionalInformation as TiptapJSON,
  );

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="description"
      className={cn("my-8 max-w-lg", styleProps?.accordionClassName)}
    >
      <AccordionItem value="description">
        <AccordionTrigger>Description</AccordionTrigger>
        <AccordionContent
          className={cn(
            "whitespace-pre-line",
            styleProps?.accordionContentClassName,
          )}
        >
          {product?.description}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="additionalInformation">
        <AccordionTrigger>Additional Information</AccordionTrigger>
        <AccordionContent className={cn(styleProps?.accordionContentClassName)}>
          {!isAdditionalEmpty ? (
            <TiptapRenderer
              content={additional.additionalInformation as TiptapJSON}
              className={cn(
                "prose prose-sm dark:prose-invert my-0 max-w-none py-0",
                styleProps?.tipTapRendererClassName,
              )}
            />
          ) : (
            <p>No additional information available.</p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
