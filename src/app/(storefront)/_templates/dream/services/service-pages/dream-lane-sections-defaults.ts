/**
 * Built-in example rows for `dream-lane.sections` (the field's `defaultRows`
 * AND the page's fallback while the list is unsaved or saved empty).
 *
 * Kept in a leaf module with no imports so both `fields.ts` (which builds the
 * field) and the page/classifier can import it without a circular import
 * through `~/lib/template-fields` (see the note on `iconRowsFromDefaults`
 * there). Copy is the retired numbered `block-{1,2,3}-*` fields' old
 * defaults, verbatim. `/placeholder.svg` is the platform's "no image" marker:
 * each row renders the designed "photo coming soon" tile until a photo is
 * picked, which teaches that photos belong there.
 */
export const DREAM_LANE_SECTIONS_KEY = "dream-lane.sections";

export const DREAM_LANE_SECTIONS_DEFAULT_ROWS: Record<string, string>[] = [
  {
    heading: "How it starts",
    body: "Share your event date, venue, and the look you're imagining. Selest sketches a plan built around your colors and space.",
    image: "/placeholder.svg",
    alt: "",
    crop: "false",
  },
  {
    heading: "What's included",
    body: "Every layer — panels, colors, chairs, and accents — is chosen to fit your theme, then delivered and styled on site.",
    image: "/placeholder.svg",
    alt: "",
    crop: "false",
  },
  {
    heading: "On the day",
    body: "Selest arrives ahead of your event to install the full look, then returns after to break it down.",
    image: "/placeholder.svg",
    alt: "",
    crop: "false",
  },
];
