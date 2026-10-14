"use client";

/**
 * The `dream-balloons` color studio (design.md "Service-page variants →
 * dream-balloons"): a React port of Section A of the approved prototype
 * (`docs/templates/dream/checkpoint/balloon-studio/index.html`).
 *
 * - Browser: finish tabs (role=tablist, automatic activation, ←/→/Home/End),
 *   a family radiogroup (roving tabindex), and a tile radiogroup with 2-D
 *   roving focus by geometry. Click/Space stages a tile; Enter stages it
 *   AND adds/removes it.
 * - Stage: the staged photo (two stacked <img> crossfading), name, code,
 *   finish and the finish's description, plus Add/Remove.
 * - Palette: chips with remove buttons, a polite live region ("Pearl Gold
 *   added — 3 of 6"), the SVG garland with Shuffle, and the quote CTA
 *   (`?pick=<fieldId>:<ids>` via `buildPicturePrefillParam`).
 * - Below desktop the stage sticks under the header as a compact strip and a
 *   fixed palette bar shows while the studio is on screen and its own CTA
 *   isn't.
 *
 * The palette persists in sessionStorage, read AFTER mount (so SSR and the
 * first client render agree). `matchMedia` is only read inside event
 * handlers, never during render (docs/dream-accessibility.md); every motion
 * is CSS and the scoped reduced-motion block switches it off.
 */
import type { CSSProperties, KeyboardEvent } from "react";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import type { BalloonFinish } from "./dream-balloon-garland-layout";
import {
  buildPicturePrefillParam,
  PICTURE_PREFILL_PARAM,
} from "~/lib/forms/prefill";
import { cn } from "~/lib/utils";

import { DreamButton } from "../../shared/dream-button";
import { DreamHeading } from "../../shared/dream-heading";
import { DreamReveal } from "../../shared/dream-reveal";
import { DreamBalloonGarland } from "./dream-balloon-garland";

// ─── Types ──────────────────────────────────────────────────────────────────

export type DreamBalloonTile = {
  id: string;
  label: string;
  /** Catalog code WITHOUT the `#`. */
  code: string | null;
  /** `#rrggbb`; missing → neutral dots and garland balloons. */
  color: string | null;
  imageUrl: string | null;
  family: string | null;
  groupId: string | null;
};

export type DreamBalloonGroup = {
  id: string;
  label: string;
  description: string | null;
  /** Read from the label by keyword (`balloonFinishFromLabel`). */
  finish: BalloonFinish;
};

