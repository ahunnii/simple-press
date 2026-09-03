/**
 * Bamboo "Illustrated & Alive" illustration sprite.
 *
 * Ported verbatim (paths/transforms unchanged) from the client-approved
 * mockup's inline `<defs>` block — see
 * `docs/templates/bamboo/build/mockup-refs/mockup-b.elided.html` (lines
 * ~468-703) for the 16 base symbols + 4 primitives, and
 * `mockup-b-about.elided.html` (lines ~828-875) for the 3 "nationwide" glyphs
 * (`s-truck` / `s-shops` / `s-shield`) that only exist there.
 *
 * Every literal fill/stroke hex from the mockup has been swapped for a
 * `var(--bamboo-ill-*)` illustration token (or a reused brand token where the
 * mockup's color happened to already equal one — white/roll, the 2.6px
 * outline, cream, ink, core-tan) — see the `.bamboo` token block in
 * `src/styles/globals.css`. Each symbol keeps its own authored viewBox
 * EXACTLY as-is, negative origins included: those origins are correct ON the
 * symbol and must never be "fixed" — see `bamboo-glyph.tsx` for why a `<use>`
 * wrapper must NOT reuse a symbol's own viewBox.
 *
 * Render this ONCE per page, in `bamboo-general-layout.tsx`. Every other
 * component consumes a symbol through `<BambooGlyph id="..." />` — never
 * reference `#s-*` / `#leafP` / `#badgeMark` / `#wreathRing` / `#wreathMark`
 * directly outside this file and `bamboo-glyph.tsx`.
 */
