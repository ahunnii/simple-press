/**
 * The olive shared kit — every primitive the page components compose.
 *
 * Nothing here re-authors a style: the chrome's scoped `.olive` classes in
 * globals.css own the look, and these components own the semantics, the
 * states and the keyboard. If a page needs a shape that is not in this file,
 * it belongs in this file.
 */

export { OliveAccordion, OliveAccordionItem } from "./olive-accordion";
export { OliveBreadcrumb, type OliveBreadcrumbItem } from "./olive-breadcrumb";
export {
  OliveButton,
  type OliveButtonSize,
  type OliveButtonVariant,
} from "./olive-button";
export { OliveCategoryCard } from "./olive-category-card";
export { OliveChip, type OliveChipState } from "./olive-chip";
export { OliveChipRow, type OliveChipRowItem } from "./olive-chip-row";
export {
  colorFromName,
  isColorOptionName,
  resolveChipColor,
  type OliveResolvedChipColor,
  oliveChipToken,
} from "./olive-color";
export { OliveEmptyState } from "./olive-empty-state";
export { hasOliveImage, OliveImageFallback } from "./olive-image-fallback";
export { OliveImageTile } from "./olive-image-tile";
export {
  OliveField,
  OliveFieldRow,
  OliveInput,
  OliveSelect,
  OliveTextarea,
} from "./olive-input";
export { OliveLeafMark } from "./olive-leaf-mark";
export { OliveMarquee } from "./olive-marquee";
export { OlivePrice } from "./olive-price";
export {
  OliveProductCard,
  type OliveCardProduct,
  type OliveCardVariant,
} from "./olive-product-card";
export { OliveProductGrid, type OliveGridColumns } from "./olive-product-grid";
export { OliveQuantityStepper } from "./olive-quantity-stepper";
export { OliveReveal, OliveRevealGroup } from "./olive-reveal";
export { OliveSection, type OliveSectionTone } from "./olive-section";
export { OliveSectionHeading } from "./olive-section-heading";
export { OliveStatusBadge, type OliveStatus } from "./olive-status-badge";
