import type { SiteExportFile } from "../types";
import { GUIDE_PATHS } from "./shared";
import {
  buildSquareGuide,
  buildSquarespaceGuide,
  buildShopifyGuide,
  buildWixGuide,
  buildWordPressGuide,
} from "./platform-guides";
import {
  buildDomainGuide,
  buildHiringGuide,
  buildPaymentsGuide,
} from "./support-guides";
import type { SiteExportSummary } from "./types";

export type { SiteExportSummary } from "./types";
export { buildStartHere } from "./start-here";
export { GUIDE_PATHS };

/** The eight plain-language guides under `Guides/`. Pure: no I/O. */
export function buildGuides(summary: SiteExportSummary): SiteExportFile[] {
  return [
    buildWordPressGuide(summary),
    buildShopifyGuide(summary),
    buildWixGuide(summary),
    buildSquarespaceGuide(summary),
    buildSquareGuide(summary),
    buildHiringGuide(summary),
    buildDomainGuide(summary),
    buildPaymentsGuide(summary),
  ];
}
