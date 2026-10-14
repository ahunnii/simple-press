import type { ImpactProgram } from "./impact-rows";
import type { ImpactFields } from "./wealth-impact-head";
import type { ImpactProgramEntry } from "./wealth-impact-hub";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { WealthArrowLink } from "../shared/wealth-arrow-link";
import { WealthPhoto } from "../shared/wealth-photo";
import {
  WEALTH_PROGRAM_TONES,
  WealthProgramCard,
} from "../shared/wealth-program-card";
import { WealthReveal } from "../shared/wealth-reveal";
import { programsHubShown, splitParagraphs } from "./impact-rows";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import {
  anchorProps,
  formatSectionNumber,
  ImpactSectionHead,
  val,
} from "./wealth-impact-head";
import {
  planImpactPrograms,
  programAnchorId,
  WealthImpactHub,
} from "./wealth-impact-hub";

export const IMPACT_PROGRAMS_ID = "programs";

type Props = {
  f: ImpactFields;
  /** Parsed rows; `linkUrl` is already "" for flag-disabled routes. */
  programs: ImpactProgram[];
  /** v2: render-order section number (eyebrow "05 · Programs"). */
  number?: number;
};

function ProgramText({
  p,
  headingId,
}: {
  p: ImpactProgram;
  headingId: string;
}) {
  return (
    <>
      {p.label ? (
        <p className="wealth-eyebrow wealth-eyebrow--block">{p.label}</p>
      ) : null}
      <h3 id={headingId} className="wealth-h2">
        {p.title}
      </h3>
      {splitParagraphs(p.copy).map((para, i) => (
        <p key={i} className="wealth-impact-row__copy">
          {para}
        </p>
      ))}
      {p.statValue ? (
        <div className="wealth-impact-row__stat">
          <span className="wealth-impact-row__num">{p.statValue}</span>
          {p.statCaption ? (
            <span className="wealth-impact-row__cap">{p.statCaption}</span>
          ) : null}
        </div>
      ) : null}
      {p.linkLabel && p.linkUrl ? (
        <WealthArrowLink href={p.linkUrl}>{p.linkLabel}</WealthArrowLink>
      ) : null}
    </>
  );
}

/** Card eyebrow: the row's own label, else "01 · SHORT" (or just "01"). */
export function programCardEyebrow(p: ImpactProgram, n: number): string {
  if (p.label) return p.label;
  const no = formatSectionNumber(n);
  return p.short ? `${no} · ${p.short}` : no;
}

/** A card/row run in render order: photo rows alone, consecutive cards grouped. */
type Segment =
  | { kind: "row"; entry: ImpactProgramEntry & { n: number } }
  | { kind: "cards"; entries: (ImpactProgramEntry & { n: number })[] };

export function programSegments(entries: ImpactProgramEntry[]): Segment[] {
  const out: Segment[] = [];
  for (const entry of entries) {
    if (entry.n === null || entry.layout === "hub") continue;
    const e = { ...entry, n: entry.n };
    if (entry.layout === "row") {
      out.push({ kind: "row", entry: e });
      continue;
    }
    const last = out[out.length - 1];
    if (last?.kind === "cards") last.entries.push(e);
    else out.push({ kind: "cards", entries: [e] });
  }
  return out;
}

function ProgramCard({
  entry,
  tone,
  delay,
}: {
  entry: ImpactProgramEntry & { n: number };
  tone: (typeof WEALTH_PROGRAM_TONES)[number];
  delay: number;
}) {
  const p = entry.program;
  const anchor = programAnchorId(entry.n);
  const headingId = `${anchor}-h`;
  const paras = splitParagraphs(p.copy);
  // WealthProgramCard wraps `copy` in ONE <p>, so paragraphs and the
  // highlight are block spans inside it (valid phrasing content).
  const copy =
    paras.length > 0 || p.statValue ? (
      <>
        {paras.map((para, i) => (
          <span key={i} className="wealth-impact-card__para">
            {para}
          </span>
        ))}
        {p.statValue ? (
          <span className="wealth-impact-card__stat">
            <span className="wealth-impact-card__num">{p.statValue}</span>
            {p.statCaption ? (
              <span className="wealth-impact-card__cap">{p.statCaption}</span>
            ) : null}
          </span>
        ) : null}
      </>
    ) : undefined;

  return (
    <WealthReveal delay={delay} className="wealth-impact-cards__cell">
      <WealthProgramCard
        {...listItemAttr(K.programsItems, p.index)}
        id={anchor}
        aria-labelledby={headingId}
        tone={tone}
        number={programCardEyebrow(p, entry.n)}
        title={p.title}
        titleProps={{ id: headingId }}
        copy={copy}
        cta={
          p.linkLabel && p.linkUrl
            ? { label: p.linkLabel, href: p.linkUrl }
            : null
        }
        className="wealth-impact-card"
      />
    </WealthReveal>
  );
}