export function BambooSprite() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* ── Shared primitives ── */}
        <path id="leafP" d="M0,0 C 20,-16 62,-20 96,-5 C 63,12 20,13 0,0 Z" />
        <g id="badgeMark">
          <circle r="33" fill="var(--bamboo-ill-badge)" />
          <g
            stroke="var(--bamboo-cream)"
            strokeWidth={4.5}
            strokeLinecap="round"
            fill="none"
          >
            <path d="M 0,18 L 0,-14" />
            <path d="M 0,0 L 0,-2" />
          </g>
          <path
            d="M 0,-4 C 6,-14 16,-18 24,-17 C 19,-8 10,-3 0,-4 Z"
            fill="var(--bamboo-cream)"
          />
          <path
            d="M 0,-10 C -6,-20 -16,-24 -24,-23 C -19,-14 -10,-9 0,-10 Z"
            fill="var(--bamboo-cream)"
          />
        </g>

        {/* Her mark, simplified: a wreath ring of alternating green + tan
            bamboo culm segments, leaf sprig breaking the ring top-left, cream
            centre. Drawn once as a <g> so it can be reused inside other
            symbols (a nested <use href="#symbol"> would resolve its
            100%/100% default against the wrong viewport). Bounds: x -74..44,
            y -60..44 */}
        <g id="wreathRing">
          <circle r="30" fill="var(--bamboo-ill-wreath-base)" />
          <g transform="rotate(-104)">
            <circle
              r="38"
              fill="none"
              stroke="var(--bamboo-ill-leaf-dark)"
              strokeWidth={9}
              strokeDasharray="21 26.75"
            />
            <circle
              r="38"
              fill="none"
              stroke="var(--bamboo-ill-culm)"
              strokeWidth={9}
              strokeDasharray="21 26.75"
              strokeDashoffset="-23.88"
            />
          </g>
          <path
            d="M -29,-25 C -36,-33 -42,-38 -48,-42"
            fill="none"
            stroke="var(--bamboo-ill-leaf-mid)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-dark)"
            transform="translate(-47,-44) rotate(207) scale(0.27)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-mid)"
            transform="translate(-45,-38) rotate(161) scale(0.25)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-light)"
            transform="translate(-35,-32) rotate(251) scale(0.22)"
          />
        </g>
        <g id="wreathMark">
          <use href="#wreathRing" />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-dark)"
            transform="translate(-1,3) rotate(-33) scale(0.2)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-mid)"
            transform="translate(-3,9) rotate(213) scale(0.18)"
          />
        </g>

        {/* ── Leaves ── */}
        <symbol id="s-leaf" viewBox="-3 -22 102 37">
          <use href="#leafP" fill="var(--bamboo-ill-leaf-mid)" />
        </symbol>
        <symbol id="s-leaf-d" viewBox="-3 -22 102 37">
          <use href="#leafP" fill="var(--bamboo-ill-leaf-dark)" />
        </symbol>
        <symbol id="s-leaf-l" viewBox="-3 -22 102 37">
          <use href="#leafP" fill="var(--bamboo-ill-leaf-light)" />
        </symbol>

        {/* Sprout badge — demoted to a decorative/secondary glyph; the wreath
            (`s-wreath`) carries every brand role (Andrew's decision,
            2026-08-31 — see docs/templates/bamboo/design.md "Decisions log"). */}
        <symbol id="s-badge" viewBox="-36 -36 72 72">
          <use href="#badgeMark" />
        </symbol>

        <symbol id="s-wreath" viewBox="-80 -64 130 116">
          <use href="#wreathMark" />
        </symbol>

        {/* viewBoxes below are sized to the painted bounds (incl. stroke), so
            no wrapper ever slices the top ellipse, a pot leaf, or a sprig tip */}
        <symbol id="s-roll-front" viewBox="-100 -82 200 192">
          <path
            d="M -75,-58 L -75,88 Q -75,106 -57,106 L 57,106 Q 75,106 75,88 L 75,-58 Z"
            fill="var(--bamboo-roll)"
            stroke="var(--bamboo-outline)"
            strokeWidth={2.6}
          />
          <path
            d="M -42,-52 C -46,0 -46,50 -42,100"
            fill="none"
            stroke="var(--bamboo-ill-roll-shade)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <path
            d="M 44,-52 C 48,0 48,50 44,100"
            fill="none"
            stroke="var(--bamboo-ill-roll-shade)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <ellipse
            cy="-58"
            rx="75"
            ry="21"
            fill="var(--bamboo-ill-wreath-base)"
            stroke="var(--bamboo-outline)"
            strokeWidth={2.6}
          />
          <ellipse cy="-58" rx="25" ry="8" fill="var(--bamboo-ill-tube-deep)" />
          <ellipse
            cy="-60"
            rx="25"
            ry="8"
            fill="none"
            stroke="var(--bamboo-ill-tube)"
            strokeWidth={4}
          />
          <use href="#wreathMark" transform="translate(6,34) scale(0.8)" />
        </symbol>

        <symbol id="s-roll-tall" viewBox="-100 -85 200 255">
          <path
            d="M -75,-58 L -75,134 Q -75,152 -57,152 L 57,152 Q 75,152 75,134 L 75,-58 Z"
            fill="var(--bamboo-roll)"
            stroke="var(--bamboo-outline)"
            strokeWidth={2.6}
          />
          <path
            d="M -42,-52 C -46,10 -46,90 -42,146"
            fill="none"
            stroke="var(--bamboo-ill-roll-shade)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <path
            d="M 44,-52 C 48,10 48,90 44,146"
            fill="none"
            stroke="var(--bamboo-ill-roll-shade)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <ellipse
            cy="-58"
            rx="75"
            ry="21"
            fill="var(--bamboo-ill-wreath-base)"
            stroke="var(--bamboo-outline)"
            strokeWidth={2.6}
          />
          <ellipse cy="-58" rx="25" ry="8" fill="var(--bamboo-ill-tube-deep)" />
          <ellipse
            cy="-60"
            rx="25"
            ry="8"
            fill="none"
            stroke="var(--bamboo-ill-tube)"
            strokeWidth={4}
          />
          <use href="#wreathMark" transform="translate(6,52) scale(0.78)" />
        </symbol>

        <symbol id="s-roll-top" viewBox="-100 -100 200 200">
          <circle
            r="90"
            fill="var(--bamboo-roll)"
            stroke="var(--bamboo-outline)"
            strokeWidth={2.8}
          />
          <path
            d="M -86,-10 A 87,87 0 0 1 10,-86"
            fill="none"
            stroke="var(--bamboo-ill-roll-shade)"
            strokeWidth={5}
            strokeLinecap="round"
          />
          <path
            d="M -70,28 A 75,75 0 0 1 -40,-63"
            fill="none"
            stroke="var(--bamboo-ill-roll-shade)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <path
            d="M 30,52 A 60,60 0 0 0 58,-16"
            fill="none"
            stroke="var(--bamboo-ill-roll-shade)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle r="31" fill="var(--bamboo-ill-tube)" />
          <circle r="23" fill="var(--bamboo-ill-tube-deep)" />
          <path
            d="M -14,-17 A 22,22 0 0 1 17,-13"
            fill="none"
            stroke="var(--bamboo-ill-tube-shadow)"
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.5}
          />
        </symbol>

        {/* Her 4-pack, simplified: shrink-wrapped white brick with two soft
            roll humps, script-suggesting squiggle, the wreath mark, a green
            wave band carrying the claim lines, and the gold NEW chip. Flat
            scene palette only. */}
        <symbol id="s-pack" viewBox="0 0 330 320">
          {/* two roll humps first, so the pack's own top edge crosses in
              front of them */}
          <path
            d="M 36,100 C 36,74 58,58 101,58 C 144,58 166,74 166,100 Z"
            fill="var(--bamboo-ill-wreath-base)"
            stroke="var(--bamboo-outline)"
            strokeWidth={2.6}
            strokeLinejoin="round"
          />
          <path
            d="M 168,100 C 168,74 190,58 233,58 C 276,58 298,74 298,100 Z"
            fill="var(--bamboo-ill-wreath-base)"
            stroke="var(--bamboo-outline)"
            strokeWidth={2.6}
            strokeLinejoin="round"
          />
          <path
            d="M 22,112 Q 22,96 38,96 L 292,96 Q 308,96 308,112 L 308,284 Q 308,306 286,306 L 44,306 Q 22,306 22,284 Z"
            fill="var(--bamboo-roll)"
            stroke="var(--bamboo-outline)"
            strokeWidth={2.8}
            strokeLinejoin="round"
          />
          {/* shrink-wrap gather where the two roll pairs meet */}
          <path
            d="M 167,100 C 165,110 166,118 167,126"
            fill="none"
            stroke="var(--bamboo-ill-wrap-sheen)"
            strokeWidth={3.2}
            strokeLinecap="round"
          />
          {/* wrap sheen */}
          <path
            d="M 46,132 C 55,176 57,226 48,282"
            fill="none"
            stroke="var(--bamboo-ill-wrap-sheen)"
            strokeWidth={9}
            strokeLinecap="round"
          />
          <path
            d="M 290,138 C 297,180 297,228 290,278"
            fill="none"
            stroke="var(--bamboo-ill-wrap-sheen)"
            strokeWidth={7}
            strokeLinecap="round"
          />
          {/* script wordmark: suggested handwriting, never legible */}
          <path
            d="M 46,150 C 52,132 60,120 66,120 C 72,120 70,132 64,142 C 58,152 54,154 58,146
               C 64,136 72,140 77,146 C 82,152 88,148 90,142
               C 92,136 98,134 101,140 C 104,146 101,152 106,150
               C 111,148 111,138 116,136 C 121,134 121,146 126,148 C 131,150 134,142 139,140
               C 145,124 153,116 159,118 C 165,120 162,132 156,142 C 150,152 147,154 150,146
               C 155,136 163,140 168,146 C 173,152 178,148 182,142"
            fill="none"
            stroke="var(--bamboo-ink)"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* gold NEW chip */}
          <rect
            x="218"
            y="114"
            width="78"
            height="36"
            rx="15"
            fill="var(--bamboo-ill-culm)"
          />
          <text
            x="257"
            y="140"
            textAnchor="middle"
            fontWeight="700"
            fontSize="21"
            letterSpacing="1"
            fill="var(--bamboo-ink)"
            style={{
              fontFamily:
                'var(--font-bamboo-display), "Bricolage Grotesque", sans-serif',
            }}
          >
            NEW
          </text>
          {/* her wreath mark */}
          <use href="#wreathRing" transform="translate(162,214)" />
          <text
            x="162"
            y="220"
            textAnchor="middle"
            fontWeight="600"
            fontSize="14"
            letterSpacing="1.3"
            fill="var(--bamboo-ink)"
            style={{
              fontFamily:
                'var(--font-bamboo-display), "Bricolage Grotesque", sans-serif',
            }}
          >
            BAMBOO
          </text>
          {/* green wave band + claim lines */}
          <path
            d="M 22,262 C 74,236 122,272 176,262 C 232,251 268,224 308,240 L 308,284 Q 308,306 286,306 L 44,306 Q 22,306 22,284 Z"
            fill="var(--bamboo-ill-leaf-dark)"
          />
          <g fill="var(--bamboo-roll)" opacity={0.92}>
            <rect x="96" y="272" width="142" height="5.4" rx="2.7" />
            <rect x="78" y="284" width="178" height="5.4" rx="2.7" />
            <rect x="114" y="296" width="106" height="5.4" rx="2.7" />
          </g>
        </symbol>

        {/* Culms: one continuous rounded shaft with node bands painted over
            it, so a stalk can never show a gap or a mid-air break between
            segments. */}
        <symbol id="s-culm-tan" viewBox="-80 -325 190 540">
          <rect
            x="-15"
            y="-222"
            width="30"
            height="428"
            rx="15"
            fill="var(--bamboo-ill-culm)"
          />
          <g fill="var(--bamboo-ill-culm-deep)">
            <rect x="-18" y="-123" width="36" height="13" rx="6.5" />
            <rect x="-18" y="-15" width="36" height="13" rx="6.5" />
            <rect x="-18" y="93" width="36" height="13" rx="6.5" />
          </g>
          <g
            stroke="var(--bamboo-ill-culm-hi)"
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.9}
          >
            <line x1="-6" y1="-206" x2="-6" y2="-134" />
            <line x1="-6" y1="-98" x2="-6" y2="-26" />
            <line x1="-6" y1="10" x2="-6" y2="82" />
            <line x1="-6" y1="118" x2="-6" y2="190" />
          </g>
          <path
            d="M 0,-214 C 8,-240 20,-260 34,-272"
            fill="none"
            stroke="var(--bamboo-ill-leaf-mid)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-dark)"
            transform="translate(30,-272) rotate(-34) scale(0.72)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-mid)"
            transform="translate(32,-266) rotate(16) scale(0.68)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-light)"
            transform="translate(20,-252) rotate(62) scale(0.58)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-mid)"
            transform="translate(-4,-248) rotate(196) scale(0.6)"
          />
        </symbol>

        <symbol id="s-culm-green" viewBox="-66 -252 158 412">
          <rect
            x="-12"
            y="-167"
            width="24"
            height="320"
            rx="12"
            fill="var(--bamboo-ill-moss)"
          />
          <g fill="var(--bamboo-ill-stem)">
            <rect x="-15" y="-67" width="30" height="12" rx="6" />
            <rect x="-15" y="41" width="30" height="12" rx="6" />
          </g>
          <g
            stroke="var(--bamboo-ill-leaf-pale)"
            strokeWidth={3.5}
            strokeLinecap="round"
            opacity={0.9}
          >
            <line x1="-4" y1="-152" x2="-4" y2="-80" />
            <line x1="-4" y1="-44" x2="-4" y2="28" />
            <line x1="-4" y1="64" x2="-4" y2="136" />
          </g>
          <path
            d="M 0,-160 C 8,-182 18,-198 30,-208"
            fill="none"
            stroke="var(--bamboo-ill-stem)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-dark)"
            transform="translate(27,-208) rotate(-32) scale(0.6)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-mid)"
            transform="translate(29,-202) rotate(18) scale(0.56)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-light)"
            transform="translate(16,-190) rotate(66) scale(0.5)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-mid)"
            transform="translate(-6,-188) rotate(200) scale(0.5)"
          />
        </symbol>

        {/* A "run" culm: no crown, artwork bleeds past the top and bottom of
            the viewBox so the plant is only ever cropped by the section
            edge. */}
        <symbol id="s-culm-run" viewBox="-54 0 148 1200">
          <rect
            x="-17"
            y="-60"
            width="34"
            height="1320"
            fill="var(--bamboo-ill-culm)"
          />
          <g fill="var(--bamboo-ill-culm-deep)">
            <rect x="-20" y="144" width="40" height="14" rx="7" />
            <rect x="-20" y="364" width="40" height="14" rx="7" />
            <rect x="-20" y="584" width="40" height="14" rx="7" />
            <rect x="-20" y="804" width="40" height="14" rx="7" />
            <rect x="-20" y="1024" width="40" height="14" rx="7" />
          </g>
          <g
            stroke="var(--bamboo-ill-culm-hi)"
            strokeWidth={4.5}
            strokeLinecap="round"
            opacity={0.9}
          >
            <line x1="-7" y1="-20" x2="-7" y2="124" />
            <line x1="-7" y1="178" x2="-7" y2="344" />
            <line x1="-7" y1="398" x2="-7" y2="564" />
            <line x1="-7" y1="618" x2="-7" y2="784" />
            <line x1="-7" y1="838" x2="-7" y2="1004" />
            <line x1="-7" y1="1058" x2="-7" y2="1224" />
          </g>
          <g>
            <path
              d="M 15,536 C 28,522 40,514 52,510"
              fill="none"
              stroke="var(--bamboo-ill-leaf-mid)"
              strokeWidth={4.5}
              strokeLinecap="round"
            />
            <use
              href="#leafP"
              fill="var(--bamboo-ill-leaf-dark)"
              transform="translate(50,508) rotate(-20) scale(0.26)"
            />
            <use
              href="#leafP"
              fill="var(--bamboo-ill-leaf-mid)"
              transform="translate(48,514) rotate(28) scale(0.24)"
            />
            <use
              href="#leafP"
              fill="var(--bamboo-ill-leaf-light)"
              transform="translate(36,522) rotate(70) scale(0.2)"
            />
          </g>
          <g>
            <path
              d="M 15,848 C 28,834 40,826 52,822"
              fill="none"
              stroke="var(--bamboo-ill-stem)"
              strokeWidth={4}
              strokeLinecap="round"
            />
            <use
              href="#leafP"
              fill="var(--bamboo-ill-leaf-mid)"
              transform="translate(50,820) rotate(-22) scale(0.24)"
            />
            <use
              href="#leafP"
              fill="var(--bamboo-ill-leaf-dark)"
              transform="translate(48,826) rotate(26) scale(0.22)"
            />
          </g>
        </symbol>

        <symbol id="s-pot" viewBox="-72 -138 150 208">
          <path
            d="M -40,0 L -30,58 Q -28,66 -20,66 L 20,66 Q 28,66 30,58 L 40,0 Z"
            fill="var(--bamboo-ill-pot)"
          />
          <rect
            x="-46"
            y="-14"
            width="92"
            height="18"
            rx="8"
            fill="var(--bamboo-ill-pot-deep)"
          />
          <ellipse cy="-12" rx="38" ry="7" fill="var(--bamboo-ill-soil)" />
          <g
            stroke="var(--bamboo-ill-stem)"
            strokeWidth={7}
            strokeLinecap="round"
          >
            <line x1="-14" y1="-14" x2="-22" y2="-78" />
            <line x1="2" y1="-14" x2="4" y2="-92" />
            <line x1="17" y1="-14" x2="26" y2="-70" />
          </g>
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-mid)"
            transform="translate(-24,-84) rotate(-150) scale(0.5)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-dark)"
            transform="translate(4,-96) rotate(-30) scale(0.55)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-light)"
            transform="translate(27,-76) rotate(-8) scale(0.5)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-mid)"
            transform="translate(5,-94) rotate(-115) scale(0.45)"
          />
        </symbol>

        <symbol id="s-pot-succ" viewBox="-52 -62 104 124">
          <path
            d="M -36,0 L -27,50 Q -25,58 -18,58 L 18,58 Q 25,58 27,50 L 36,0 Z"
            fill="var(--bamboo-ill-pot)"
          />
          <rect
            x="-42"
            y="-13"
            width="84"
            height="16"
            rx="8"
            fill="var(--bamboo-ill-pot-deep)"
          />
          <g fill="var(--bamboo-ill-leaf-mid)">
            <path d="M 0,-8 C -10,-24 -12,-44 -3,-58 C 5,-44 8,-24 0,-8 Z" />
            <path
              d="M 0,-8 C -22,-16 -34,-30 -36,-46 C -20,-40 -8,-26 0,-8 Z"
              fill="var(--bamboo-ill-leaf-dark)"
            />
            <path
              d="M 0,-8 C 22,-16 34,-30 36,-46 C 20,-40 8,-26 0,-8 Z"
              fill="var(--bamboo-ill-leaf-dark)"
            />
            <path
              d="M 0,-8 C -30,-8 -42,-16 -48,-26 C -32,-28 -14,-20 0,-8 Z"
              fill="var(--bamboo-ill-leaf-light)"
            />
            <path
              d="M 0,-8 C 30,-8 42,-16 48,-26 C 32,-28 14,-20 0,-8 Z"
              fill="var(--bamboo-ill-leaf-light)"
            />
          </g>
        </symbol>

        <symbol id="s-sprig" viewBox="-46 -108 172 136">
          <path
            d="M 0,0 C 12,-22 28,-38 46,-46"
            fill="none"
            stroke="var(--bamboo-ill-leaf-mid)"
            strokeWidth={4.5}
            strokeLinecap="round"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-dark)"
            transform="translate(44,-48) rotate(-36) scale(0.82)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-mid)"
            transform="translate(46,-42) rotate(12) scale(0.78)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-light)"
            transform="translate(32,-30) rotate(58) scale(0.62)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-mid)"
            transform="translate(12,-26) rotate(206) scale(0.58)"
          />
        </symbol>

        <symbol id="s-tissue-box" viewBox="0 0 210 168">
          <path
            d="M 14,52 L 196,52 L 188,158 Q 187,166 179,166 L 31,166 Q 23,166 22,158 Z"
            fill="var(--bamboo-roll)"
            stroke="var(--bamboo-outline)"
            strokeWidth={2.6}
            strokeLinejoin="round"
          />
          <path
            d="M 20,80 L 191,80 L 188,110 L 23,110 Z"
            fill="var(--bamboo-ill-leaf-dark)"
          />
          <g fill="var(--bamboo-roll)" opacity={0.9}>
            <rect x="62" y="88" width="88" height="4.6" rx="2.3" />
            <rect x="76" y="98" width="60" height="4.6" rx="2.3" />
          </g>
          <use href="#wreathMark" transform="translate(106,138) scale(0.4)" />
          <path
            d="M 14,52 Q 14,40 28,38 L 182,38 Q 196,40 196,52 Z"
            fill="var(--bamboo-ill-roll-shade)"
            stroke="var(--bamboo-outline)"
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          <ellipse
            cx="105"
            cy="45"
            rx="33"
            ry="7"
            fill="var(--bamboo-ill-tube-deep)"
          />
          <path
            d="M 88,46 Q 99,12 107,28 Q 115,8 123,46 Z"
            fill="var(--bamboo-ill-wreath-base)"
          />
          <path
            d="M 96,46 Q 105,22 113,46 Z"
            fill="var(--bamboo-ill-roll-shade)"
          />
        </symbol>

        {/* ── About-page "Nationwide" glyphs (mockup-b-about only) ── */}

        {/* Nationwide Shipping: box truck in her own livery (green wave band
            + wreath on the cargo side), moving right. */}
        <symbol id="s-truck" viewBox="0 0 120 120">
          <path
            d="M6,107 H114"
            fill="none"
            stroke="var(--bamboo-core-tan)"
            strokeWidth={6}
            strokeLinecap="round"
            opacity={0.36}
          />
          <g
            fill="none"
            stroke="var(--bamboo-ill-leaf-pale)"
            strokeWidth={5}
            strokeLinecap="round"
          >
            <path d="M2,50 H15" />
            <path d="M0,66 H10" />
          </g>
          {/* cab */}
          <path
            d="M78,50 L96,50 Q101,50 104,55 L112,70 Q115,74 115,79 Q115,84 110,84 L78,84 Z"
            fill="var(--bamboo-ill-culm)"
          />
          <path
            d="M89,56 H97 Q99,56 100,58 L105,68 H89 Z"
            fill="var(--bamboo-ill-leaf-pale)"
          />
          <rect
            x="105"
            y="74"
            width="10"
            height="7"
            rx="3.5"
            fill="var(--bamboo-ill-culm-deep)"
          />
          {/* cargo box */}
          <rect
            x="8"
            y="42"
            width="68"
            height="42"
            rx="7"
            fill="var(--bamboo-roll)"
            stroke="var(--bamboo-outline)"
            strokeWidth={2.6}
          />
          <path
            d="M9.3,68 C 22,62 38,74 52,68 C 62,63.6 70,64.6 74.7,67 L74.7,77 Q74.7,82.7 69,82.7 L15,82.7 Q9.3,82.7 9.3,77 Z"
            fill="var(--bamboo-ill-leaf-dark)"
          />
          <use href="#wreathMark" transform="translate(42,56) scale(0.215)" />
          {/* wheels, in front of everything */}
          <g>
            <circle cx="30" cy="92" r="12" fill="var(--bamboo-ill-soil)" />
            <circle cx="30" cy="92" r="5" fill="var(--bamboo-ill-culm-deep)" />
            <circle cx="94" cy="92" r="12" fill="var(--bamboo-ill-soil)" />
            <circle cx="94" cy="92" r="5" fill="var(--bamboo-ill-culm-deep)" />
          </g>
        </symbol>

        {/* Homes & Businesses: a house and a shopfront sharing one ground line. */}
        <symbol id="s-shops" viewBox="0 0 120 120">
          <path
            d="M6,106 H114"
            fill="none"
            stroke="var(--bamboo-core-tan)"
            strokeWidth={6}
            strokeLinecap="round"
            opacity={0.36}
          />
          <rect
            x="58"
            y="30"
            width="50"
            height="72"
            rx="4"
            fill="var(--bamboo-ill-leaf-dark)"
          />
          <g fill="var(--bamboo-ill-leaf-pale)">
            <rect x="66" y="40" width="13" height="15" rx="2.5" />
            <rect x="87" y="40" width="13" height="15" rx="2.5" />
            <rect x="66" y="60" width="13" height="15" rx="2.5" />
            <rect x="87" y="60" width="13" height="15" rx="2.5" />
          </g>
          <path d="M56,80 H114 L108,92 H60 Z" fill="var(--bamboo-ill-culm)" />
          <g
            stroke="var(--bamboo-ill-culm-deep)"
            strokeWidth={3}
            strokeLinecap="round"
          >
            <path d="M71,81 L68,91" />
            <path d="M85,81 L83,91" />
            <path d="M99,81 L98,91" />
          </g>
          <rect
            x="74"
            y="92"
            width="18"
            height="10"
            rx="2"
            fill="var(--bamboo-ill-stem)"
          />
          <path d="M4,66 L30,44 L56,66 Z" fill="var(--bamboo-ill-culm)" />
          <rect
            x="10"
            y="64"
            width="40"
            height="38"
            rx="3"
            fill="var(--bamboo-roll)"
            stroke="var(--bamboo-outline)"
            strokeWidth={2.6}
          />
          <rect
            x="16"
            y="72"
            width="13"
            height="13"
            rx="2"
            fill="var(--bamboo-ill-leaf-pale)"
          />
          <rect
            x="35"
            y="74"
            width="12"
            height="28"
            rx="2"
            fill="var(--bamboo-ill-stem)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-mid)"
            transform="translate(92,103) rotate(-9) scale(0.24)"
          />
        </symbol>

        {/* Customer-First Service: her badge mark held inside a shield. */}
        <symbol id="s-shield" viewBox="0 0 120 120">
          <path
            d="M60,8 C 72,18 88,23 101,24 C 103,52 99,80 84,95 C 75,104 67,110 60,113 C 53,110 45,104 36,95 C 21,80 17,52 19,24 C 32,23 48,18 60,8 Z"
            fill="var(--bamboo-ill-stem)"
          />
          <path
            d="M60,19 C 70,27 84,31 94,32 C 95,55 92,77 79,89 C 72,96 65,101 60,103 C 55,101 48,96 41,89 C 28,77 25,55 26,32 C 36,31 50,27 60,19 Z"
            fill="none"
            stroke="var(--bamboo-ill-leaf-pale)"
            strokeWidth={3.4}
          />
          <use href="#badgeMark" transform="translate(60,58) scale(0.82)" />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-mid)"
            transform="translate(2,109) rotate(-8) scale(0.3)"
          />
          <use
            href="#leafP"
            fill="var(--bamboo-ill-leaf-dark)"
            transform="translate(118,105) rotate(187) scale(0.26)"
          />
        </symbol>
      </defs>
    </svg>
  );
}
