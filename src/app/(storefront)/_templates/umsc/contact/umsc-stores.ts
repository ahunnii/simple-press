import { meaningfulAltText } from "~/lib/images/alt-text";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";

/** List field behind the Contact page's "In stores" cards. */
export const UMSC_STORES_KEY = "umsc.contact.stores";

export type UmscStore = {
  /** 0-based position in the saved list, for `listItemAttr`. */
  rowIndex: number;
  name: string;
  image: string;
  /** Owner-written alt text for the photo; "" = decorative. */
  alt: string;
  address: string;
  note: string;
  website: string;
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Saved store rows with a name, in saved order. A row without a name is
 * dropped (it has nothing to show and no useful Directions link). Shared by
 * the Contact page and the footer's stores link so both agree on whether
 * there is anything to show.
 */
export function resolveUmscStores(
  customFields: Record<string, unknown> | undefined,
): UmscStore[] {
  return parseTemplateListRows(customFields?.[UMSC_STORES_KEY]).flatMap(
    (row, rowIndex) => {
      const name = str(row.name);
      if (!name) return [];
      return [
        {
          rowIndex,
          name,
          image: str(row.image),
          alt: meaningfulAltText(str(row.alt)) ?? "",
          address: str(row.address),
          note: str(row.note),
          website: str(row.website),
        },
      ];
    },
  );
}

/** True when the stores section (and the footer link to it) should render. */
export function hasVisibleUmscStores(
  customFields: Record<string, unknown> | undefined,
): boolean {
  return (
    isSectionVisible(customFields, "umsc", "contact.stores") &&
    resolveUmscStores(customFields).length > 0
  );
}