function ProgramRow({
  entry,
  flip,
}: {
  entry: ImpactProgramEntry & { n: number };
  flip: boolean;
}) {
  const p = entry.program;
  const anchor = programAnchorId(entry.n);
  const headingId = `${anchor}-h`;
  return (
    <article
      {...listItemAttr(K.programsItems, p.index)}
      id={anchor}
      aria-labelledby={headingId}
      className={cn("wealth-impact-row", flip && "wealth-impact-row--flip")}
    >
      <WealthReveal className="wealth-impact-row__media">
        <WealthPhoto
          src={p.image}
          alt={p.imageAlt}
          sizes="(min-width: 900px) 50vw, 100vw"
        />
      </WealthReveal>
      <WealthReveal delay={1} className="wealth-impact-row__text">
        <ProgramText p={p} headingId={headingId} />
      </WealthReveal>
    </article>
  );
}

function ProgramList({ segments }: { segments: Segment[] }) {
  let photoRow = 0;
  let card = 0;
  return (
    <div className="wealth-impact-rows wealth-impact-programs__list">
      {segments.map((seg) => {
        if (seg.kind === "row") {
          const flip = photoRow % 2 === 1;
          photoRow += 1;
          return (
            <ProgramRow
              key={seg.entry.program.id}
              entry={seg.entry}
              flip={flip}
            />
          );
        }
        return (
          <div
            key={seg.entries[0]?.program.id ?? "cards"}
            className="wealth-impact-cards"
          >
            {seg.entries.map((entry, i) => {
              const tone =
                WEALTH_PROGRAM_TONES[card % WEALTH_PROGRAM_TONES.length] ??
                "forest";
              card += 1;
              return (
                <ProgramCard
                  key={entry.program.id}
                  entry={entry}
                  tone={tone}
                  delay={i % 2}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Programs (design.md v2 §7). One section root (`impact.programs`, id
 * `programs`) in both modes, so the editor sees one group:
 *
 * - **Hub shown** (`programs-hub-label` set and ≥3 programs): the root is an
 *   unpadded paper block holding two padded inner blocks: the sage hub
 *   overview (`WealthImpactHub`, numbered eyebrow + hub heading) and, when
 *   any program renders as a card/row, a paper block with the programs
 *   heading + intro and the list. Same-tone hairline: the ROOT carries
 *   `wealth-on-paper` + `wealth-impact-anchor`, so a following paper
 *   section still gets its rule; a preceding paper section's rule paints on
 *   the root but sits under the sage block (correct: sage ≠ paper).
 * - **No hub**: today's single paper section with the numbered head.
 *
 * Photo programs keep the alternating photo/text rows; copy-only programs
 * become solid `WealthProgramCard`s 2-up (forest/primary/sage/surface);
 * title-only programs live in the hub only (or fall back to cards when the
 * hub is hidden, per `programLayout`). Each card/row has `impact-program-N`.
 */
export function WealthImpactPrograms({ f, programs, number }: Props) {
  const id = IMPACT_PROGRAMS_ID;
  const intro = val(f, K.programsIntro);
  const heading = val(f, K.programsHeading);
  const hubShown = programsHubShown(
    val(f, K.programsHubLabel),
    programs.length,
  );
  const entries = planImpactPrograms(programs, hubShown);
  const segments = programSegments(entries);

  const introNode = intro ? (
    <p {...fieldAttr(K.programsIntro)} className="wealth-impact-intro">
      {intro}
    </p>
  ) : null;

  if (!hubShown) {
    return (
      <section
        {...sectionGroupAttr("impact", "programs")}
        {...anchorProps(id, heading)}
        className="wealth-section wealth-on-paper wealth-impact-anchor wealth-impact-programs"
      >
        <div className="wealth-container">
          <ImpactSectionHead
            sectionId={id}
            number={number}
            eyebrow={val(f, K.programsEyebrow)}
            eyebrowKey={K.programsEyebrow}
            heading={heading}
            headingKey={K.programsHeading}
          >
            {introNode}
          </ImpactSectionHead>
          <ProgramList segments={segments} />
        </div>
      </section>
    );
  }

  const hubHeading = val(f, K.programsHubHeading);
  const listHeadingId = `${id}-list-h`;
  const showList = segments.length > 0;
  // Label the section by the hub heading, else by the list heading.
  const labelledBy = hubHeading
    ? `${id}-h`
    : showList && heading
      ? listHeadingId
      : undefined;

  return (
    <section
      {...sectionGroupAttr("impact", "programs")}
      id={id}
      tabIndex={-1}
      aria-labelledby={labelledBy}
      className="wealth-on-paper wealth-impact-anchor wealth-impact-programs wealth-impact-programs--hub"
    >
      <WealthImpactHub f={f} number={number} sectionId={id} entries={entries} />
      {showList ? (
        <div className="wealth-section wealth-on-paper wealth-impact-programs__below">
          <div className="wealth-container">
            <ImpactSectionHead
              sectionId={id}
              headingId={listHeadingId}
              eyebrow=""
              eyebrowKey={K.programsEyebrow}
              heading={heading}
              headingKey={K.programsHeading}
            >
              {introNode}
            </ImpactSectionHead>
            <ProgramList segments={segments} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