export type DreamBalloonStudioProps = {
  tiles: DreamBalloonTile[];
  groups: DreamBalloonGroup[];
  /** The picture-choice field's id on the quote form (the `pick` prefix). */
  fieldId: string;
  /** Effective palette size (`min(palette-max, field.maxTotal)`). */
  max: number;
  heading: string;
  lede: string;
  ctaLabel: string;
  ctaUrl: string;
  /** sessionStorage key for this form field's palette. */
  storageKey: string;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const ALL = "all";
const OTHER = "__other";

/** Display order for the auto-derived families; unknown ones follow A→Z. */
const FAMILY_ORDER = [
  "Whites, greys & black",
  "Metallics",
  "Pinks",
  "Reds",
  "Oranges & peach",
  "Yellows",
  "Greens",
  "Blues",
  "Purples",
  "Browns & tans",
];

const FAMILY_DOT: Record<string, string> = {
  "Whites, greys & black":
    "linear-gradient(135deg, #ffffff 0 50%, #2b2b2b 50%)",
  Metallics:
    "linear-gradient(135deg, #f5df96, #c79a2d 45%, #eceef0 58%, #a7a9ad)",
  Pinks: "#ef9fb6",
  Reds: "#b3333b",
  "Oranges & peach": "#f39a5c",
  Yellows: "#f0cc3f",
  Greens: "#6aa96b",
  Blues: "#5f9fd6",
  Purples: "#9a7cc4",
  "Browns & tans": "#9a7350",
};

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Only ever called from event handlers — never during render. */
function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function scrollNearest(node: Element, inline = false) {
  node.scrollIntoView({
    block: "nearest",
    ...(inline ? { inline: "nearest" as const } : {}),
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

/** `url` + `pick=<value>`, keeping any existing query and hash. */
export function withPickParam(url: string, value: string): string {
  const hashAt = url.indexOf("#");
  const base = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const hash = hashAt >= 0 ? url.slice(hashAt) : "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${PICTURE_PREFILL_PARAM}=${encodeURIComponent(value)}${hash}`;
}

function finishText(group: DreamBalloonGroup | undefined): string {
  if (!group) return "";
  return /finish/i.test(group.label) ? group.label : `${group.label} finish`;
}

/** A tiny finish-aware sphere (`.dbs-orb`); `--hex` falls back to a neutral token in CSS. */
function Orb({
  color,
  finish,
  className,
}: {
  color: string | null | undefined;
  finish: BalloonFinish;
  className?: string;
}) {
  return (
    <span
      className={cn("dbs-orb", className)}
      data-finish={finish}
      style={color ? ({ "--hex": color } as CSSProperties) : undefined}
      aria-hidden="true"
    />
  );
}

function IconPlus() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
function IconMinus() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}
function IconX() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
function IconShuffle() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m18 14 4 4-4 4" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
      <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
      <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
    </svg>
  );
}

/** Toggles `is-overflowing` (right-edge fade) while a horizontal scroller hides more. */
function useOverflowFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const sync = () =>
      setOverflowing(root.scrollLeft + root.clientWidth < root.scrollWidth - 2);
    root.addEventListener("scroll", sync, { passive: true });
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(sync);
      ro.observe(root);
    }
    sync();
    return () => {
      root.removeEventListener("scroll", sync);
      ro?.disconnect();
    };
  }, []);
  return { ref, overflowing };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DreamBalloonStudio({
  tiles,
  groups,
  fieldId,
  max,
  heading,
  lede,
  ctaLabel,
  ctaUrl,
  storageKey,
}: DreamBalloonStudioProps) {
  const idPrefix = `dbs${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // ── Derived catalog ──
  const byId = useMemo(() => new Map(tiles.map((t) => [t.id, t])), [tiles]);
  const groupById = useMemo(
    () => new Map(groups.map((g) => [g.id, g])),
    [groups],
  );
  const groupOf = useCallback(
    (t: DreamBalloonTile) => (t.groupId ? groupById.get(t.groupId) : undefined),
    [groupById],
  );
  const finishOf = useCallback(
    (t: DreamBalloonTile): BalloonFinish => groupOf(t)?.finish ?? "standard",
    [groupOf],
  );

  /** Tabs: All, each group with visible tiles, then Other for ungrouped tiles. */
  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tiles) {
      const key = groupOf(t)?.id ?? OTHER;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const out: {
      key: string;
      label: string;
      count: number;
      group?: DreamBalloonGroup;
    }[] = [{ key: ALL, label: "All", count: tiles.length }];
    for (const g of groups) {
      const n = counts.get(g.id) ?? 0;
      if (n > 0) out.push({ key: g.id, label: g.label, count: n, group: g });
    }
    const other = counts.get(OTHER) ?? 0;
    if (other > 0 && out.length > 1) {
      out.push({ key: OTHER, label: "Other", count: other });
    }
    return out;
  }, [tiles, groups, groupOf]);
  const showTabs = tabs.length > 1;

  // ── State ──
  const [finish, setFinish] = useState<string>(ALL);
  const [family, setFamily] = useState<string>(ALL);
  const [staged, setStaged] = useState<string>(tiles[0]?.id ?? "");
  const [palette, setPalette] = useState<string[]>([]);
  const [shuffle, setShuffle] = useState(0);
  const [status, setStatus] = useState("");
  const [bump, setBump] = useState(0);
  const [garlandKey, setGarlandKey] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const statusTimer = useRef<number | null>(null);
  const announce = useCallback((message: string) => {
    setStatus("");
    if (statusTimer.current !== null) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(message), 40);
  }, []);
  useEffect(
    () => () => {
      if (statusTimer.current !== null)
        window.clearTimeout(statusTimer.current);
    },
    [],
  );

  // ── Palette persistence (read after mount, inside try/catch) ──
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const ids = [
            ...new Set(
              parsed.filter(
                (id): id is string => typeof id === "string" && byId.has(id),
              ),
            ),
          ].slice(0, max);
          if (ids.length > 0) {
            setPalette(ids);
            setGarlandKey((k) => k + 1);
          }
        }
      }
    } catch {
      // Private mode / blocked storage: start empty.
    }
    setHydrated(true);
    // Runs once per field: the catalog is fixed for the page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (palette.length > 0) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(palette));
      } else {
        window.sessionStorage.removeItem(storageKey);
      }
    } catch {
      // Ignore: persistence is a convenience.
    }
  }, [hydrated, palette, storageKey]);

  // ── Browser lists ──
  const base = useMemo(
    () =>
      finish === ALL
        ? tiles
        : tiles.filter((t) => (groupOf(t)?.id ?? OTHER) === finish),
    [tiles, finish, groupOf],
  );

  const families = useMemo(() => {
    const present = new Set(
      base.map((t) => t.family).filter((f): f is string => Boolean(f)),
    );
    const known = FAMILY_ORDER.filter((f) => present.has(f));
    const extra = [...present]
      .filter((f) => !FAMILY_ORDER.includes(f))
      .sort((a, b) => a.localeCompare(b));
    return [...known, ...extra];
  }, [base]);
  const showFamilies = families.length > 1;
  const activeFamily = showFamilies && families.includes(family) ? family : ALL;

  const visible = useMemo(
    () =>
      activeFamily === ALL
        ? base
        : base.filter((t) => t.family === activeFamily),
    [base, activeFamily],
  );

  const familyDot = useCallback(
    (f: string) => {
      if (FAMILY_DOT[f]) return FAMILY_DOT[f];
      const sample = tiles.find((t) => t.family === f && t.color);
      return sample?.color ?? "var(--dream-peach)";
    },
    [tiles],
  );

  // ── Stage ──
  const stagedTile = byId.get(staged) ?? tiles[0];
  const stagedGroup = stagedTile ? groupOf(stagedTile) : undefined;
  const inPalette = stagedTile ? palette.includes(stagedTile.id) : false;
  const full = palette.length >= max;

  // Crossfade: two stacked images; the back one loads the next photo, then
  // becomes current. A tile with no photo shows a CSS balloon instead.
  const [layers, setLayers] = useState<{
    a: string | null;
    b: string | null;
    front: "a" | "b";
  }>({ a: stagedTile?.imageUrl ?? null, b: null, front: "a" });
  const wantedSrc = stagedTile?.imageUrl ?? null;
  useEffect(() => {
    setLayers((prev) => {
      if (!wantedSrc) return prev;
      const frontSrc = prev.front === "a" ? prev.a : prev.b;
      if (frontSrc === wantedSrc) return prev;
      return prev.front === "a"
        ? { ...prev, b: wantedSrc }
        : { ...prev, a: wantedSrc };
    });
  }, [wantedSrc]);
  const onLayerReady = (slot: "a" | "b") => {
    setLayers((prev) => {
      const src = slot === "a" ? prev.a : prev.b;
      if (src !== wantedSrc || prev.front === slot) return prev;
      return { ...prev, front: slot };
    });
  };

  // ── Palette actions ──
  const togglePalette = useCallback(
    (id: string): boolean => {
      const t = byId.get(id);
      if (!t) return false;
      const i = palette.indexOf(id);
      if (i >= 0) {
        const next = palette.filter((p) => p !== id);
        setPalette(next);
        announce(`${t.label} removed — ${next.length} of ${max}`);
      } else if (palette.length >= max) {
        announce(`Your palette is full. Remove a color to add ${t.label}.`);
        return false;
      } else {
        const next = [...palette, id];
        setPalette(next);
        announce(`${t.label} added — ${next.length} of ${max}`);
      }
      setBump((b) => b + 1);
      setGarlandKey((k) => k + 1);
      return true;
    },
    [byId, palette, max, announce],
  );

  const stage = useCallback((id: string) => setStaged(id), []);

  // Focus after removing a chip: next chip, then previous, then the heading.
  const listRef = useRef<HTMLOListElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingChipFocus = useRef<number | null>(null);
  useEffect(() => {
    const index = pendingChipFocus.current;
    if (index === null) return;
    pendingChipFocus.current = null;
    const buttons =
      listRef.current?.querySelectorAll<HTMLButtonElement>("[data-remove]");
    const target = buttons?.[index] ?? buttons?.[index - 1];
    (target ?? headingRef.current)?.focus();
  }, [palette]);

  // ── Tabs keyboard (automatic activation) ──
  const tabsFade = useOverflowFade<HTMLDivElement>();
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const selectTab = (key: string, focus: boolean) => {
    setFinish(key);
    setFamily(ALL);
    if (focus) {
      const el = tabRefs.current.get(key);
      if (el) {
        el.focus();
        scrollNearest(el, true);
      }
    }
  };
  const onTabsKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.key === finish);
    let n: number | null = null;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = tabs.length - 1;
    if (n === null) return;
    e.preventDefault();
    selectTab(tabs[n]!.key, true);
  };

  // ── Family keyboard (radiogroup) ──
  const famRefs = useRef(new Map<string, HTMLButtonElement>());
  const familyOptions = [ALL, ...families];
  const selectFamily = (f: string, focus: boolean) => {
    setFamily(f);
    if (focus) {
      const el = famRefs.current.get(f);
      if (el) {
        el.focus();
        scrollNearest(el, true);
      }
    }
  };
  const onFamiliesKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = familyOptions.indexOf(activeFamily);
    let n: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      n = (i + 1) % familyOptions.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      n = (i - 1 + familyOptions.length) % familyOptions.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = familyOptions.length - 1;
    if (n === null) return;
    e.preventDefault();
    selectFamily(familyOptions[n]!, true);
  };

  // ── Grid: 2-D roving focus by geometry, Enter toggles ──
  const gridRef = useRef<HTMLDivElement>(null);
  const tabbableTile = visible.some((t) => t.id === staged)
    ? staged
    : visible[0]?.id;
  const onGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const tile = (e.target as HTMLElement).closest<HTMLElement>("[data-tile]");
    if (!tile) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const id = tile.dataset.tile!;
      stage(id);
      togglePalette(id);
      return;
    }
    if (
      ![
        "ArrowRight",
        "ArrowLeft",
        "ArrowDown",
        "ArrowUp",
        "Home",
        "End",
      ].includes(e.key)
    )
      return;
    const items = [
      ...(gridRef.current?.querySelectorAll<HTMLElement>("[data-tile]") ?? []),
    ];
    const i = items.indexOf(tile);
    if (i < 0) return;
    e.preventDefault();
    const top = items[0]!.offsetTop;
    let cols = items.findIndex((it) => it.offsetTop !== top);
    if (cols < 0) cols = items.length;
    let n = i;
    if (e.key === "ArrowRight") n = Math.min(items.length - 1, i + 1);
    else if (e.key === "ArrowLeft") n = Math.max(0, i - 1);
    else if (e.key === "ArrowDown") n = i + cols < items.length ? i + cols : i;
    else if (e.key === "ArrowUp") n = i - cols >= 0 ? i - cols : i;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = items.length - 1;
    if (n === i) return;
    const next = items[n]!;
    next.focus();
    scrollNearest(next);
    stage(next.dataset.tile!);
  };

  // ── Mobile palette bar: shown while the studio is on screen and the
  //    palette's own CTA isn't. ──
  const rootRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const root = rootRef.current;
    const cta = ctaRef.current;
    if (!root || !cta) return;
    let studioOn = false;
    let ctaOn = false;
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.target === root) studioOn = en.isIntersecting;
        else ctaOn = en.isIntersecting;
      }
      setBarVisible(studioOn && !ctaOn);
    });
    io.observe(root);
    io.observe(cta);
    return () => io.disconnect();
  }, []);

  // ── CTA ──
  const href =
    palette.length > 0
      ? withPickParam(ctaUrl, buildPicturePrefillParam(fieldId, palette))
      : ctaUrl;

  const paletteTiles = palette
    .map((id) => byId.get(id))
    .filter((t): t is DreamBalloonTile => Boolean(t));
  const garlandColors = paletteTiles.map((t) => ({
    id: t.id,
    label: t.label,
    hex: t.color,
    finish: finishOf(t),
  }));

  // ── Finish line ──
  const activeTab = tabs.find((t) => t.key === finish) ?? tabs[0]!;
  const groupCount = tabs.filter((t) => t.group).length;
  const finishLine =
    activeTab.key === ALL
      ? groupCount > 1
        ? `Every color I carry, across all ${NUMBER_WORDS[groupCount] ?? groupCount} finishes.`
        : "Every color I carry."
      : activeTab.group?.description
        ? `${activeTab.label}: ${activeTab.group.description}`
        : activeTab.label;
  const finishSample =
    activeTab.key === ALL
      ? null
      : (base.find((t) => t.color) ?? base[0] ?? null);

  const panelId = `${idPrefix}-panel`;
  const hintId = `${idPrefix}-hint`;
  const limitId = `${idPrefix}-limit`;
  const headingId = `${idPrefix}-heading`;
  const paletteHeadingId = `${idPrefix}-palette-heading`;
  const stageNameId = `${idPrefix}-stage-name`;

  // The last word of the heading is the one script accent (design.md
  // Typography), as in the prototype's "Build your balloon *palette*".
  const headingWords = heading.trim().split(/\s+/);
  const accent = headingWords.length > 1 ? headingWords.pop()! : "";
  const headingLead = headingWords.join(" ");

  if (!stagedTile) return null;

  const grid = (
    <>
      <p className="sr-only" id={hintId}>
        Press Enter to add or remove this color from your palette.
      </p>
      <div
        ref={gridRef}
        className="dbs-grid"
        role="radiogroup"
        aria-label="Balloon colors"
        onKeyDown={onGridKeyDown}
      >
        {visible.map((t) => {
          const pos = palette.indexOf(t.id);
          const on = t.id === stagedTile.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              className={cn("dbs-tile", pos >= 0 && "is-picked")}
              data-tile={t.id}
              aria-checked={on}
              tabIndex={t.id === tabbableTile ? 0 : -1}
              aria-describedby={hintId}
              onClick={() => stage(t.id)}
            >
              <span className="dbs-tile-art">
                {t.imageUrl ? (
                  // Small trimmed catalog WebPs from the form's tiles; plain
                  // <img> like the form's own picture-choice field.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <Orb
                    color={t.color}
                    finish={finishOf(t)}
                    className="dbs-orb--tile"
                  />
                )}
              </span>
              <span className="dbs-tile-name">{t.label}</span>
              {t.code ? <span className="dbs-tile-code">#{t.code}</span> : null}
              <span className="dbs-tile-badge" aria-hidden="true">
                {pos >= 0 ? pos + 1 : ""}
              </span>
              {pos >= 0 ? (
                <span className="sr-only">, in your palette</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="dream-balloon-studio">
      <DreamReveal>
        <div className="dbs-head">
          <DreamHeading as="h2" id={headingId} accent={accent || undefined}>
            {headingLead || heading}
          </DreamHeading>
          {lede ? <p className="dbs-lede">{lede}</p> : null}
        </div>
      </DreamReveal>

      <div className="dbs-studio" ref={rootRef}>
        <div className="dbs-left">
          {/* Stage */}
          <div className="dbs-stage" aria-labelledby={stageNameId} role="group">
            <div className="dbs-stage-art" aria-hidden="true">
              <div className="dbs-stage-float">
                {(["a", "b"] as const).map((slot) => {
                  const src = layers[slot];
                  if (!src) return null;
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={slot}
                      className={cn(
                        "dbs-stage-img",
                        wantedSrc && layers.front === slot && "is-current",
                      )}
                      src={src}
                      alt=""
                      decoding="async"
                      onLoad={() => onLayerReady(slot)}
                      onError={() => onLayerReady(slot)}
                    />
                  );
                })}
                {!wantedSrc ? (
                  <Orb
                    color={stagedTile.color}
                    finish={finishOf(stagedTile)}
                    className="dbs-orb--stage"
                  />
                ) : null}
                <svg
                  className="dbs-stage-string"
                  viewBox="0 0 24 52"
                  preserveAspectRatio="none"
                >
                  <path d="M12 0 C 6 14, 18 26, 11 38 S 13 50, 12 52" />
                </svg>
              </div>
            </div>
            <div className="dbs-stage-info">
              <h3 className="dbs-stage-name" id={stageNameId}>
                {stagedTile.label}
              </h3>
              <p className="dbs-stage-meta">
                <Orb
                  color={stagedTile.color}
                  finish={finishOf(stagedTile)}
                  className="dbs-orb--lg"
                />
                {stagedTile.code ? (
                  <span className="dbs-code">#{stagedTile.code}</span>
                ) : null}
                {stagedTile.code && stagedGroup ? (
                  <span className="dbs-sep" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                {stagedGroup ? <span>{finishText(stagedGroup)}</span> : null}
              </p>
              {stagedGroup?.description ? (
                <p className="dbs-stage-desc">{stagedGroup.description}</p>
              ) : null}
              <button
                type="button"
                className={cn(
                  "dream-btn dbs-stage-toggle",
                  inPalette && "dream-btn--secondary",
                )}
                aria-describedby={limitId}
                disabled={!inPalette && full}
                onClick={() => togglePalette(stagedTile.id)}
              >
                {inPalette ? <IconMinus /> : <IconPlus />}
                {inPalette ? "Remove from palette" : "Add to palette"}
              </button>
              <p
                className="dbs-stage-limit"
                id={limitId}
                hidden={inPalette || !full}
              >
                {!inPalette && full
                  ? `Your palette has ${max} colors. Remove one to make room for ${stagedTile.label}.`
                  : ""}
              </p>
            </div>
          </div>

          {/* Palette */}
          <div className="dbs-palette">
            <div className="dbs-palette-head">
              <h3 id={paletteHeadingId} ref={headingRef} tabIndex={-1}>
                Your palette
              </h3>
              <p
                key={bump}
                className={cn("dbs-count", bump > 0 && "is-bumped")}
              >
                {palette.length} of {max}
              </p>
            </div>
            <ol
              ref={listRef}
              className="dbs-chips"
              aria-labelledby={paletteHeadingId}
              hidden={paletteTiles.length === 0}
            >
              {paletteTiles.map((t, index) => (
                <li key={t.id} className="dbs-chip">
                  <Orb color={t.color} finish={finishOf(t)} />
                  <span className="dbs-chip-name">{t.label}</span>
                  <button
                    type="button"
                    className="dbs-chip-x"
                    data-remove={t.id}
                    aria-label={`Remove ${t.label}`}
                    onClick={() => {
                      pendingChipFocus.current = index;
                      togglePalette(t.id);
                    }}
                  >
                    <IconX />
                  </button>
                </li>
              ))}
            </ol>
            {paletteTiles.length === 0 ? (
              <p className="dbs-palette-empty">
                Nothing here yet. Tap a balloon, then add it to your palette.
              </p>
            ) : null}

            <figure className="dbs-garland-frame">
              <div className="dbs-garland">
                <DreamBalloonGarland
                  key={garlandKey}
                  colors={garlandColors}
                  shuffle={shuffle}
                  max={max}
                />
              </div>
              {garlandColors.length === 0 ? (
                <p className="dbs-garland-empty">
                  <span>Pick up to {max} colors to see your garland</span>
                </p>
              ) : null}
            </figure>
            <div className="dbs-garland-actions">
              <p className="dbs-garland-note">
                A quick sketch of how your colors sit together. I balance the
                real garland by hand, on site.
              </p>
              <DreamButton
                variant="secondary"
                className="dbs-shuffle"
                disabled={garlandColors.length < 2}
                onClick={() => {
                  setShuffle((s) => s + 1);
                  setGarlandKey((k) => k + 1);
                  announce("Shuffled — same colors, a new arrangement");
                }}
              >
                <IconShuffle />
                Shuffle
              </DreamButton>
            </div>

            <div className="dbs-palette-cta" ref={ctaRef}>
              <DreamButton href={href}>
                {ctaLabel}
                <IconArrow />
              </DreamButton>
            </div>
          </div>
        </div>

        {/* Browser */}
        <div className="dbs-browser">
          {showTabs ? (
            <div
              ref={tabsFade.ref}
              className={cn(
                "dbs-tabs",
                tabsFade.overflowing && "is-overflowing",
              )}
              role="tablist"
              aria-label="Balloon finish"
              onKeyDown={onTabsKeyDown}
            >
              {tabs.map((t) => {
                const on = t.key === activeTab.key;
                return (
                  <button
                    key={t.key}
                    ref={(el) => {
                      if (el) tabRefs.current.set(t.key, el);
                      else tabRefs.current.delete(t.key);
                    }}
                    type="button"
                    role="tab"
                    className="dbs-tab"
                    id={`${idPrefix}-tab-${slug(t.key) || "x"}`}
                    aria-controls={panelId}
                    aria-selected={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => {
                      if (!on) selectTab(t.key, true);
                    }}
                  >
                    {t.label}
                    <span className="dbs-tab-count">
                      <span className="sr-only">, </span>
                      {t.count}
                      <span className="sr-only">
                        {t.count === 1 ? " color" : " colors"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          <p className="dbs-finish-line">
            {finishSample ? (
              <Orb color={finishSample.color} finish={finishOf(finishSample)} />
            ) : null}
            <span>{finishLine}</span>
          </p>
          {showFamilies ? (
            <div
              className="dbs-families"
              role="radiogroup"
              aria-label="Color family"
              onKeyDown={onFamiliesKeyDown}
            >
              {familyOptions.map((f) => {
                const on = f === activeFamily;
                return (
                  <button
                    key={f}
                    ref={(el) => {
                      if (el) famRefs.current.set(f, el);
                      else famRefs.current.delete(f);
                    }}
                    type="button"
                    role="radio"
                    className="dbs-fam"
                    id={`${idPrefix}-fam-${slug(f) || "x"}`}
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => {
                      if (!on) selectFamily(f, true);
                    }}
                  >
                    {f === ALL ? null : (
                      <span
                        className="dbs-fam-dot"
                        style={{ background: familyDot(f) }}
                        aria-hidden="true"
                      />
                    )}
                    {f === ALL ? "All colors" : f}
                  </button>
                );
              })}
            </div>
          ) : null}
          {showTabs ? (
            <div
              role="tabpanel"
              id={panelId}
              aria-labelledby={`${idPrefix}-tab-${slug(activeTab.key) || "x"}`}
            >
              {grid}
            </div>
          ) : (
            <div id={panelId}>{grid}</div>
          )}
        </div>
      </div>

      <div
        className="dbs-bar"
        data-visible={barVisible ? "true" : "false"}
        aria-hidden={!barVisible}
        inert={!barVisible}
      >
        <div className="dbs-bar-dots" aria-hidden="true">
          {paletteTiles.length > 0 ? (
            paletteTiles.map((t) => (
              <Fragment key={t.id}>
                <Orb color={t.color} finish={finishOf(t)} />
              </Fragment>
            ))
          ) : (
            <span className="dbs-bar-empty">No colors yet</span>
          )}
        </div>
        <DreamButton href={href}>
          <span className="dbs-num">
            {palette.length} of {max}
          </span>{" "}
          · Use in my quote
        </DreamButton>
      </div>
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
