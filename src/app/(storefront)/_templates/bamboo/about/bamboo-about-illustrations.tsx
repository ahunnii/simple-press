/**
 * About-page-local illustration vignettes, ported from
 * `docs/templates/bamboo/build/mockup-refs/mockup-b-about.elided.html`.
 *
 * Both compose sprite symbols (rendered once, globally, by `<BambooSprite />`
 * in `bamboo-general-layout.tsx`) via raw `<use href="#s-...">` references —
 * NOT `<BambooGlyph>`, because that component wraps a single symbol in its
 * own sized `<svg>`; these vignettes need several `<use>` elements freely
 * positioned (x/y/width/height) inside one shared parent viewBox, exactly
 * like the mockup's own markup. Any brand-new shapes drawn directly here
 * (skyline rects, ground washes, contact shadows, the sun disc) use
 * `var(--bamboo-ill-*)` / `var(--bamboo-*)` tokens for every fill — never a
 * literal hex — per the css-and-fonts.md "no raw colors in components" rule.
 */

/** Hero: "the ENLARGED Detroit skyline vignette" (about.hero, design.md item 1). */
export function DetroitSkylineVignette() {
  return (
    <svg
      viewBox="0 0 620 360"
      role="img"
      aria-label="Illustration of the Detroit skyline behind a potted bamboo plant and paper rolls"
      className="block h-auto w-full"
    >
      <circle cx="496" cy="82" r="58" fill="var(--bamboo-sage-deep)" />
      <use
        href="#leafP"
        fill="var(--bamboo-sage-deep)"
        transform="translate(46,74) rotate(-14) scale(0.6)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-sage-deep)"
        transform="translate(178,44) rotate(8) scale(0.46)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-sage-deep)"
        transform="translate(26,168) rotate(6) scale(0.5)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-sage-deep)"
        transform="translate(126,116) rotate(-22) scale(0.4)"
      />
      <g fill="var(--bamboo-pine)">
        <rect x="30" y="166" width="52" height="98" />
        <rect x="92" y="138" width="40" height="126" />
        <rect x="142" y="186" width="60" height="78" />
        <rect x="214" y="120" width="50" height="144" />
        <rect x="232" y="82" width="9" height="40" />
        <rect x="274" y="160" width="44" height="104" />
        <rect x="328" y="136" width="56" height="128" />
        <rect x="344" y="118" width="24" height="20" />
        <rect x="394" y="180" width="46" height="84" />
        <rect x="450" y="148" width="54" height="116" />
        <rect x="514" y="172" width="58" height="92" />
      </g>
      <g fill="var(--bamboo-sage-deep)" opacity=".55">
        <rect x="101" y="156" width="9" height="14" />
        <rect x="116" y="156" width="9" height="14" />
        <rect x="101" y="182" width="9" height="14" />
        <rect x="116" y="182" width="9" height="14" />
        <rect x="226" y="138" width="10" height="16" />
        <rect x="243" y="138" width="10" height="16" />
        <rect x="226" y="168" width="10" height="16" />
        <rect x="243" y="168" width="10" height="16" />
        <rect x="340" y="154" width="10" height="16" />
        <rect x="359" y="154" width="10" height="16" />
        <rect x="461" y="168" width="10" height="16" />
        <rect x="480" y="168" width="10" height="16" />
      </g>
      {/* ground: a soft wave, so the band never reads as a ruled line */}
      <path
        d="M0,246 C 104,232 208,258 312,246 C 412,235 520,258 620,244 L620,360 L0,360 Z"
        fill="var(--bamboo-sage-deep)"
      />
      {/* contact shadows first, then the objects, each with clear air */}
      <ellipse
        cx="78"
        cy="346"
        rx="54"
        ry="10"
        fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .15)"
      />
      <ellipse
        cx="196"
        cy="345"
        rx="32"
        ry="7"
        fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .12)"
      />
      <ellipse
        cx="288"
        cy="350"
        rx="36"
        ry="8"
        fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .14)"
      />
      <ellipse
        cx="408"
        cy="341"
        rx="52"
        ry="10"
        fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .16)"
      />
      <use href="#s-pot" x="22" y="192" width="114" height="158" />
      <use href="#s-pot-succ" x="166" y="276" width="62" height="74" />
      <use href="#s-roll-top" x="252" y="284" width="70" height="70" />
      <use href="#s-roll-front" x="352" y="236" width="112" height="108" />
      <use href="#s-sprig" x="498" y="288" width="78" height="62" />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-mid)"
        transform="translate(140,350) rotate(-10) scale(0.3)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-dark)"
        transform="translate(494,352) rotate(190) scale(0.28)"
      />
    </svg>
  );
}

