/**
 * The PINKART wordmark, as the client's own letterforms.
 *
 * The logo is set in Belindarguez, which has no commercial license we can ship
 * — so the mark was traced from the client's artwork and inlined here as
 * geometry. That also means it is not a font at all: nothing to download, no
 * FOUT, no licensing question, and it scales to the 70rem the hero asks for
 * without a single blurry pixel.
 *
 * **Two callers, two color contexts.** The hero sits on the light/paper
 * background and calls `<PinkWordmarkSvg />` with no props — the defaults
 * (`--pink-rose` / `--pink-ink`) render byte-identically to the original
 * hero-only version of this component. The footer is dark on most routes
 * (`--pink-ink` near-black on near-black would vanish), so it passes
 * `accentColor`/`inkColor` computed from its own resolved tone — see
 * `pink-footer.tsx`, which reuses the same `accent`/`fg` tokens it already
 * derives for the text-wordmark fallback. `className` is overridable too so
 * the footer can size/position the mark independently of the hero's CSS
 * (`.pink-footer-wordmark-svg` vs `.pink-hero-wordmark-svg`).
 *
 * **The two groups are filled from props, not hardcoded hex** (still theme
 * tokens by default), so a theme preset that retints the template retints
 * the wordmark with it — the same contract the live-text version has. The
 * groups deliberately carry NO `fieldAttr` in either caller: the editor's
 * live-text patcher sets `textContent` on annotated elements, and on an SVG
 * `<g>` that would wipe the path children and blank half the mark (review
 * 2026-08-04). The wordmark follows the business name (Settings → General)
 * split on `pink.global.accent-word` (`pink-wordmark-split.ts`) — the same
 * derivation the header and footer use; changing either input swaps in the
 * live-text build.
 *
 * **Who decides it renders is different per caller.** In the HERO it is
 * automatic: the mark shows only while the business-name split still matches
 * `PINK_WORDMARK_DEFAULTS` — traced letterforms of the word "PINK" are worth
 * nothing to a shop that has renamed itself, and silently ignoring the
 * rename would be worse than a font swap. In the FOOTER it is an explicit owner switch
 * (`pink.global.footer-brand-mark`, default on). The first cut inferred it
 * from `business.name` instead, which meant a store whose Business row is
 * named anything but "PinkArt" — the `demo` store, for one — silently got the
 * text build with no way to ask for the mark (2026-08-05). An owner-facing
 * toggle is the honest version of that decision: it is theirs to make, and
 * the drawer says exactly what it does.
 *
 * **Accessibility is caller-decided.** By default the mark is `aria-hidden`
 * — the hero's H1 and the header wordmark already announce the shop name
 * beside it, so the hero call site (no `label` prop) stays silent in the
 * tree. Pass `label` (the footer does, with `businessName`) to instead
 * announce the mark as `role="img"` with that accessible name — required in
 * the footer, where it is the only brand identifier in that column.
 *
 * Pure server component.
 */
export const PINK_WORDMARK_DEFAULTS = { accent: "PINK", ink: "ART" } as const;

type PinkWordmarkSvgProps = {
  /** "PINK" half. Defaults to the hero's `--pink-rose`. */
  accentColor?: string;
  /** "ART" half. Defaults to the hero's `--pink-ink`. */
  inkColor?: string;
  className?: string;
  /** When set, the mark announces itself (role="img" + aria-label); otherwise aria-hidden. */
  label?: string;
};

