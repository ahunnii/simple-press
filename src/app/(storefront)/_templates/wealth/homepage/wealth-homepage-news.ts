import { parseTemplateListRows } from "~/lib/template-fields";

/**
 * List-row shape + parser for `wealth.homepage.news-items`.
 *
 * Split out of `./index.ts` on purpose: `parseTemplateListRows` is a RUNTIME
 * import from `~/lib/template-fields`, and that module aggregates every
 * template's field registry — including (once wealth is registered) this
 * template's root `../index.ts`, which imports `./index.ts`. Keeping the
 * runtime helper import in the field module would create the same
 * circular-evaluation TDZ crash `_templates/relocation/homepage/rows.ts`
 * documents. The component imports the parser from here; the field module
 * stays type-only toward `~/lib/template-fields`.
 *
 * None of the shared `parseTemplate*ListRows` helpers model a
 * title/source/url row, so this coerces the generic `parseTemplateListRows`
 * output directly (same technique as the relocation helper).
 */
export type WealthNewsItem = {
  title: string;
  source: string;
  url: string;
};

/**
 * DCWF's real press coverage, verbatim from the compiled site clone
 * (`detroitcommunitywealth/app/src/app/page.tsx`) — the default a fresh
 * store renders before an owner edits the list.
 */
export const WEALTH_NEWS_FALLBACK: WealthNewsItem[] = [
  {
    title:
      "Six Ways to Make Workers Business Owners — and Why It’s a Good Idea",
    source: "Non-Profit Quarterly, October 24, 2025",
    url: "https://nonprofitquarterly.org/six-ways-to-make-workers-business-owners-and-why-its-a-good-idea/",
  },
  {
    title: "Closing the wealth gap: The solution is hiding in plain sight",
    source: "Fast Company, November 24th, 2025",
    url: "https://www.fastcompany.com/91446200/closing-the-wealth-gap-the-solution-hiding-in-plain-sight",
  },
  {
    title:
      "These Three Businesses Are Creating A Worker-Owned Economy in Detroit",
    source: "WDET, October 4 2019",
    url: "https://wdet.org/posts/2019/10/04/88700-these-three-businesses-are-creating-a-worker-owned-economy-in-detroit/",
  },
  {
    title: "New loan fund looks to develop co-op economy in Detroit",
    source: "Model D, October 2 2018",
    url: "https://www.modeldmedia.com/inthenews/community-wealth-fund-100218.aspx",
  },
  {
    title: "What to know about co-ops, and why you may consider joining one",
    source: "Outlier Media, June 20th, 2025",
    url: "https://outliermedia.org/detroit-cooperative-business-explainer-members-costs/",
  },
];

function readString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

/**
 * Rows missing a title or url are dropped so a half-filled editor row never
 * renders as a broken link. An entirely empty result falls back to DCWF's
 * real press coverage rather than rendering nothing.
 */
export function toWealthNewsRows(raw: unknown): WealthNewsItem[] {
  const rows = parseTemplateListRows(raw)
    .map((row) => ({
      title: readString(row, "title"),
      source: readString(row, "source"),
      url: readString(row, "url"),
    }))
    .filter((row) => row.title !== "" && row.url !== "");
  return rows.length > 0 ? rows : WEALTH_NEWS_FALLBACK;
}