/**
 * Fallback for `about.mission-image` when the owner has left it unset (the
 * field's own default is the raw `/placeholder.svg`, which used to render
 * as an ugly grey frame inside the photo-card). Composed the same way as
 * `shared/bamboo-product-card.tsx`'s `BambooProductArt`: one wrapper
 * `<svg>` with a POSITIVE viewBox, sprite fragments placed via `<use>`
 * x/y/width/height, and ground-shadow ellipses so nothing floats — a warm
 * pot + rolls vignette rather than a bare grey box (about.mission,
 * design.md item 2).
 */
export function MissionPhotoFallback() {
  return (
    <svg
      viewBox="0 0 400 400"
      role="img"
      aria-label="Illustration of a potted bamboo plant beside a roll and a sprig"
      className="block h-auto w-full"
    >
      <rect width="400" height="400" fill="var(--bamboo-sage)" />
      <path
        d="M0,300 C70,286 150,312 230,300 C300,290 350,308 400,298 L400,400 L0,400 Z"
        fill="var(--bamboo-sage-deep)"
      />
      <ellipse
        cx="140"
        cy="366"
        rx="82"
        ry="14"
        fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .16)"
      />
      <ellipse
        cx="292"
        cy="356"
        rx="54"
        ry="11"
        fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .14)"
      />
      <use href="#s-pot" x="46" y="150" width="176" height="244" />
      <use href="#s-roll-front" x="246" y="222" width="128" height="122" />
      <use href="#s-sprig" x="118" y="96" width="96" height="76" />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-mid)"
        transform="translate(40,372) rotate(-10) scale(0.34)"
      />
    </svg>
  );
}

/** Values band: "one large illustrated vignette (pot + rolls)" (about.values, design.md item 4). */
export function ValuesGroveVignette() {
  return (
    <svg
      viewBox="0 0 620 440"
      role="img"
      aria-label="Illustration of a bamboo grove behind a potted plant, a four-pack of bamboo tissue and two rolls sharing one ground line"
      className="block h-auto w-full"
    >
      <circle cx="330" cy="104" r="70" fill="var(--bamboo-sage-deep)" />
      <use
        href="#leafP"
        fill="var(--bamboo-sage-deep)"
        transform="translate(36,168) rotate(-14) scale(0.62)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-sage-deep)"
        transform="translate(430,66) rotate(9) scale(0.5)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-sage-deep)"
        transform="translate(590,206) rotate(168) scale(0.44)"
      />
      {/* the grove standing behind the ground plane, so the sky is never empty */}
      <use href="#s-culm-tan" x="0" y="8" width="132" height="375" />
      <use href="#s-culm-green" x="104" y="52" width="110" height="287" />
      <use href="#s-culm-green" x="452" y="34" width="118" height="308" />
      <use href="#s-culm-tan" x="498" y="6" width="126" height="358" />
      <path
        d="M0,296 C 118,282 236,308 356,296 C 462,285 552,306 620,294 L620,440 L0,440 Z"
        fill="var(--bamboo-sage-deep)"
      />
      <ellipse
        cx="104"
        cy="416"
        rx="60"
        ry="12"
        fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .15)"
      />
      <ellipse
        cx="216"
        cy="420"
        rx="40"
        ry="9"
        fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .13)"
      />
      <ellipse
        cx="364"
        cy="410"
        rx="94"
        ry="14"
        fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .16)"
      />
      <ellipse
        cx="534"
        cy="416"
        rx="52"
        ry="10"
        fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .14)"
      />
      <use href="#s-pot" x="34" y="204" width="152" height="211" />
      <use href="#s-roll-top" x="182" y="352" width="70" height="70" />
      <use href="#s-pack" x="264" y="216" width="202" height="196" />
      <use href="#s-roll-front" x="472" y="292" width="122" height="117" />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-mid)"
        transform="translate(38,422) rotate(-8) scale(0.34)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-dark)"
        transform="translate(268,430) rotate(188) scale(0.28)"
      />
    </svg>
  );
}
