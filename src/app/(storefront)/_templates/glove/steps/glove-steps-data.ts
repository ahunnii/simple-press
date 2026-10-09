import { resolveFields } from "..";
import { gloveLinkAllowed } from "./glove-links";
import { resolveGloveListRows } from "./glove-list-rows";
import {
  GLOVE_STEPS_CLOSING_HEADING_KEY,
  GLOVE_STEPS_CLOSING_LABEL_KEY,
  GLOVE_STEPS_CLOSING_URL_KEY,
  GLOVE_STEPS_DEFAULT_ROWS,
  GLOVE_STEPS_FIELD_KEYS,
  GLOVE_STEPS_HEADING_KEY,
  GLOVE_STEPS_LIST_KEY,
} from "./glove-steps-fields";

/** One resolved step, ready to render. */
export type GloveStep = {
  id: string;
  /** Position in the saved list; targets the editor's list row. */
  index: number;
  title: string;
  accent: string;
  body: string;
  image: string;
  imageAlt: string;
  /** Empty when the button is blank or its route's feature is off. */
  buttonLabel: string;
  buttonUrl: string;
};

/** Everything `GloveSteps` renders, resolved from the owner's fields. */
export type GloveStepsFields = {
  heading: string;
  steps: GloveStep[];
  closingHeading: string;
  /** Empty when the closing button is blank or its route's feature is off. */
  closingLabel: string;
  closingUrl: string;
};

/**
 * Resolves the shared 6-step block from `customFields`. Call it from any
 * server component; pass the page's `isEnabled` (from `getBusinessFlags()`)
 * so step buttons that point at a switched-off feature are dropped.
 */
export function resolveGloveStepsFields(
  customFields: unknown,
  isEnabled?: (key: string) => boolean,
): GloveStepsFields {
  const f = resolveFields(customFields, GLOVE_STEPS_FIELD_KEYS);

  const steps = resolveGloveListRows(
    customFields,
    GLOVE_STEPS_LIST_KEY,
    GLOVE_STEPS_DEFAULT_ROWS,
    "step",
  )
    .map((row, index): GloveStep => {
      const wantsButton =
        (row.buttonLabel ?? "") !== "" &&
        gloveLinkAllowed(row.buttonUrl ?? "", isEnabled);
      return {
        id: row._id,
        index,
        title: row.title ?? "",
        accent: row.accent ?? "",
        body: row.body ?? "",
        image: row.image ?? "",
        imageAlt: row.imageAlt ?? "",
        buttonLabel: wantsButton ? (row.buttonLabel ?? "") : "",
        buttonUrl: wantsButton ? (row.buttonUrl ?? "") : "",
      };
    })
    .filter((step) => step.title !== "" || step.accent !== "");

  const closingUrl = f[GLOVE_STEPS_CLOSING_URL_KEY] ?? "";
  const closingLabel = f[GLOVE_STEPS_CLOSING_LABEL_KEY] ?? "";
  const showClosing = gloveLinkAllowed(closingUrl, isEnabled);

  return {
    heading: f[GLOVE_STEPS_HEADING_KEY] ?? "",
    steps,
    closingHeading: f[GLOVE_STEPS_CLOSING_HEADING_KEY] ?? "",
    closingLabel: showClosing ? closingLabel : "",
    closingUrl: showClosing ? closingUrl : "",
  };
}
