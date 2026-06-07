import Link from "next/link";

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ??
  "csdt@generativejustice.org";

export default function AccessibilityStatementPage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>Accessibility Statement</h1>
      <p>
        <strong>Last updated: June 7, 2026</strong>
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

      <h3>Happy Bamboo Template — June 2026</h3>
      <ul>
        <li>
          <strong>
            Product gallery lightbox missing dialog semantics and focus trap
          </strong>{" "}
          — The enlarged-image lightbox now uses{" "}
          <code>role=&quot;dialog&quot;</code>,{" "}
          <code>aria-modal=&quot;true&quot;</code>, and a descriptive{" "}
          <code>aria-label</code>. Focus moves to the close button when the
          dialog opens and returns to the enlarge trigger on close, Tab is
          trapped within the dialog, and the open/zoom animation is skipped under{" "}
          <code>prefers-reduced-motion</code>. (This gallery is shared, so the
          fix also benefits the Pollen, Bamboo, and Dark Trend templates.){" "}
          <em>WCAG 2.1.2, 2.4.3, 4.1.2, 2.3.3.</em>
        </li>
        <li>
          <strong>
            Variant selector — selected state conveyed by color alone
          </strong>{" "}
          — Variant option buttons now carry <code>aria-pressed</code> so the
          selected option is communicated to assistive technology.{" "}
          <em>WCAG 1.4.1, 4.1.2.</em>
        </li>
        <li>
          <strong>
            Out-of-stock and add-to-cart buttons removed from keyboard tab order
          </strong>{" "}
          — Out-of-stock variant buttons, the variant add-to-cart button, the
          product-page Out of Stock button, and the product-card add-to-cart
          button now use <code>aria-disabled=&quot;true&quot;</code> with an{" "}
          <code>onClick</code> guard instead of the HTML <code>disabled</code>{" "}
          attribute, keeping them keyboard-discoverable.{" "}
          <em>WCAG 4.1.2.</em>
        </li>
        <li>
          <strong>Add-to-cart confirmation not announced</strong> — A
          visually-hidden <code>aria-live=&quot;polite&quot;</code> region now
          announces &ldquo;Added to cart&rdquo; for both variant and simple
          products, regardless of keyboard focus. <em>WCAG 4.1.3.</em>
        </li>
        <li>
          <strong>Variant stock availability not announced</strong> — The
          &ldquo;N available&rdquo; text now sits in a{" "}
          <code>role=&quot;status&quot; aria-live=&quot;polite&quot;</code>{" "}
          region so the count is announced when the shopper switches variants.{" "}
          <em>WCAG 4.1.3.</em>
        </li>
        <li>
          <strong>Shop search and sort controls had no accessible name</strong>{" "}
          — The shop search input now has{" "}
          <code>aria-label=&quot;Search products&quot;</code> (it previously
          relied on placeholder text only) and the sort dropdown trigger carries{" "}
          <code>aria-label=&quot;Sort products&quot;</code>.{" "}
          <em>WCAG 1.3.1, 3.3.2, 4.1.2.</em>
        </li>
        <li>
          <strong>
            Collection filter pills — selected state conveyed by color alone
          </strong>{" "}
          — The &ldquo;All&rdquo; and per-collection filter pills now carry{" "}
          <code>aria-pressed</code> reflecting the active collection.{" "}
          <em>WCAG 1.4.1, 4.1.2.</em>
        </li>
        <li>
          <strong>Product card add-to-cart label did not reflect state</strong>{" "}
          — The add-to-cart button&apos;s <code>aria-label</code> was hard-coded
          to &ldquo;Add … to cart&rdquo; even when the visible label read
          &ldquo;Out of stock&rdquo; or &ldquo;Coming Soon.&rdquo; The label now
          matches the current product state. <em>WCAG 2.5.3, 4.1.2.</em>
        </li>
        <li>
          <strong>Contact form success not announced or focused</strong> — The
          submission success card now carries <code>role=&quot;status&quot;</code>{" "}
          and focus moves to its confirmation heading on success.{" "}
          <em>WCAG 2.4.3, 4.1.3.</em>
        </li>
        <li>
          <strong>
            Checkout delivery method — selected state conveyed by color alone
          </strong>{" "}
          — The &ldquo;Ship to address&rdquo; and &ldquo;In-store pickup&rdquo;
          toggle buttons now carry <code>aria-pressed</code>.{" "}
          <em>WCAG 4.1.2.</em>
        </li>
        <li>
          <strong>Discount field error not associated to its input</strong> —
          The checkout discount input now uses <code>aria-invalid</code> and{" "}
          <code>aria-describedby</code>, and the error message carries{" "}
          <code>role=&quot;alert&quot;</code>. <em>WCAG 3.3.1, 4.1.3.</em>
        </li>
        <li>
          <strong>Order confirmation loading state not announced</strong> — The
          loading indicator on the order confirmation page now uses{" "}
          <code>role=&quot;status&quot; aria-live=&quot;polite&quot;</code>.{" "}
          <em>WCAG 4.1.3.</em>
        </li>
        <li>
          <strong>Cart drawer — labels, quantity, and motion</strong> — Remove
          buttons and quantity steppers now include the product name in their{" "}
          <code>aria-label</code>, the quantity display carries{" "}
          <code>aria-live=&quot;polite&quot; aria-atomic=&quot;true&quot;</code>,
          and the item enter/exit animation is collapsed under{" "}
          <code>prefers-reduced-motion</code>. <em>WCAG 4.1.2, 4.1.3, 2.3.3.</em>
        </li>
        <li>
          <strong>Footer &ldquo;Quick Links&rdquo; used invalid list markup</strong>{" "}
          — The list wrapped <code>&lt;a&gt;</code> elements directly in a{" "}
          <code>&lt;ul&gt;</code> with no <code>&lt;li&gt;</code> items; each link
          is now wrapped in an <code>&lt;li&gt;</code>. <em>WCAG 1.3.1.</em>
        </li>
        <li>
          <strong>Decorative icons announced by screen readers</strong> —
          Decorative icons across the template (leaf logo, arrows, search, quote,
          calendar, tag, status icons, footer social SVGs, cart icons) now carry{" "}
          <code>aria-hidden=&quot;true&quot;</code>. <em>WCAG 1.1.1.</em>
        </li>
        <li>
          <strong>Hero background image alt text</strong> — The decorative hero
          backdrop now uses <code>alt=&quot;&quot;</code> since the adjacent
          headline already conveys the content. <em>WCAG 1.1.1.</em>
        </li>
        <li>
          <strong>Announcement bar link opens new tab without warning</strong> —
          The external promotional link now includes a visually-hidden
          &ldquo;(opens in new tab)&rdquo; notice. <em>WCAG 3.2.2.</em>
        </li>
        <li>
          <strong>Reduced-motion handling for CSS transitions</strong> — The
          scoped <code>prefers-reduced-motion</code> block now also covers the{" "}
          <code>.happy-bamboo</code> template, collapsing CSS hover/transition
          motion (JavaScript-driven motion was already handled via the shared
          animation components). <em>WCAG 2.3.3.</em>
        </li>
      </ul>

      <h3>Bamboo Template — June 2026 (follow-up audit)</h3>
      <p>
        A second full-template audit (after the May 2026 remediation below)
        found no critical issues and resolved the following:
      </p>
      <ul>
        <li>
          <strong>Add-to-cart confirmation not announced</strong> — A
          visually-hidden <code>aria-live=&quot;polite&quot;</code> region now
          announces &ldquo;{"{product}"} added to cart&rdquo; for both simple
          and variant products, regardless of keyboard focus.{" "}
          <em>WCAG 4.1.3.</em>
        </li>
        <li>
          <strong>
            Out-of-stock and add-to-cart buttons removed from keyboard tab
            order
          </strong>{" "}
          — The product-page Out of Stock button, out-of-stock variant
          options, and the variant add-to-cart button now use{" "}
          <code>aria-disabled=&quot;true&quot;</code> with an{" "}
          <code>onClick</code> guard instead of the HTML <code>disabled</code>{" "}
          attribute, keeping them keyboard-discoverable. <em>WCAG 4.1.2.</em>
        </li>
        <li>
          <strong>
            Content pages rendered rich text with inverted (light-on-light)
            typography
          </strong>{" "}
          — Generic and policy pages applied a dark-background typography
          preset on Bamboo&apos;s near-white background, leaving list markers,
          blockquotes, and table text close to white-on-white. The preset has
          been replaced with explicit light-background colors.{" "}
          <em>WCAG 1.4.3.</em>
        </li>
        <li>
          <strong>
            Product gallery thumbnails — selected image conveyed by styling
            alone
          </strong>{" "}
          — Thumbnail buttons now carry <code>aria-pressed</code> reflecting
          the selected image, and the main-image crossfade is skipped under{" "}
          <code>prefers-reduced-motion</code>. (This gallery is shared, so the
          fix also benefits the Happy Bamboo, Pollen, and Dark Trend
          templates.) <em>WCAG 1.4.1, 4.1.2, 2.3.3.</em>
        </li>
        <li>
          <strong>Desktop navigation dropdown focus management</strong> — The
          dropdown trigger now carries <code>aria-controls</code>, Escape
          returns focus to the trigger instead of dropping it to the page
          body, and the menu closes when keyboard focus leaves it.{" "}
          <em>WCAG 2.4.3, 4.1.2.</em>
        </li>
        <li>
          <strong>Contact form success not announced or focused</strong> — The
          submission success card now carries{" "}
          <code>role=&quot;status&quot;</code> and focus moves to its
          confirmation heading. <em>WCAG 2.4.3, 4.1.3.</em>
        </li>
        <li>
          <strong>Order confirmation loading and success states</strong> — The
          loading indicator now uses <code>role=&quot;status&quot;</code>, and
          focus moves to the &ldquo;Order Confirmed!&rdquo; heading once order
          details load. <em>WCAG 2.4.3, 4.1.3.</em>
        </li>
        <li>
          <strong>Discount confirmation not announced</strong> — The
          &ldquo;Code applied&rdquo; message in checkout now carries{" "}
          <code>role=&quot;status&quot;</code> (the error path already used{" "}
          <code>role=&quot;alert&quot;</code>). <em>WCAG 4.1.3.</em>
        </li>
        <li>
          <strong>Collection hero text over user-uploaded imagery</strong> —
          Semi-transparent white text on collection hero images has been
          darkened (60% → 80%, 80% → 90% opacity) to better guarantee contrast
          over arbitrary photos. <em>WCAG 1.4.3.</em>
        </li>
        <li>
          <strong>Required field asterisk unexplained</strong> — The checkout
          and contact forms now state that fields marked with an asterisk (*)
          are required. <em>WCAG 3.3.2.</em>
        </li>
        <li>
          <strong>Star rating not exposed as an image</strong> — The
          testimonial star container&apos;s label now uses{" "}
          <code>role=&quot;img&quot;</code> so its &ldquo;5 out of 5
          stars&rdquo; label is reliably announced. <em>WCAG 1.1.1.</em>
        </li>
        <li>
          <strong>Heading levels skipped</strong> — Cart item titles, the blog
          post call-to-action heading, and contact sidebar labels were{" "}
          <code>&lt;h3&gt;</code> elements directly under an{" "}
          <code>&lt;h1&gt;</code>; they are now <code>&lt;h2&gt;</code>.{" "}
          <em>WCAG 1.3.1.</em>
        </li>
        <li>
          <strong>External navigation links open new tabs without warning</strong>{" "}
          — Owner-configured external links in the header and mobile
          navigation now include a visually-hidden &ldquo;(opens in new
          tab)&rdquo; notice. <em>WCAG 3.2.2.</em>
        </li>
        <li>
          <strong>Remaining decorative icons announced</strong> — A second
          pass added <code>aria-hidden=&quot;true&quot;</code> to decorative
          arrow, cart, check, loader, and package icons missed in the May
          remediation. <em>WCAG 1.1.1.</em>
        </li>
        <li>
          <strong>
            Redundant <code>aria-label</code>s on non-interactive text removed
          </strong>{" "}
          — Quantity displays and order status badges carried{" "}
          <code>aria-label</code>s that assistive technology does not expose
          on plain text elements; the visible text itself is announced, so the
          redundant labels were removed (live-region announcements were
          kept). <em>WCAG 4.1.2 (refinement of a May 2026 item).</em>
        </li>
      </ul>

      <h3>Noise Template — June 2026</h3>
      <ul>
        <li>
          <strong>
            Invalid landmark structure — layout root was a{" "}
            <code>&lt;main&gt;</code>
          </strong>{" "}
          — The layout root now uses <code>&lt;div&gt;</code> with a proper{" "}
          <code>&lt;main id=&quot;main-content&quot;&gt;</code> wrapping only
          page content, so the header and footer landmarks are no longer nested
          inside <code>main</code>. <em>WCAG 1.3.1, 4.1.1.</em>
        </li>
        <li>
          <strong>No skip navigation link</strong> — A &ldquo;Skip to main
          content&rdquo; link is now the first focusable element on every page.{" "}
          <em>WCAG 2.4.1.</em>
        </li>
        <li>
          <strong>No focus-visible indicator on any interactive element</strong>{" "}
          — Scoped <code>.noise *:focus-visible</code> rules now provide a
          visible 2px outline on every interactive element, with a{" "}
          <code>.vn-focus-on-dark</code> variant for controls placed on
          steel/ink backgrounds. <em>WCAG 2.4.7.</em>
        </li>
        <li>
          <strong>No reduced-motion handling</strong> — A scoped{" "}
          <code>prefers-reduced-motion</code> block now collapses the marquee,
          pulsing announcement dot, intro tile/curtain motion, and product/card
          hover animations. <em>WCAG 2.3.3.</em>
        </li>
        <li>
          <strong>Nested interactive elements in product card</strong> — The
          card wrapper was an <code>&lt;a&gt;</code> containing the add-to-cart{" "}
          <code>&lt;button&gt;</code> (invalid markup). The wrapper is now a{" "}
          <code>&lt;div&gt;</code>, the product title is a stretched link, and
          the add-to-cart button is an independent sibling with an{" "}
          <code>aria-label</code>. <em>WCAG 1.3.1, 4.1.2.</em>
        </li>
        <li>
          <strong>Contact form inputs had no accessible name</strong> — Fields
          rendered a standalone label span and passed an empty{" "}
          <code>label</code>, leaving inputs labelled by placeholder only. Real{" "}
          <code>&lt;label&gt;</code> associations are now wired through the form
          field components. <em>WCAG 1.3.1, 3.3.2, 4.1.2.</em>
        </li>
        <li>
          <strong>
            Variant selector — selected state conveyed by color alone
          </strong>{" "}
          — Variant buttons now carry <code>aria-pressed</code> so the selected
          option is communicated to assistive technology.{" "}
          <em>WCAG 1.4.1, 4.1.2.</em>
        </li>
        <li>
          <strong>Muted text color below contrast minimum</strong> — The{" "}
          <code>--vn-steel-mist</code> token, used for body-sized muted text
          (footer links, taglines, mono labels), was darkened from{" "}
          <code>#7a7670</code> (~3.6:1) to <code>#6b6760</code> (~4.6:1), and a
          0.7 opacity on the footer payment labels that undid the fix was
          removed. <em>WCAG 1.4.3.</em>
        </li>
        <li>
          <strong>
            Auto-advancing testimonial carousel had no pause control
          </strong>{" "}
          — The testimonial rotator advances every 5 seconds; it now has a
          labelled pause/play toggle, and auto-advance is suppressed entirely
          when reduced motion is requested. Inactive slides are{" "}
          <code>aria-hidden</code>, the stack is an <code>aria-live</code>{" "}
          region, and the nav dots carry <code>aria-current</code>.{" "}
          <em>WCAG 2.2.2, 2.3.3, 4.1.2.</em>
        </li>
        <li>
          <strong>Intro overlay — modal semantics and focus management</strong>{" "}
          — The full-screen intro animation is now a{" "}
          <code>role=&quot;dialog&quot; aria-modal=&quot;true&quot;</code> that
          moves focus to its Skip button on open, traps Tab within the overlay,
          and dismisses on Escape. Under <code>prefers-reduced-motion</code> the
          timed sequence is skipped immediately, and the duplicated curtain
          halves are marked <code>aria-hidden</code>.{" "}
          <em>WCAG 2.1.2, 2.4.3, 2.3.3, 1.3.1.</em>
        </li>
        <li>
          <strong>
            Text over user-uploaded imagery — contrast not guaranteed
          </strong>{" "}
          — The hero gradient overlay is now center-weighted, and the hero
          tagline, hero credit strip, and intro tile labels received legibility
          scrims (<code>text-shadow</code>) so foreground text remains readable
          over arbitrary light hero images, video, or light intro tiles.{" "}
          <em>WCAG 1.4.3.</em>
        </li>
        <li>
          <strong>Price range slider had a weak accessible name</strong> — The
          shop filter price slider now exposes a descriptive, value-aware{" "}
          <code>aria-label</code>, and the collapsible filter groups carry{" "}
          <code>aria-expanded</code> with the decorative glyph hidden.{" "}
          <em>WCAG 1.3.1, 4.1.2.</em>
        </li>
      </ul>

      <h3>Noise Template — June 2026 (follow-up audit)</h3>
      <p>
        A full WCAG 2.1 AA follow-up audit of the Noise template identified and
        resolved the following:
      </p>
      <ul>
        <li>
          <strong>Mobile navigation dialog — no focus management</strong> — The
          full-screen mobile menu now moves focus to its close button on open,
          traps Tab within the dialog, returns focus to the menu button on
          close, and marks the page content behind it <code>inert</code>.{" "}
          <em>WCAG 1.3.2, 2.1.2, 2.4.3.</em>
        </li>
        <li>
          <strong>Product image lightbox — not exposed as a dialog</strong> —
          The enlarge-image overlay now has{" "}
          <code>role=&quot;dialog&quot; aria-modal=&quot;true&quot;</code> and
          an accessible name, moves focus in on open, traps Tab, and returns
          focus to the triggering control on close.{" "}
          <em>WCAG 1.3.1, 2.1.2, 2.4.3, 4.1.2.</em>
        </li>
        <li>
          <strong>Unlabeled quantity stepper buttons</strong> — The variant
          selector&rsquo;s increase/decrease buttons rendered only an icon with
          no accessible name; they are now labelled, and quantity values across
          all steppers announce changes via polite live regions.{" "}
          <em>WCAG 4.1.2, 4.1.3.</em>
        </li>
        <li>
          <strong>Hero background video could not be paused</strong> — The
          autoplaying hero video now has a labelled pause/play control and does
          not autoplay when reduced motion is requested.{" "}
          <em>WCAG 2.2.2, 2.3.3.</em>
        </li>
        <li>
          <strong>JavaScript-driven animations ignored reduced motion</strong>{" "}
          — Framer-Motion animations (mobile menu, lightbox, hero entrance,
          cart drawer items, cart badge) now render instantly under{" "}
          <code>prefers-reduced-motion</code>, complementing the existing
          CSS-level rule. <em>WCAG 2.3.3.</em>
        </li>
        <li>
          <strong>Cart and navigation updates were not announced</strong> —
          Added &ldquo;added to bag&rdquo; live announcements on the product
          page, variant selector, and product-card quick-add; a route announcer
          for client-side navigations; and live regions on filter/search result
          counts. <em>WCAG 4.1.3.</em>
        </li>
        <li>
          <strong>
            Sold-out controls removed from the keyboard tab order
          </strong>{" "}
          — Sold-out and out-of-stock buttons now use{" "}
          <code>aria-disabled</code> instead of <code>disabled</code>, so
          keyboard and screen-reader users can discover why an item cannot be
          purchased. <em>WCAG 2.1.1, 4.1.2.</em>
        </li>
        <li>
          <strong>Checkout form semantics</strong> — Section headings inside
          fieldsets are now real <code>&lt;legend&gt;</code>s; the discount
          code error is programmatically associated with its input and
          announced (<code>aria-invalid</code>, <code>role=&quot;alert&quot;</code>);
          delivery-method toggles expose <code>aria-pressed</code>; and a
          visible note explains the required-field asterisk.{" "}
          <em>WCAG 1.3.1, 3.3.1, 3.3.2, 4.1.2.</em>
        </li>
        <li>
          <strong>Success states were silent</strong> — The contact form
          success panel and the order confirmation now receive focus and carry{" "}
          <code>role=&quot;status&quot;</code> so the outcome is announced.{" "}
          <em>WCAG 2.4.3, 4.1.3.</em>
        </li>
        <li>
          <strong>Low-contrast opacity-faded text</strong> — Product rail
          overlines and the blog search hint used 40&ndash;50% opacity ink
          (&approx;2.5&ndash;3.4:1); they now use the AA-compliant muted token.{" "}
          <em>WCAG 1.4.3.</em>
        </li>
        <li>
          <strong>Structural polish</strong> — Breadcrumbs are now a{" "}
          <code>&lt;nav&gt;</code> landmark with <code>aria-current</code>;
          gallery thumbnails expose <code>aria-pressed</code>; star ratings
          have text alternatives; heading levels no longer skip; decorative
          glyphs are hidden from assistive technology; links opening new tabs
          warn screen-reader users; and the header cart button name includes
          the item count. <em>WCAG 1.1.1, 1.3.1, 2.4.8, 4.1.2.</em>
        </li>
        <li>
          <strong>Small touch targets</strong> — Quantity steppers, carousel
          dots, footer social links, the menu button, and the lightbox close
          button now provide hit areas at or near 44&times;44&nbsp;px.{" "}
          <em>WCAG 2.5.5 (AAA, adopted as best practice).</em>
        </li>
      </ul>

      <h3>Bamboo Template — May 2026</h3>
      <ul>
        <li>
          <strong>
            Invalid landmark structure — layout root was a{" "}
            <code>&lt;main&gt;</code>
          </strong>{" "}
          — The layout root element now uses <code>&lt;div&gt;</code> with a
          proper <code>&lt;main id=&quot;bamboo-main-content&quot;&gt;</code>{" "}
          wrapping only page content, not header and footer.{" "}
          <em>WCAG 1.3.1, 4.1.1.</em>
        </li>
        <li>
          <strong>No skip navigation link</strong> — A &ldquo;Skip to main
          content&rdquo; link is now the first focusable element on every page.{" "}
          <em>WCAG 2.4.1.</em>
        </li>
        <li>
          <strong>Nested interactive elements in product card</strong> — A{" "}
          <code>&lt;Button&gt;</code> nested inside a <code>&lt;Link&gt;</code>{" "}
          has been replaced with a decorative{" "}
          <code>&lt;span aria-hidden&gt;</code>, making the card&apos;s single
          link the only interactive element. <em>WCAG 4.1.2.</em>
        </li>
        <li>
          <strong>Active page not identified in navigation</strong> — Nav links
          in the header, mobile nav, and account sidebar now carry{" "}
          <code>aria-current=&quot;page&quot;</code> on the active item.{" "}
          <em>WCAG 2.4.8.</em>
        </li>
        <li>
          <strong>
            Variant selector — selected state conveyed by color alone
          </strong>{" "}
          — Variant buttons now carry <code>aria-pressed</code> and are grouped
          with <code>role=&quot;group&quot;</code> and a label.{" "}
          <em>WCAG 1.4.1, 4.1.2.</em>
        </li>
        <li>
          <strong>Quantity changes not announced</strong> — Quantity displays in
          the product page, variant selector, and cart items now carry{" "}
          <code>aria-live=&quot;polite&quot; aria-atomic=&quot;true&quot;</code>
          . Stepper labels include the product name for disambiguation.{" "}
          <em>WCAG 4.1.3.</em>
        </li>
        <li>
          <strong>Sale price not labelled for screen readers</strong> — A
          visually-hidden &ldquo;Original price:&rdquo; prefix is now included
          inside the strikethrough price span on product cards and the product
          detail page. <em>WCAG 1.3.1.</em>
        </li>
        <li>
          <strong>Decorative icons announced by screen readers</strong> — All
          decorative icons throughout the template (arrows, leaf logo, calendar,
          tag, search, quote marks, status icons) now carry{" "}
          <code>aria-hidden=&quot;true&quot;</code>. <em>WCAG 1.1.1.</em>
        </li>
        <li>
          <strong>Order status badges — state conveyed by color alone</strong> —
          Each status badge now includes an <code>aria-label</code> such as
          &ldquo;Status: completed&rdquo;. <em>WCAG 1.4.1.</em>
        </li>
        <li>
          <strong>Arrow characters in link text announced literally</strong> —
          Arrow glyphs in &ldquo;View Details&rdquo; and back links are wrapped
          in <code>aria-hidden=&quot;true&quot;</code>; the links carry
          descriptive <code>aria-label</code> values. <em>WCAG 2.4.4.</em>
        </li>
        <li>
          <strong>Focus-visible ring and reduced-motion CSS</strong> — A scoped{" "}
          <code>.bamboo *:focus-visible</code> rule ensures a visible 2px focus
          outline on every interactive element. A{" "}
          <code>prefers-reduced-motion</code> block suppresses all CSS-driven
          animations and transitions. <em>WCAG 2.4.7, 2.3.3.</em>
        </li>
        <li>
          <strong>Color contrast — multiple failures</strong> — Footer headings
          and copyright text at 60% white opacity on the green primary
          background (~3.57:1), sustainability banner description text at 70%
          opacity (~4.28:1), discount success text using{" "}
          <code>text-green-600</code> (~3.13:1), and the max-quantity warning
          using <code>text-amber-500</code> (~2.04:1) have all been corrected to
          meet the 4.5:1 minimum. <em>WCAG 1.4.3.</em>
        </li>
        <li>
          <strong>Touch targets below 44px</strong> — Cart item quantity and
          remove buttons (32px) and product page quantity buttons (40px) have
          been increased to 44px. <em>WCAG 2.5.5.</em>
        </li>
        <li>
          <strong>Missing autocomplete on checkout personal data fields</strong>{" "}
          — Email and name fields in the checkout form now include{" "}
          <code>autoComplete=&quot;email&quot;</code> and{" "}
          <code>autoComplete=&quot;name&quot;</code>. <em>WCAG 1.3.5.</em>
        </li>
        <li>
          <strong>Discount field error not associated to its input</strong> —
          The error message now uses <code>aria-invalid</code>,{" "}
          <code>aria-describedby</code>, and <code>role=&quot;alert&quot;</code>
          on the error paragraph. <em>WCAG 3.3.1, 3.3.3.</em>
        </li>
        <li>
          <strong>
            Checkout delivery method — selected state conveyed by color alone
          </strong>{" "}
          — The &ldquo;Ship to address&rdquo; and &ldquo;In-store pickup&rdquo;
          toggle buttons now carry <code>aria-pressed</code>.{" "}
          <em>WCAG 4.1.2.</em>
        </li>
        <li>
          <strong>Blog search results have no live region</strong> — The result
          count paragraph now carries{" "}
          <code>aria-live=&quot;polite&quot; aria-atomic=&quot;true&quot;</code>
          so screen readers announce count changes as the user types.{" "}
          <em>WCAG 4.1.3.</em>
        </li>
        <li>
          <strong>Star ratings communicated nothing to screen readers</strong> —
          The testimonials star container now carries{" "}
          <code>aria-label=&quot;5 out of 5 stars&quot;</code>; individual star
          icons are <code>aria-hidden</code>. <em>WCAG 1.1.1.</em>
        </li>
        <li>
          <strong>Free-shipping progress bar had no accessible label</strong> —
          The progress bar now carries a human-readable <code>aria-label</code>
          with the current percentage. <em>WCAG 4.1.2.</em>
        </li>
        <li>
          <strong>SPA route changes not announced</strong> — A new{" "}
          <code>BambooRouteAnnouncer</code> client component watches for
          pathname changes and announces the incoming page title via a
          visually-hidden <code>aria-live=&quot;polite&quot;</code> region.{" "}
          <em>WCAG 2.4.2, SPA best practice.</em>
        </li>
        <li>
          <strong>
            Collection hero overlay insufficient contrast guarantee
          </strong>{" "}
          — The overlay behind hero text has been increased from{" "}
          <code>bg-black/50</code> to <code>bg-black/60</code> to better ensure
          text contrast against unknown user-uploaded images.{" "}
          <em>WCAG 1.4.3.</em>
        </li>
      </ul>

      <h3>Elegant Template — May 2026</h3>
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

      <h3>Default Template — May 2026</h3>
      <ul>
        <li>
          <strong>No skip navigation link</strong> — A &ldquo;Skip to main
          content&rdquo; link is now the first focusable element on every page,
          allowing keyboard users to bypass the repeated header navigation.{" "}
          <em>WCAG 2.4.1.</em>
        </li>
        <li>
          <strong>Cart badge icon-only link had no accessible name</strong> —
          The cart icon link now carries a dynamic <code>aria-label</code>{" "}
          (&ldquo;Cart&rdquo; or &ldquo;Cart, N item(s)&rdquo;) so screen reader
          users know the cart contents at a glance. <em>WCAG 4.1.2.</em>
        </li>
        <li>
          <strong>Quantity stepper buttons had generic labels</strong> —
          Increase and Decrease buttons on the cart page and product page now
          include the product name (e.g. &ldquo;Decrease quantity of Linen
          Tote&rdquo;) so multiple steppers on the same page are
          distinguishable. The quantity display carries{" "}
          <code>aria-live=&quot;polite&quot;</code> so changes are announced.{" "}
          <em>WCAG 1.3.1, 4.1.2, 4.1.3.</em>
        </li>
        <li>
          <strong>
            Variant selector — selected state conveyed by color alone
          </strong>{" "}
          — Variant buttons (size, colour, etc.) now carry{" "}
          <code>aria-pressed</code> and a group{" "}
          <code>role=&quot;group&quot;</code> with label, so the selected option
          is communicated without relying solely on visual styling.{" "}
          <em>WCAG 1.4.1, 4.1.2.</em>
        </li>
        <li>
          <strong>Pagination numbered buttons had no accessible label</strong> —
          Each page button now has <code>aria-label=&quot;Page N&quot;</code>{" "}
          and the active page carries <code>aria-current=&quot;page&quot;</code>
          . The pagination region is wrapped in{" "}
          <code>&lt;nav aria-label=&quot;Pagination&quot;&gt;</code>.{" "}
          <em>WCAG 2.4.6, 4.1.2.</em>
        </li>
        <li>
          <strong>Star rating communicated nothing to screen readers</strong> —
          The star rating display now uses{" "}
          <code>
            role=&quot;img&quot; aria-label=&quot;N out of 5 stars&quot;
          </code>{" "}
          so the rating is announced. <em>WCAG 1.1.1.</em>
        </li>
        <li>
          <strong>
            Breadcrumb separators announced as literal &ldquo;slash&rdquo;
          </strong>{" "}
          — All breadcrumb separators across the template now carry{" "}
          <code>aria-hidden=&quot;true&quot;</code>. Breadcrumb containers are
          wrapped in <code>&lt;nav aria-label=&quot;Breadcrumb&quot;&gt;</code>{" "}
          and the current page item carries{" "}
          <code>aria-current=&quot;page&quot;</code>.{" "}
          <em>WCAG 1.3.1, 2.4.8.</em>
        </li>
        <li>
          <strong>Mobile filter toggle missing expanded state</strong> — The
          shop page filter toggle now carries <code>aria-expanded</code> and{" "}
          <code>aria-controls</code> pointing to the panel, so assistive
          technology can announce whether filters are open. <em>WCAG 4.1.2.</em>
        </li>
        <li>
          <strong>
            Parallax hero animation ignored prefers-reduced-motion
          </strong>{" "}
          — The parallax scroll effect now checks{" "}
          <code>prefers-reduced-motion: reduce</code> before registering its
          scroll listener. The global CSS for the default template also disables
          all CSS transitions and animations for users who opt out of motion.{" "}
          <em>WCAG 2.3.3.</em>
        </li>
        <li>
          <strong>Footer navigation landmarks were unlabelled</strong> — The
          three footer navigation sections now carry distinct{" "}
          <code>aria-label</code> attributes so screen reader users can tell
          them apart from the primary site navigation. <em>WCAG 2.4.1.</em>
        </li>
        <li>
          <strong>Remove cart item button was ambiguous</strong> — Remove
          buttons now include the product name and variant (e.g. &ldquo;Remove
          Linen Tote — Natural from cart&rdquo;) so multiple remove buttons on
          the same page are distinguishable. <em>WCAG 2.4.6, 4.1.2.</em>
        </li>
        <li>
          <strong>Discount code input had no label</strong> — The discount code
          field now has a visually-hidden <code>&lt;label&gt;</code> associated
          via <code>htmlFor</code>. The Apply and Remove buttons also carry
          descriptive <code>aria-label</code> values.{" "}
          <em>WCAG 1.3.1, 3.3.2.</em>
        </li>
        <li>
          <strong>Checkout form submission errors not announced</strong> — The
          error alert shown on checkout failure is now wrapped in{" "}
          <code>role=&quot;alert&quot; aria-live=&quot;assertive&quot;</code> so
          screen reader users are informed immediately.{" "}
          <em>WCAG 3.3.1, 4.1.3.</em>
        </li>
        <li>
          <strong>Active page not identified in navigation</strong> — Primary
          nav links and account navigation links now carry{" "}
          <code>aria-current=&quot;page&quot;</code> on the active item.{" "}
          <em>WCAG 2.4.8.</em>
        </li>
        <li>
          <strong>
            Decorative icons and arrow characters announced by screen readers
          </strong>{" "}
          — Purely decorative icons (nav icons, button icons, arrow characters
          appended to link text) throughout the template now carry{" "}
          <code>aria-hidden=&quot;true&quot;</code>, preventing redundant
          announcements. <em>WCAG 1.1.1.</em>
        </li>
        <li>
          <strong>
            Hero background image alt text duplicated the page heading
          </strong>{" "}
          — The decorative hero background image now uses{" "}
          <code>alt=&quot;&quot;</code> since the adjacent{" "}
          <code>&lt;h1&gt;</code> already conveys the content; the previous{" "}
          <code>alt=&#123;title&#125;</code> caused the business name to be
          announced twice in quick succession. <em>WCAG 1.1.1.</em>
        </li>
        <li>
          <strong>Focus-visible ring and reduced-motion CSS</strong> — A global{" "}
          <code>*:focus-visible</code> rule ensures every interactive element in
          the default template has a visible 2px focus outline that meets WCAG
          2.4.7. A <code>prefers-reduced-motion</code> block suppresses all
          CSS-driven animation and transition durations.{" "}
          <em>WCAG 2.4.7, 2.3.3.</em>
        </li>
        <li>
          <strong>
            Product gallery lightbox missing dialog semantics and focus trap
          </strong>{" "}
          — The image lightbox now uses <code>role=&quot;dialog&quot;</code>,{" "}
          <code>aria-modal=&quot;true&quot;</code>, and a descriptive{" "}
          <code>aria-label</code>. Focus moves to the close button when the
          dialog opens and returns to the enlarge trigger on close. Tab is
          trapped within the dialog. <em>WCAG 2.1.2, 4.1.2.</em>
        </li>
        <li>
          <strong>
            Product thumbnail buttons suppressed the focus ring in Safari and
            Firefox
          </strong>{" "}
          — Thumbnail buttons used <code>focus:outline-none</code> (targeting{" "}
          <code>:focus</code>), which overrode the global focus ring in browsers
          that do not distinguish <code>:focus</code> from{" "}
          <code>:focus-visible</code>. Changed to{" "}
          <code>focus-visible:outline-none</code>. <em>WCAG 2.4.7.</em>
        </li>
        <li>
          <strong>Filter sidebar had no accessible name</strong> — The{" "}
          <code>&lt;aside&gt;</code> landmark containing shop filters now
          carries <code>aria-label=&quot;Product filters&quot;</code>, making it
          distinguishable from other complementary regions on the page.{" "}
          <em>WCAG 1.3.6.</em>
        </li>
        <li>
          <strong>
            Mobile filter toggle did not announce active filter state
          </strong>{" "}
          — The Filters button now uses{" "}
          <code>aria-label=&quot;Filters (active)&quot;</code> when filters are
          applied, so screen reader users know filters are currently in effect
          before interacting. <em>WCAG 1.3.3.</em>
        </li>
        <li>
          <strong>
            Checkout unavailable page lacked landmark structure and skip link
          </strong>{" "}
          — This page now includes a skip link, a <code>&lt;header&gt;</code>{" "}
          landmark, and <code>id=&quot;main-content&quot;</code> on its{" "}
          <code>&lt;main&gt;</code> element. <em>WCAG 2.4.1.</em>
        </li>
        <li>
          <strong>
            Framer Motion animations ignored prefers-reduced-motion
          </strong>{" "}
          — All animation wrapper components (<code>FadeIn</code>,{" "}
          <code>StaggerContainer</code>, <code>StaggerItem</code>,{" "}
          <code>ScaleIn</code>, <code>PageTransition</code>) now call{" "}
          <code>useReducedMotion()</code> and disable JavaScript-driven motion
          when the user has opted out. The existing CSS block already handled
          CSS transitions; this resolves the JS animation gap.{" "}
          <em>WCAG 2.3.3.</em>
        </li>
        <li>
          <strong>
            Variant selector add-to-cart confirmation not announced
          </strong>{" "}
          — The add-to-cart button in the variant selector flow now has a
          visually-hidden sibling <code>aria-live=&quot;polite&quot;</code> span
          that announces &ldquo;Added to bag&rdquo; when the cart is updated,
          matching the pattern already used for simple (non-variant) products.{" "}
          <em>WCAG 4.1.3.</em>
        </li>
        <li>
          <strong>
            Mobile navigation Tab key not trapped within the open menu
          </strong>{" "}
          — The mobile navigation menu now intercepts Tab and Shift+Tab so
          keyboard focus cycles within the open panel and does not escape to
          obscured page content behind it. <em>WCAG 2.1.1.</em>
        </li>
        <li>
          <strong>
            &ldquo;Continue to checkout&rdquo; was a button instead of a link
          </strong>{" "}
          — The element now uses{" "}
          <code>&lt;Link href=&quot;/checkout&quot;&gt;</code> instead of{" "}
          <code>&lt;button onClick=&#123;router.push&#125;&gt;</code>, giving
          keyboard and screen reader users correct link semantics and enabling
          browser features like open-in-new-tab and URL copy.{" "}
          <em>WCAG 4.1.2.</em>
        </li>
        <li>
          <strong>Out-of-stock button removed from keyboard tab order</strong> —
          The Out of Stock button now uses{" "}
          <code>aria-disabled=&quot;true&quot;</code> instead of the HTML{" "}
          <code>disabled</code> attribute, keeping the button reachable by
          keyboard so users can discover the out-of-stock state.{" "}
          <em>WCAG 4.1.2.</em>
        </li>
        <li>
          <strong>
            Decorative icons announced redundantly in auth pages and footer
          </strong>{" "}
          — <code>ArrowLeft</code> icons in the sign-up and forgot-password
          pages, the blog search icon, footer social link SVGs, and trust signal
          checkmark characters on the product detail page now carry{" "}
          <code>aria-hidden=&quot;true&quot;</code>. <em>WCAG 1.1.1.</em>
        </li>
        <li>
          <strong>Order confirmation loading state not announced</strong> — The
          loading indicator on the order confirmation page now uses{" "}
          <code>role=&quot;status&quot; aria-live=&quot;polite&quot;</code> so
          screen reader users are notified when order details finish loading.{" "}
          <em>WCAG 4.1.3.</em>
        </li>
      </ul>

      <h2>3. Known Limitations</h2>
      <p>
        The following known limitations exist as of the date of this statement.
        We are working to resolve them:
      </p>

      <h3>Elegant Template</h3>
      <h4>Color Contrast</h4>
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

      <h3>Default Template</h3>
      <h4>Color Contrast (Critical — WCAG 1.4.3)</h4>
      <ul>
        <li>
          <strong>Strikethrough compare-at price text</strong> — The previous
          (crossed-out) price on product cards uses <code>#a3a3a3</code> on a
          white background (2.52:1), which does not meet the 4.5:1 minimum. WCAG
          1.4.3 does not exempt informational text based on visual decoration
          such as strikethrough.
        </li>
        <li>
          <strong>Order status badge text — green and amber</strong> — The
          &ldquo;Completed&rdquo; / &ldquo;Fulfilled&rdquo; badge uses{" "}
          <code>#16a34a</code> (3.30:1 on white) and the pending/processing
          badge uses <code>#ca8a04</code> (2.94:1 on white). Both fail AA. Red
          and grey statuses are unaffected.
        </li>
        <li>
          <strong>Discount savings text in checkout</strong> — The applied
          discount line in the checkout order summary uses{" "}
          <code>text-green-600</code> (<code>#16a34a</code>, 3.30:1 on white),
          which fails AA for normal-sized text.
        </li>
      </ul>
      <h4>Landmark and Heading Structure (Moderate — WCAG 1.3.1, 4.1.1)</h4>
      <ul>
        <li>
          <strong>Mobile account navigation uses invalid list semantics</strong>{" "}
          — The mobile tab row uses <code>role=&quot;list&quot;</code> on a{" "}
          <code>&lt;div&gt;</code> whose direct children are{" "}
          <code>&lt;a&gt;</code> elements. <code>role=&quot;list&quot;</code>{" "}
          requires <code>role=&quot;listitem&quot;</code> children; the correct
          fix is to use <code>&lt;ul&gt;/&lt;li&gt;</code>. <em>WCAG 1.3.1.</em>
        </li>
        <li>
          <strong>
            Nested <code>&lt;main&gt;</code> landmark on order success page
          </strong>{" "}
          — The order confirmation page renders its own{" "}
          <code>&lt;main&gt;</code> element inside the layout&apos;s{" "}
          <code>&lt;main id=&quot;main-content&quot;&gt;</code>, producing two
          main landmarks in the DOM. This is invalid HTML and may cause
          JAWS/NVDA to announce two &ldquo;main&rdquo; regions.{" "}
          <em>WCAG 4.1.1.</em>
        </li>
        <li>
          <strong>Promise strip heading hierarchy skips a level</strong> — The
          homepage promise strip uses <code>&lt;h4&gt;</code> for item titles
          with no parent <code>&lt;h2&gt;</code> or <code>&lt;h3&gt;</code>,
          creating an <code>h2 → h4</code> skip that confuses screen reader
          users navigating by heading. <em>WCAG 1.3.1.</em>
        </li>
        <li>
          <strong>
            Collection card titles use <code>&lt;h2&gt;</code> at body-text size
          </strong>{" "}
          — Each collection card in the homepage rail and collections grid uses{" "}
          <code>&lt;h2&gt;</code> at 15px, visually indistinguishable from body
          text, while the section heading is also an <code>&lt;h2&gt;</code>.
          These should be <code>&lt;h3&gt;</code> sub-items under the section
          heading. <em>WCAG 1.3.1.</em>
        </li>
        <li>
          <strong>Blog search results have no live region</strong> — When a user
          types in the blog search field, results filter live but no
          screen-reader announcement is made. The shop page correctly uses{" "}
          <code>aria-live=&quot;polite&quot;</code> on the result count; the
          blog page does not. <em>WCAG 4.1.3.</em>
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
        This statement was prepared based on internal self-assessments
        conducted in May and June 2026, covering the Elegant, Default, Bamboo,
        Noise, and Happy Bamboo storefront templates (including full
        follow-up audits of Bamboo and Noise in June 2026). All critical and
        serious issues identified across these five templates have been
        resolved. It
        reflects the current state of the platform and its storefront templates.
      </p>

      <hr />
      <p className="text-sm text-gray-500">
        Related policies:{" "}
        <Link href="/platform/policies/terms-of-service">Terms of Service</Link>{" "}
        &middot;{" "}
        <Link href="/platform/policies/privacy-policy">Privacy Policy</Link>{" "}
        &middot;{" "}
        <Link href="/platform/policies/acceptable-use">
          Acceptable Use Policy
        </Link>
      </p>
    </div>
  );
}
