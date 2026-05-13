import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { parseCardAdditionalFields } from "~/lib/products";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type ProductAdditionalFields = {
  additionalInformation?: unknown;
  productFeatures?: Array<{ icon: string; text: string }>;
  comingSoon?: boolean;
  productTagline?: string;
} | null;

function parseProductAdditionalFields(raw: unknown): ProductAdditionalFields {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  return raw as ProductAdditionalFields;
}

export function ElegantProductDetailsAccordion({
  product,
}: {
  product: NonNullable<RouterOutputs["product"]["get"]>;
}) {
  const additional = parseCardAdditionalFields(product.additionalFields);

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="shipping"
      className="max-w-lg"
    >
      <AccordionItem value="description">
        <AccordionTrigger>Description</AccordionTrigger>
        <AccordionContent>{product?.description}</AccordionContent>
      </AccordionItem>
      <AccordionItem value="additionalInformation">
        <AccordionTrigger>Additional Information</AccordionTrigger>
        <AccordionContent>
          {additional?.additionalInformation ? (
            <TiptapRenderer
              content={additional.additionalInformation as TiptapJSON}
              className="prose prose-sm dark:prose-invert my-0 max-w-none py-0"
            />
          ) : (
            <p>No additional information available.</p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
