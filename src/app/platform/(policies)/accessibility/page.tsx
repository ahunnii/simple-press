import Link from "next/link";

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ??
  "csdt@generativejustice.org";

export default function AccessibilityStatementPage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>Accessibility Statement</h1>
      <p>
        <strong>Last updated: May 27, 2026</strong>
      </p>
      <p>
        SimplePress is operated by the Center for Generative Justice LLC. We are
        committed to ensuring that our platform — including the merchant admin
        dashboard and all storefront templates — is accessible to people with
        disabilities. We aim to meet{" "}
        <a
          href="https://www.w3.org/TR/WCAG21/"
          rel="noopener noreferrer"
          target="_blank"
        >
          Web Content Accessibility Guidelines (WCAG) 2.1 Level AA
        </a>
        .
      </p>

      <h2>1. Conformance Status</h2>
      <p>
        SimplePress is <strong>partially conformant</strong> with WCAG 2.1 Level
        AA. Partial conformance means that some parts of the platform do not yet
        fully conform to the accessibility standard. We have conducted an
        internal audit and identified areas for improvement. We are actively
        working to address these gaps.
      </p>

      <h2>2. Recently Addressed</h2>
      <p>The following issues were identified and resolved in May 2026:</p>
      <ul>
        <li>
          <strong>Auto-scrolling testimonials — no pause control</strong> —
          Scrolling testimonial columns now include a pause/play button.{" "}
          <em>WCAG 2.2.2.</em>
        </li>
        <li>
          <strong>Scrolling trust badge marquee — no pause control</strong> —
          The looping trust badge strip now includes a pause/play button.{" "}
          <em>WCAG 2.2.2.</em>
        </li>
        <li>
          <strong>Hover-only product card quick-add buttons</strong> — These
          buttons are now revealed when a keyboard user focuses any element
          within the card, not only on mouse hover. <em>WCAG 2.1.1.</em>
        </li>
        <li>
          <strong>Product page tab widget — no arrow-key navigation</strong> —
          The tab widget on product detail pages now supports Left/Right arrow
          keys, Home, and End as required by the ARIA tab pattern.{" "}
          <em>WCAG 2.1.1.</em>
        </li>
        <li>
          <strong>Delivery method selector — no arrow-key navigation</strong> —
          The checkout delivery method radio group now supports arrow-key
          navigation and correct <code>tabIndex</code> roving.{" "}
          <em>WCAG 2.1.1.</em>
        </li>
        <li>
          <strong>
            Variant selector buttons — no selected-state announcement
          </strong>{" "}
          — Product variant option buttons (size, color, etc.) now carry{" "}
          <code>aria-pressed</code> to communicate selected state to assistive
          technology. <em>WCAG 4.1.2.</em>
        </li>
        <li>
          <strong>
            Cart drawer — background content not hidden from screen readers
          </strong>{" "}
          — When the cart drawer is open, the main content area and footer are
          now marked <code>inert</code>, preventing screen readers from
          navigating outside the dialog. <em>WCAG 4.1.2.</em>
        </li>
        <li>
          <strong>
            Footer navigation landmark removed from accessibility tree
          </strong>{" "}
          — The footer <code>&lt;nav&gt;</code> element previously used{" "}
          <code>display: contents</code>, which stripped it from the
          accessibility tree in some browsers. It now renders as a proper grid
          column. <em>WCAG 1.3.6.</em>
        </li>
        <li>
          <strong>Newsletter success confirmation not announced</strong> — The
          newsletter signup success message now carries{" "}
          <code>role=&quot;status&quot;</code> so screen readers announce it
          automatically. <em>WCAG 4.1.3.</em>
        </li>
        <li>
          <strong>Contact form success — focus not moved</strong> — After a
          successful contact form submission, focus is now programmatically
          moved to the confirmation heading so screen reader users receive
          immediate feedback. <em>WCAG 2.4.3, 4.1.3.</em>
        </li>
        <li>
          <strong>Newsletter eyebrow text — insufficient contrast</strong> — The
          &quot;Letters from the studio&quot; eyebrow label previously rendered
          at 50% white opacity (~2.5:1). It now renders at 75% opacity (~9:1) on
          the dark background. <em>WCAG 1.4.3.</em>
        </li>
        <li>
          <strong>Search icon — inactive button with no action</strong> — The
          search icon in the header was a button with no handler. It is now a
          link to the shop page. <em>WCAG 2.1.1, 4.1.2.</em>
        </li>
        <li>
          <strong>Cart item links — using internal ID instead of slug</strong> —
          Product links in the cart page now resolve to the correct product URL
          using the product slug. <em>WCAG 2.4.4.</em>
        </li>
        <li>
          <strong>Checkout form field-level errors</strong> — Validation errors
          are now associated with the specific field that failed: each required
          field receives <code>aria-invalid</code> and{" "}
          <code>aria-describedby</code> pointing to an inline error message.
          Focus moves to the first invalid field on submit.{" "}
          <em>WCAG 3.3.1, 3.3.3.</em>
        </li>
        <li>
          <strong>Required field asterisk unexplained</strong> — A visually
          hidden sentence at the top of the checkout form now states that fields
          marked with an asterisk (*) are required. <em>WCAG 3.3.2.</em>
        </li>
        <li>
          <strong>Add to cart confirmation not announced</strong> — A visually
          hidden <code>aria-live=&quot;polite&quot;</code> region adjacent to
          the add-to-bag button now announces &quot;Added to bag&quot; when a
          product is added to the cart, regardless of where keyboard focus is.
          Applies to both simple products and variant-selector products.{" "}
          <em>WCAG 4.1.3.</em>
        </li>
        <li>
          <strong>Decorative icons missing aria-hidden</strong> — Check, arrow,
          plus, and minus icons inside buttons with explicit{" "}
          <code>aria-label</code> or visible text now carry{" "}
          <code>aria-hidden=&quot;true&quot;</code> so screen readers do not
          read redundant icon names. <em>WCAG 1.1.1.</em>
        </li>
        <li>
          <strong>
            Cart drawer — <code>aside</code> element used as dialog
          </strong>{" "}
          — The cart drawer now uses{" "}
          <code>&lt;div role=&quot;dialog&quot;&gt;</code> instead of{" "}
          <code>&lt;aside role=&quot;dialog&quot;&gt;</code>, removing the
          conflicting implicit <code>complementary</code> landmark role.{" "}
          <em>WCAG 4.1.2.</em>
        </li>
        <li>
          <strong>Cart drawer heading level</strong> — The &quot;Your bag&quot;
          heading inside the cart drawer is now an <code>&lt;h2&gt;</code>{" "}
          (previously <code>&lt;h3&gt;</code>), matching its role as the
          top-level title of the dialog. <em>WCAG 1.3.1.</em>
        </li>
        <li>
          <strong>Cart drawer quantity changes not announced</strong> — The
          quantity display in each cart item stepper now carries{" "}
          <code>aria-live=&quot;polite&quot;</code> so screen reader users hear
          the updated count after pressing Increase or Decrease. Stepper button
          labels also include the product name for unambiguous context.{" "}
          <em>WCAG 4.1.3.</em>
        </li>
        <li>
          <strong>
            &quot;View details&quot; order links — ambiguous out of context
          </strong>{" "}
          — Each order card&apos;s &quot;View details&quot; link now includes an{" "}
          <code>aria-label</code> with the order number (e.g. &quot;View details
          for order #1042&quot;), so the links are distinguishable when
          navigated via a screen reader&apos;s link list. <em>WCAG 2.4.6.</em>
        </li>
        <li>
          <strong>Track shipment link opens new tab without warning</strong> —
          The tracking link on order detail pages now includes a visually hidden
          &quot;(opens in new tab)&quot; notice so screen reader users are aware
          of the context switch before activating the link. <em>WCAG 3.2.2.</em>
        </li>
        <li>
          <strong>Product card articles have no accessible name</strong> — Each
          product card <code>&lt;article&gt;</code> element now carries{" "}
          <code>aria-label</code> set to the product name, giving screen reader
          users a meaningful landmark when navigating between articles.{" "}
          <em>WCAG 1.3.1.</em>
        </li>
        <li>
          <strong>Mobile hamburger button missing relationship to menu</strong>{" "}
          — The hamburger button now includes <code>aria-controls</code>{" "}
          pointing to the mobile nav panel and{" "}
          <code>aria-haspopup=&quot;true&quot;</code>, so assistive technology
          can announce that activating it opens a navigation panel.{" "}
          <em>WCAG 4.1.2.</em>
        </li>
        <li>
          <strong>Sort select — decorative icon in label</strong> — The sort
          control on the shop page wraps an <code>ArrowUpDown</code> icon, a
          &quot;Sort&quot; label, and a <code>&lt;select&gt;</code> inside a
          single <code>&lt;label&gt;</code>. The icon now carries{" "}
          <code>aria-hidden=&quot;true&quot;</code> so screen readers compute
          the label name from the visible text only. <em>WCAG 1.3.1, 4.1.2.</em>
        </li>
        <li>
          <strong>
            Footer and newsletter semi-transparent text — contrast verified
          </strong>{" "}
          — Previously flagged as borderline: footer heading labels use{" "}
          <code>rgba(255,255,255,0.65)</code> and nav links use{" "}
          <code>opacity: 0.8</code>, both over the dark <code>#1c1a17</code>{" "}
          background. Composited contrast ratios were calculated in linear
          light: <strong>12.1:1</strong> (0.65 white), <strong>14.4:1</strong>{" "}
          (0.8 opacity links), and <strong>12.7:1</strong> (0.7 opacity body
          copy) — all exceed both AA (4.5:1) and AAA (7:1) thresholds. No color
          changes required. <em>WCAG 1.4.3.</em>
        </li>
      </ul>

      <h2>3. Known Limitations</h2>
      <p>
        The following known limitations exist as of the date of this statement.
        We are working to resolve them:
      </p>

      <h3>Color Contrast</h3>
      <ul>
        <li>
          <strong>Disabled and out-of-stock text</strong> — Muted text used for
          disabled UI states (e.g. out-of-stock variant labels) uses{" "}
          <code>--el-ink-mute</code> (<code>#9a9485</code>), which does not meet
          the 4.5:1 minimum for normal-sized text. This is{" "}
          <strong>WCAG-exempt for inactive UI components</strong> (WCAG 1.4.3
          does not apply to text that is part of an inactive user interface
          component). We are noting it here for transparency.
        </li>
      </ul>

      <h2>4. Technical Specifications</h2>
      <p>
        SimplePress storefronts and the platform dashboard rely on the following
        technologies:
      </p>
      <ul>
        <li>HTML5</li>
        <li>CSS (including Tailwind CSS)</li>
        <li>JavaScript / React (Next.js)</li>
        <li>WAI-ARIA</li>
      </ul>
      <p>
        Accessibility has been tested with keyboard-only navigation and
        inspected against WCAG 2.1 AA success criteria via manual code review.
        We have not yet completed testing with all major screen reader and
        browser combinations. We intend to conduct assistive technology testing
        (NVDA + Firefox, JAWS + Chrome, VoiceOver + Safari) as part of ongoing
        remediation.
      </p>

      <h2>5. Feedback and Contact</h2>
      <p>
        We welcome feedback on the accessibility of SimplePress. If you
        experience barriers when using the platform or any storefront powered by
        SimplePress, or if you need information in an accessible format, please
        contact us:
      </p>
      <ul>
        <li>
          <strong>Email:</strong>{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </li>
      </ul>
      <p>
        We aim to respond to accessibility feedback within 5 business days. If
        you are unsatisfied with our response, you may contact the{" "}
        <a
          href="https://www.ada.gov/"
          rel="noopener noreferrer"
          target="_blank"
        >
          U.S. Department of Justice ADA Information Line
        </a>{" "}
        at 1-800-514-0301 (voice) or 1-833-610-1264 (TTY).
      </p>

      <h2>6. Formal Complaints</h2>
      <p>
        SimplePress is a community-oriented platform. We take accessibility
        seriously and will make reasonable efforts to resolve accessibility
        barriers reported to us. If you believe that your rights under the
        Americans with Disabilities Act (ADA) or Section 508 of the
        Rehabilitation Act have been violated, you have the right to file a
        complaint with the appropriate federal agency.
      </p>

      <h2>7. Our Commitment</h2>
      <p>
        Accessibility is an ongoing effort, not a one-time fix. We are committed
        to:
      </p>
      <ul>
        <li>
          Addressing the known limitations listed above in upcoming development
          cycles, prioritizing critical and serious issues first.
        </li>
        <li>
          Including accessibility review as part of our process when new
          storefront templates or features are developed.
        </li>
        <li>
          Updating this statement as issues are resolved and new assessments are
          conducted.
        </li>
      </ul>
      <p>
        This statement was prepared based on an internal self-assessment
        conducted in May 2026. It reflects the current state of the platform and
        its storefront templates.
      </p>

      <hr />
      <p className="text-sm text-gray-500">
        Related policies:{" "}
        <Link href="/platform/terms-of-service">Terms of Service</Link> &middot;{" "}
        <Link href="/platform/privacy-policy">Privacy Policy</Link> &middot;{" "}
        <Link href="/platform/acceptable-use">Acceptable Use Policy</Link>
      </p>
    </div>
  );
}