export function PinkWordmarkSvg({
  accentColor = "var(--pink-rose)",
  inkColor = "var(--pink-ink)",
  className = "pink-hero-wordmark-svg",
  label,
}: PinkWordmarkSvgProps = {}) {
  const a11yProps = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };
  return (
    <svg
      viewBox="98 82 1696 303"
      focusable="false"
      className={className}
      {...a11yProps}
    >
      {/* "PINK" */}
      <g transform="matrix(.1 0 0 -.1 0 498)" fill={accentColor}>
        <path d="M1955 4130c-132-16-363-126-365-174 0-13 73 2 127 26 71 33 286 33 391 0 167-53 344-166 417-266 116-162 155-253 176-413 36-277-91-577-315-741-147-108-263-147-470-160-180-11-169-39 27-73 125-21 220-24 299-9 142 27 168 35 231 66 248 125 391 288 484 549 48 135 59 368 24 505-24 95-107 272-161 345-57 76-235 235-263 235-7 0-37 13-67 29-153 80-325 106-535 81" />
        <path d="M7383 4130c-22-9-39-43-28-60 3-5 17-130 30-277 14-147 29-299 34-338 6-38 17-171 26-295s24-292 35-375c10-82 21-190 25-240 3-49 12-133 20-185s21-185 29-295c37-482 49-582 71-604 24-25 36 29 51 239 7 107 18 236 24 285 5 50 21 207 34 350 14 143 30 294 36 335s17 165 25 275c9 110 24 281 35 380s24 234 30 300 17 174 25 240c27 227 27 241 10 259-14 14-48 16-253 15-130 0-247-4-259-9" />
        <path d="M4840 4123c-25-2-112-12-195-23-82-10-204-24-270-30s-140-16-163-21c-24-5-148-18-275-29-284-24-313-29-328-46-17-21 25-33 171-51 186-22 200-32 200-143 0-27 7-81 15-121 8-41 19-128 25-194s19-187 30-270c10-82 26-238 35-345s24-262 35-345c10-82 24-204 30-270 7-66 14-123 16-126 4-7 19-162 39-404 8-99 20-210 26-246 18-101-7-139-101-154-25-4-52-11-61-16-9-4-65-17-125-28-157-30-326-71-341-83-35-29 10-31 691-23 768 8 726 3 726 75 0 58-30 243-42 257-18 22-2 25-419-77-180-43-233-48-267-24-26 18-28 38-8 85 8 19 17 86 20 149 6 106 11 155 36 385 5 44 18 166 29 270 12 105 30 262 40 350 11 88 23 194 26 235 24 311 97 906 115 940 20 37 50 40 170 19 130-22 263-25 277-6 6 6 13 71 17 142 9 184 11 183-174 168" />
        <path d="M5567 4122c-29-6-30-49-7-246 12-105 28-252 35-326 8-74 20-191 29-260 8-69 20-197 26-285 7-88 16-184 21-215 17-98 79-678 104-969 28-321 50-429 80-381 3 5 13 90 21 187 8 98 21 228 29 288 8 61 21 182 30 270 8 88 22 198 30 245s20 155 25 240c14 215 43 471 55 490 18 29 54 8 106-61 30-39 65-86 79-104 135-176 239-313 260-341 14-19 45-61 70-95s57-76 71-93 69-89 123-161c53-71 110-146 126-166 15-19 72-94 125-165 92-123 161-214 250-327 23-29 63-83 90-122 26-38 57-78 67-88s25-31 33-47c9-17 20-30 26-30 5 0 21-12 35-27 13-14 27-23 31-20 3 4-3 17-15 30s-22 29-22 37c0 12-61 147-97 215-33 63-87 171-244 490-90 182-170 341-179 355-10 14-23 43-30 65s-20 51-29 65c-18 26-190 370-215 430-8 19-22 46-30 60-21 35-211 421-219 445-25 74-296 581-320 599-27 20-40 21-291 21-144 0-270-1-279-3" />
        <path d="M9681 4078c-23-29-71-95-108-147-38-52-79-109-93-128-14-18-47-66-75-106-27-40-74-106-105-147-93-126-97-133-147-205-26-38-70-100-98-137-27-37-71-96-96-130-49-67-92-99-110-81-7 7-5 49 5 134 8 68 20 194 26 279s20 223 30 305c38 292 42 346 25 372l-15 23h-274c-336 0-313 12-296-152 6-62 17-158 25-213s19-170 25-255 20-225 31-310 27-220 34-300 20-192 29-250c8-58 22-195 31-305 8-110 22-245 30-300s26-194 39-310c13-115 29-223 35-239 21-52 40-13 52 100 5 54 17 153 25 219 33 268 44 366 54 500 25 324 61 414 120 298 9-16 34-56 55-87 22-32 52-77 66-100 15-23 43-65 62-92 20-27 48-69 62-94s41-65 59-90c19-25 58-82 88-127 195-302 247-379 301-450 15-20 27-42 27-49s11-25 24-41c13-15 58-80 101-143 77-115 99-140 121-140 16 0 63 39 194 160 180 167 230 218 230 233 0 8-24 35-52 59-95 82-182 153-248 203-36 27-88 70-116 95s-88 74-133 110c-107 85-213 170-375 303-72 59-166 135-209 170-176 141-257 211-257 221 1 26 21 43 245 205 61 43 178 130 262 193 84 62 178 131 209 153s111 81 178 130c66 50 150 111 186 136 63 45 136 102 173 134 9 8 17 23 17 33 0 28-380 412-408 412-14 0-35-18-61-52" />
        <path d="M1269 3818c-14-53-33-210-59-488-11-118-27-269-35-335s-24-210-35-320c-12-110-25-227-30-260s-16-143-25-245c-8-102-22-234-30-295-8-60-22-182-30-270-9-88-22-207-30-264-23-159-21-189 12-202 48-18 549-7 568 12 15 15 15 27 1 140-8 68-18 169-21 224-4 55-15 168-26 250-10 83-24 195-29 250-18 172-30 277-40 350-5 39-17 156-25 260-15 191-53 539-80 735-8 58-19 157-25 220-16 175-31 280-41 280-4 0-13-19-20-42" />
      </g>
      {/* "ART" */}
      <g transform="matrix(.1 0 0 -.1 0 498)" fill={inkColor}>
        <path d="M17630 4150c-129-4-536-13-905-19-843-15-780-13-780-31 0-21 118-58 225-71 47-6 137-21 200-35 63-13 162-30 220-39 119-17 151-34 162-86 15-77 39-279 49-422 5-84 21-228 34-322 13-93 27-224 30-290 4-66 13-160 20-210 14-96 28-230 45-440 6-71 17-177 25-235s22-195 30-305c18-227 22-255 40-255 19 0 43 145 61 370 8 107 24 260 35 340 29 207 28 200 39 362 5 81 17 192 25 245 8 54 21 184 30 288 8 105 26 291 40 415s27 256 31 293c7 84 29 112 77 103 18-3 68-10 112-17 44-6 122-22 173-36 52-13 127-27 167-30 99-8 100-7 113 222 12 196 8 216-36 213-15-1-133-5-262-8" />
        <path d="M14234 4126c-18-8-35-19-38-25-11-17-42-13-86 9-55 28-568 31-595 3-20-19-17-81 15-315 11-75 26-226 35-335s20-223 25-253 13-100 19-155c25-226 31-275 45-390 9-66 23-204 31-307s22-231 30-285 20-159 26-233c27-340 48-470 77-470 18 0 24 35 33 215 6 99 19 252 30 340 24 199 32 269 59 520 25 236 28 249 58 253 16 3 27-5 40-29 9-17 36-59 59-93 24-33 52-77 63-96 23-39 56-87 95-140 15-19 50-71 78-114 29-44 63-95 77-114s39-56 55-82c17-26 57-87 90-135s71-104 85-125c25-38 50-75 79-119 9-13 27-41 41-61 14-21 57-84 95-140 39-56 80-119 93-139 98-154 141-190 174-143 12 18 93 88 227 196 44 36 61 57 61 73 0 18-51 74-194 216-572 565-815 804-929 914-70 67-127 129-127 138 0 25 27 29 82 11 56-18 267-22 348-6 229 43 454 238 532 459 49 140 51 150 45 270-8 187-74 339-206 472-108 108-194 160-346 210-54 18-345 22-381 5m185-86c172-38 310-137 414-296 231-352 11-840-422-937-82-19-152-21-214-8-23 5-67 14-97 20-77 16-140 81-116 119 10 17 44 283 51 397 3 61 17 189 30 285 14 96 28 221 31 277 8 119 7 116 64 142 59 26 146 26 259 1" />
        <path d="M11421 4002c-5-10-14-47-21-82-6-36-17-85-25-110s-21-80-30-122-22-93-31-113c-8-20-21-73-30-118-8-45-24-109-34-142-11-33-24-91-31-130-6-38-20-91-30-117s-23-77-30-115c-6-37-18-86-26-108s-23-82-33-133c-30-150-58-182-163-182-49 0-58-3-55-16 4-21 19-29 90-49 68-18 78-37 48-95-12-23-28-80-36-128-9-47-22-101-29-119-8-18-22-77-31-131-9-53-24-117-34-142s-21-65-25-90-23-99-41-164c-19-66-34-130-34-143s-9-42-21-64c-21-43-22-100-1-107 7-2 19 12 27 35 9 21 20 45 25 53 6 8 20 35 31 60 67 143 89 190 159 335 43 88 97 201 121 250 23 50 50 101 59 115 10 14 23 43 30 65s21 51 31 64c11 13 19 28 19 33 0 26 36 80 61 93 37 19 52 19 102-4 23-10 89-27 147-36 58-10 132-25 165-35s94-24 135-30c41-7 86-17 99-22 14-5 72-18 130-29 168-31 201-53 201-133 0-22 9-88 20-146 12-57 27-163 35-235 8-71 19-146 25-165 12-43 36-200 45-295 3-38 11-75 17-82 14-18 72-16 109 2 16 9 55 20 87 26 31 6 93 21 137 34s106 29 137 35c116 23 131 65 70 193-16 34-33 78-37 97s-15 51-25 70c-10 20-26 62-35 95-10 33-21 65-26 70-8 11-56 136-86 225-8 25-26 70-39 101s-24 63-24 71-11 37-25 64-30 67-35 89c-6 22-21 65-35 95-13 30-30 75-38 100-22 67-66 180-87 225-10 22-21 56-25 75s-18 55-30 80-26 61-30 80-13 45-21 58c-8 12-28 60-43 105-44 126-77 215-111 302-18 44-56 149-85 233-28 84-61 165-73 181s-24 41-28 55c-3 14-13 26-21 26-9 0-12-6-9-17 6-18 14-71 40-243 8-52 23-140 35-195 11-55 23-136 26-180 4-44 16-122 26-172 10-51 26-155 34-230 9-76 25-180 35-232 22-106 15-140-30-151-48-12-737-12-759 0-32 17-26 52 29 150 28 50 50 93 50 97 0 5 40 89 89 188s110 223 135 275 53 106 60 120c8 14 31 61 51 105s43 91 51 105 22 41 30 60c9 19 29 61 45 92 36 71 36 86 2 99-16 6-46 19-68 30-40 18-193 75-270 99-22 7-62 24-90 36-61 29-110 31-124 6" />
      </g>
    </svg>
  );
}
