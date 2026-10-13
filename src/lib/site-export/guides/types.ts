import type { SiteExportBusiness, SiteExportNote } from "../types";

/**
 * Everything the guides and START HERE page need to know about the export.
 * Built by the orchestrator after all other builders have run, so the guides
 * only ever link to files that really exist in the ZIP.
 */
export interface SiteExportSummary {
  business: SiteExportBusiness;
  counts: {
    pages: number;
    posts: number;
    products: number;
    collections: number;
    services: number;
    events: number;
    galleries: number;
    faqs: number;
    testimonials: number;
    photos: number;
    videos: number;
    customers: number;
    orders: number;
    forms: number;
    /** Product-customizer option groups (charms, engraving, ...). Optional: absent = 0. */
    optionGroups?: number;
    invoices: number;
    subscriptions: number;
    loyaltyMembers: number;
  };
  /** Readable documents to link, e.g. { section: "Pages", label: "About us", path: "Pages/About us.html" }. */
  documents: Array<{ section: string; label: string; path: string }>;
  /** CSV files in Spreadsheets/ with their data-row counts. */
  spreadsheets: Array<{ path: string; rows: number }>;
  /** ZIP paths of the import files that were actually produced. */
  importFiles: string[];
  /** Images shown on the site but hosted somewhere else. zipPath is null when they could not be fetched. */
  externalImages: Array<{ url: string; zipPath: string | null }>;
  notes: SiteExportNote[];
  hasStripe: boolean;
  hasCustomDomain: boolean;
  /**
   * Folders added next to the export by another tool (e.g. the
   * `Website pictures/` folder from the sp-site-snapshot skill). Listed on
   * START HERE; `links` are zip paths that must exist.
   */
  extraFolders?: Array<{
    dir: string;
    what: string;
    links: Array<{ label: string; path: string }>;
  }>;
}
