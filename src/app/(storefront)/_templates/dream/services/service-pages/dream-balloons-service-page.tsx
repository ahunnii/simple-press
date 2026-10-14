/**
 * `dream-balloons` — the Lane page plus a balloon color studio between the
 * sections and the gallery (design.md "Service-page variants →
 * dream-balloons"). Every `dream-lane.*` key is reused, so the rest of the
 * page is literally `DreamLaneServicePage`.
 *
 * The studio's catalog is a picture-choice field on one of the business's
 * forms (`dream-balloons.color-source` = `"<formId>:<fieldId>"`, normally the
 * Estimate Quote form's "Balloon colors"). It renders only when ALL of these
 * hold, otherwise the page is exactly a Lane page:
 *   - the "Show the color studio" switch is on;
 *   - the `forms` feature flag is on;
 *   - the form exists in THIS business (`findUnique` scoped by businessId)
 *     and is published;
 *   - its stored definition parses and the field is a picture-choice field
 *     with at least one visible tile;
 *   - the effective palette size (`min(palette-max, field.maxTotal)`, 1 for a
 *     pick-one field) is at least 1.
 *
 * Hidden tiles never reach the browser (`visiblePictureOptions`). A tile's
 * finish comes from its group's label by keyword (standard / pearl / pastel /
 * retro / luster / platinum / crystal, else standard); finish descriptions
 * come from `group.description`, families from `option.family`.
 */
import type {
  DreamBalloonGroup,
  DreamBalloonStudioProps,
  DreamBalloonTile,
} from "./dream-balloon-studio";
import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { parseFormPictureFieldValue } from "~/lib/template-fields";
import {
  parseStoredFormDefinition,
  visiblePictureOptions,
} from "~/lib/validators/form";
import { db } from "~/server/db";

import { DREAM_QUOTE_HREF } from "../../shared/dream-quote-href";
import { balloonFinishFromLabel } from "./dream-balloon-garland-layout";
import { DreamBalloonStudio } from "./dream-balloon-studio";
import { DreamLaneServicePage } from "./dream-lane-service-page";
import {
  DREAM_BALLOONS_COLOR_SOURCE_KEY,
  DREAM_BALLOONS_PALETTE_DEFAULT,
  DREAM_BALLOONS_PALETTE_MAX,
  DREAM_BALLOONS_PALETTE_MIN,
  resolveDreamBalloonsFields,
} from "./fields";

const FIELD_KEYS = [
  "dream-balloons.studio-visible",
  DREAM_BALLOONS_COLOR_SOURCE_KEY,
  "dream-balloons.studio-heading",
  "dream-balloons.studio-lede",
  "dream-balloons.palette-max",
  "dream-balloons.cta-label",
  "dream-balloons.cta-url",
];

/** The studio's props, or null when anything is missing (→ a plain Lane page). Exported for tests. */
export async function loadDreamBalloonStudio(
  businessId: string,
  customFields: unknown,
): Promise<DreamBalloonStudioProps | null> {
  const f = resolveDreamBalloonsFields(customFields, FIELD_KEYS);
  if (f["dream-balloons.studio-visible"] === "false") return null;

  const source = parseFormPictureFieldValue(f[DREAM_BALLOONS_COLOR_SOURCE_KEY]);
  if (!source) return null;

  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("forms")) return null;

  const form = await db.form.findUnique({
    where: { id: source.formId, businessId },
    select: { id: true, published: true, definition: true },
  });
  if (!form?.published) return null;

  const parsed = parseStoredFormDefinition(form.definition);
  if (!parsed.success) return null;
  const field = parsed.data.fields.find((fd) => fd.id === source.fieldId);
  if (field?.type !== "picturechoice") return null;

  const options = visiblePictureOptions(field);
  if (options.length === 0) return null;

  const requested = Number.parseInt(f["dream-balloons.palette-max"] ?? "", 10);
  const paletteMax = Number.isFinite(requested)
    ? Math.min(
        DREAM_BALLOONS_PALETTE_MAX,
        Math.max(DREAM_BALLOONS_PALETTE_MIN, requested),
      )
    : DREAM_BALLOONS_PALETTE_DEFAULT;
  const fieldMax =
    field.selection === "one"
      ? 1
      : (field.maxTotal ?? Number.POSITIVE_INFINITY);
  const max = Math.min(paletteMax, fieldMax, options.length);
  if (max < 1) return null;

  const groupIds = new Set((field.groups ?? []).map((g) => g.id));
  const groups: DreamBalloonGroup[] = (field.groups ?? []).map((g) => ({
    id: g.id,
    label: g.label,
    description: g.description?.trim() ? g.description.trim() : null,
    finish: balloonFinishFromLabel(g.label),
  }));
  const tiles: DreamBalloonTile[] = options.map((o) => ({
    id: o.id,
    label: o.label,
    code: o.code ?? null,
    color: o.color ?? null,
    imageUrl: o.imageUrl ?? null,
    family: o.family ?? null,
    groupId: o.groupId && groupIds.has(o.groupId) ? o.groupId : null,
  }));

  // A field saved blank falls back to its built-in wording (the lede may be blank).
  const text = (key: string, fallback: string) => {
    const value = f[key]?.trim() ?? "";
    return value === "" ? fallback : value;
  };

  return {
    tiles,
    groups,
    fieldId: field.id,
    max,
    heading: text(
      "dream-balloons.studio-heading",
      "Build your balloon palette",
    ),
    lede: text("dream-balloons.studio-lede", ""),
    ctaLabel: text("dream-balloons.cta-label", "Use these colors in my quote"),
    ctaUrl: text("dream-balloons.cta-url", DREAM_QUOTE_HREF),
    storageKey: `dream-balloon-palette:${form.id}:${field.id}`,
  };
}

export async function DreamBalloonsServicePage(props: ServiceTemplateProps) {
  const studio = await loadDreamBalloonStudio(
    props.business.id,
    props.service.customFields,
  );
  return (
    <DreamLaneServicePage
      {...props}
      afterSections={
        studio ? (
          <section
            className="dream-section dream-balloon-studio-section"
            id="colors"
          >
            <div className="mx-auto w-full [max-width:var(--dream-container)] px-[var(--dream-gutter)]">
              <DreamBalloonStudio {...studio} />
            </div>
          </section>
        ) : undefined
      }
    />
  );
}
