/**
 * Step-by-step "Moving to <platform>" guides.
 *
 * Menu paths were checked against each platform's own help pages on
 * 2026-10-09:
 *   - Shopify:      help.shopify.com/en/manual/products/import-export/import-products
 *                   help.shopify.com/en/manual/products/import-export/using-csv
 *   - Wix:          support.wix.com/en/article/importing-products-to-wix-stores
 *                   support.wix.com/en/article/importing-blog-posts-from-wordpress-to-the-new-wix-blog
 *   - Squarespace:  support.squarespace.com/hc/articles/115000378108 (product CSV)
 *   - Square:       squareup.com/help/us/en/article/5153-import-items-online
 *   - WordPress:    developer.wordpress.org/advanced-administration/wordpress/import/
 *   - WooCommerce:  woocommerce.com/document/product-csv-importer-exporter/
 * NOT verified (kept generic on purpose): where Squarespace's blog import
 * lives in Settings, Shopify blog/page menus, the Wix/Squarespace/Square
 * price plans, and the WooCommerce coupon menu.
 */
import { callout } from "../html";
import { SITE_EXPORT_DIRS, type SiteExportFile } from "../types";
import {
  GUIDE_PATHS,
  IMPORT_PATHS,
  byHandSection,
  filesToUse,
  folder,
  guideFile,
  h2,
  hasImportFile,
  link,
  nextStepsSection,
  ol,
  photosSection,
  stampCheckedNote,
} from "./shared";
import type { SiteExportSummary } from "./types";

export function buildWordPressGuide(summary: SiteExportSummary): SiteExportFile {
  const doc = GUIDE_PATHS.wordpress;
  const hasContent = hasImportFile(summary, IMPORT_PATHS.wordpressContent);
  const hasProducts = hasImportFile(summary, IMPORT_PATHS.wordpressProducts);
  let body =
    `<p>WordPress is free software that powers a large share of the web. It is the most flexible choice, and also the one that needs the most setup: you need somewhere to run it (called <em>hosting</em>), and you choose and install your own design (called a <em>theme</em>). If you would rather not do that yourself, see ${link(doc, GUIDE_PATHS.hiring, "Hiring a designer or developer")}.</p>` +
    h2("Which files to use") +
    filesToUse(
      summary,
      doc,
      [
        {
          path: IMPORT_PATHS.wordpressContent,
          what: "your pages and blog posts, in WordPress's own format.",
        },
        {
          path: IMPORT_PATHS.wordpressProducts,
          what: "your products, for the free WooCommerce shop add-on.",
        },
      ],
      "WordPress",
    ) +
    h2("Before you start") +
    ol([
      "Set up a WordPress site. You can do this with a hosting company (most offer one-click WordPress install) or at WordPress.com. Pick a plan that lets you install plugins, because selling products needs one.",
      "Log in to your WordPress dashboard. This is the admin area, usually at your site address followed by /wp-admin.",
    ]);

  if (hasContent) {
    body +=
      h2("Step 1: Import your pages and blog posts") +
      ol([
        "In the WordPress dashboard, go to <strong>Tools</strong>, then <strong>Import</strong>.",
        "Under <strong>WordPress</strong>, click <strong>Install Now</strong> if you see it, then click <strong>Run Importer</strong>.",
        `Click <strong>Choose File</strong> and pick ${link(doc, IMPORT_PATHS.wordpressContent, "content.wxr.xml")}, then click <strong>Upload file and import</strong>.`,
        "Choose who the imported posts belong to: pick yourself from the list, or create a new user.",
        "Tick <strong>Download and import file attachments</strong> if it is offered, so your pictures come across too. Then click <strong>Submit</strong>.",
        "When it finishes, look at <strong>Pages</strong> and <strong>Posts</strong> in the dashboard to check everything arrived.",
      ]);
  }
  if (hasProducts) {
    body +=
      h2(`Step ${hasContent ? 2 : 1}: Import your products`) +
      `<p>Selling products on WordPress uses a free add-on called <strong>WooCommerce</strong>.</p>` +
      ol([
        "Go to <strong>Plugins</strong>, then <strong>Add New Plugin</strong>. Search for <em>WooCommerce</em>, click <strong>Install Now</strong>, then <strong>Activate</strong>. Follow its setup screens.",
        "Go to <strong>Products</strong>, then <strong>All Products</strong>, and click <strong>Import</strong> at the top of the page.",
        `Click <strong>Choose File</strong>, pick ${link(doc, IMPORT_PATHS.wordpressProducts, "woocommerce-products.csv")}, and click <strong>Continue</strong>.`,
        "On the <strong>Column mapping</strong> screen, check that each column matches the right field. They should already match.",
        "Click <strong>Run the importer</strong> and wait. Do not refresh or leave the page while it runs.",
      ]) +
      callout(
        "<p>Images must be reachable online while the importer runs. WooCommerce copies each one into your Media Library. See \"Your photos\" below.</p>",
        "tip",
      );
  } else {
    body +=
      h2("Products") +
      `<p>There is no product file for this site, so add products by hand: in WooCommerce choose <strong>Products</strong>, then <strong>Add New</strong>, and copy from the pages in the ${folder(SITE_EXPORT_DIRS.products)} folder.</p>`;
  }

  body +=
    photosSection(
      summary,
      `<p>To upload photos yourself in WordPress, go to <strong>Media</strong>, then <strong>Add New</strong>, and drag in the pictures from the ${folder(SITE_EXPORT_DIRS.photos)} folder.</p>`,
      hasContent || hasProducts,
    ) +
    byHandSection(summary, doc, [
      "<strong>Customer accounts.</strong> The customer list is in your spreadsheets, but the product importer does not bring in customers. Ask customers to create a new account, or see the Payments guide.",
      "<strong>Booking, events and memberships.</strong> WordPress needs a plugin for each. Search the Plugins area for the feature you need.",
    ]) +
    nextStepsSection(doc) +
    stampCheckedNote();
  return guideFile(doc, "Moving to WordPress", summary, body, "Free, flexible software. Best if you or someone you hire is comfortable with a bit of setup.");
}

export function buildShopifyGuide(summary: SiteExportSummary): SiteExportFile {
  const doc = GUIDE_PATHS.shopify;
  const has = hasImportFile(summary, IMPORT_PATHS.shopify);
  let body =
    `<p>Shopify is built for selling. It is a good fit if you have many products, or expect to grow. It is a paid service, and it usually offers a free trial. Check Shopify's site for current prices.</p>` +
    h2("Which file to use") +
    filesToUse(
      summary,
      doc,
      [{ path: IMPORT_PATHS.shopify, what: "your products, ready for Shopify's importer." }],
      "Shopify",
    );
  if (has) {
    body +=
      h2("Import your products") +
      ol([
        "Create your Shopify account and log in to the Shopify admin.",
        "Click <strong>Products</strong> in the left menu.",
        "Click <strong>Import</strong>.",
        `Click <strong>Add file</strong> and pick ${link(doc, IMPORT_PATHS.shopify, "products.csv")}.`,
        "Leave the other options as they are, unless you only want products on your online store. In that case untick <strong>Publish new products to all sales channels</strong>.",
        "Click <strong>Upload and continue</strong>.",
        "Read the summary Shopify shows, then click <strong>Import products</strong>.",
      ]) +
      callout(
        "<p>Do not open the file and sort it in a spreadsheet program. Sorting the rows can separate each product from its pictures. If you need to edit it, change cells but leave the row order alone.</p>",
        "warn",
      ) +
      `<p>Barcodes (UPC or ISBN numbers) are not in the Shopify file. If you use them, add them to each product in Shopify afterward. They are listed in the products spreadsheet in the ${folder(SITE_EXPORT_DIRS.spreadsheets)} folder.</p>`;
  }
  body +=
    h2("Your pages and blog") +
    `<p>This export does not include a page or blog file for Shopify. In the Shopify admin, look under <strong>Online Store</strong> for <strong>Pages</strong> and <strong>Blog posts</strong>, create each one, and copy the text in from the readable copies in the ${folder(SITE_EXPORT_DIRS.pages)} and ${folder(SITE_EXPORT_DIRS.blog)} folders.</p>` +
    photosSection(
      summary,
      "<p>Shopify downloads each product picture from its link during the import and keeps its own copy. The links must be public, so do not put your old site behind a password until the import is done.</p>",
      has,
    ) +
    byHandSection(summary, doc, [
      "<strong>Services, bookings and events.</strong> Shopify is for selling products. Look in the Shopify App Store for a booking or events app.",
      "<strong>Customers.</strong> The customer list is in your spreadsheets. Shopify has its own customer import under Customers, but check the Payments guide first about what to do with saved cards and subscriptions.",
    ]) +
    nextStepsSection(doc) +
    stampCheckedNote();
  return guideFile(doc, "Moving to Shopify", summary, body, "Paid. Best for larger product catalogs.");
}

export function buildWixGuide(summary: SiteExportSummary): SiteExportFile {
  const doc = GUIDE_PATHS.wix;
  const has = hasImportFile(summary, IMPORT_PATHS.wix);
  const hasWxr = hasImportFile(summary, IMPORT_PATHS.wordpressContent);
  let body =
    `<p>Wix is a drag-and-drop website builder, so you can change the design just by clicking and dragging. It is a paid service. Check Wix's site for current plans.</p>` +
    h2("Which files to use") +
    filesToUse(
      summary,
      doc,
      [
        { path: IMPORT_PATHS.wix, what: "your products, ready for Wix Stores." },
        { path: IMPORT_PATHS.wordpressContent, what: "your blog posts, in a standard format Wix can read." },
      ],
      "Wix",
    );
  if (has) {
    body +=
      h2("Import your products") +
      ol([
        "Create your Wix site and add <strong>Wix Stores</strong> to it.",
        "In your site's dashboard, open <strong>Store Products</strong>.",
        "Click <strong>More Actions</strong>, then <strong>Import</strong>.",
        `Click <strong>Upload CSV File</strong>, pick ${link(doc, IMPORT_PATHS.wix, "products.csv")}, and click <strong>Continue</strong>.`,
        "Wix shows a review. If it lists errors, click <strong>View Errors</strong> to see them. Importing anyway only brings in the products without errors.",
        "Click <strong>Import Products</strong>.",
        "To see what you just added, use the <strong>Filter by</strong> menu in Store Products and choose <strong>Last imported</strong>.",
      ]) +
      callout(
        "<p>Do not add, delete or rename columns in the file. Wix uses the column names to understand it. Wix accepts up to 5,000 rows in one file, and cannot import digital products (downloads).</p>",
        "warn",
      ) +
      `<p>Pictures can take up to an hour to appear after a big import.</p>` +
      callout(
        "<p>Check your weight units before importing. The file uses the same unit (pounds or kilograms) as your SimplePress store. In Wix, look in your store's settings for the weight unit and make sure it matches, or shipping prices based on weight will be wrong.</p>",
        "tip",
      );
  }
  if (hasWxr) {
    body +=
      h2("Import your blog posts") +
      ol([
        "In your dashboard, add <strong>Wix Blog</strong> to your site if you have not already.",
        "Open the <strong>Blog</strong> area, click <strong>More Actions</strong>, then <strong>Import posts</strong>. If the names differ slightly in your dashboard, look for an option to import posts.",
        "Choose <strong>WordPress</strong>, then choose to import from an <strong>XML file</strong> (not from a website address).",
        `Pick ${link(doc, IMPORT_PATHS.wordpressContent, "content.wxr.xml")}.`,
      ]);
  }
  body +=
    photosSection(
      summary,
      "<p>Wix takes product pictures from the links in the spreadsheet. If a link no longer works, leave the picture out and add it in Wix afterward.</p>",
      has || hasWxr,
    ) +
    byHandSection(summary, doc, [
      "<strong>Pages.</strong> Wix does not import pages. Add each one in the editor and paste in the text.",
    ]) +
    nextStepsSection(doc) +
    stampCheckedNote();
  return guideFile(doc, "Moving to Wix", summary, body, "Paid. Easy drag-and-drop design.");
}

export function buildSquarespaceGuide(summary: SiteExportSummary): SiteExportFile {
  const doc = GUIDE_PATHS.squarespace;
  const has = hasImportFile(summary, IMPORT_PATHS.squarespace);
  const hasWxr = hasImportFile(summary, IMPORT_PATHS.wordpressContent);
  let body =
    `<p>Squarespace is a drag-and-drop website builder known for polished designs. It is a paid service. Check Squarespace's site for current plans, and make sure yours includes the online store features if you sell products.</p>` +
    h2("Which files to use") +
    filesToUse(
      summary,
      doc,
      [
        { path: IMPORT_PATHS.squarespace, what: "your products, ready for Squarespace's product import." },
        { path: IMPORT_PATHS.wordpressContent, what: "your blog posts and pages, in a standard format Squarespace can read." },
      ],
      "Squarespace",
    );
  if (has) {
    body +=
      h2("Import your products") +
      ol([
        "Set up your Squarespace site with a store page, and set that page's URL slug to <strong>shop</strong> (you can change a page's URL slug in its page settings). The file puts every product on the page whose slug is \"shop\". If you would rather use a different page, open the file and change the <strong>Product Page</strong> column to that page's slug.",
        "If you want your products sorted into categories, create the same categories on the store page first. The import can only put products into categories that already exist.",
        "Open the <strong>Products</strong> panel.",
        "Click <strong>Import</strong> in the top-right corner.",
        `Drag ${link(doc, IMPORT_PATHS.squarespace, "products.csv")} into the <strong>Upload Squarespace CSV</strong> box.`,
        "If you do not want the import to change your stock numbers, untick <strong>Update product quantities</strong>.",
        "Read the results. If there are errors, fix the file and upload it again.",
        "Click <strong>Save</strong>.",
      ]) +
      callout(
        "<p>The import only brings in physical products and services, not downloads. It happens once: later changes to the file do not update Squarespace. Imported products have no main picture selected, so open each one and choose its featured image. Pictures for product variants (for example, different colors) must also be added by hand.</p><p>Squarespace only imports pictures saved as .jpg, .png or .gif. Any other kind of picture is left out, so upload those by hand from the Photos folder.</p>",
        "warn",
      ) +
      callout(
        "<p>If Squarespace will not accept the file, download Squarespace's own blank product template: in the <strong>Products</strong> panel, click <strong>Import</strong> and look for the link to download a template. Then copy the columns from our file into theirs and upload that instead.</p>",
        "tip",
      );
  }
  if (hasWxr) {
    body +=
      h2("Import your blog posts") +
      `<p>Squarespace can read the standard WordPress file. In your site settings, look for an <strong>Import</strong> or <strong>Import / Export</strong> option, choose <strong>WordPress</strong>, and pick ${link(doc, IMPORT_PATHS.wordpressContent, "content.wxr.xml")}. Squarespace's menus change often, so if you cannot find it, search Squarespace's help center for "import a WordPress site".</p>` +
      callout("<p>Check the imported posts carefully afterward, and re-add any pictures that did not come across.</p>", "tip");
  }
  body +=
    photosSection(
      summary,
      "<p>Squarespace copies product pictures from the links in the spreadsheet and then keeps its own copies. If a picture does not show up, add it by hand from the Photos folder.</p>",
      has || hasWxr,
    ) +
    byHandSection(summary, doc, [
      "<strong>Page layouts.</strong> Squarespace has its own page designs. Choose a design you like and paste in your text.",
    ]) +
    nextStepsSection(doc) +
    stampCheckedNote();
  return guideFile(doc, "Moving to Squarespace", summary, body, "Paid. Polished, easy design.");
}

export function buildSquareGuide(summary: SiteExportSummary): SiteExportFile {
  const doc = GUIDE_PATHS.square;
  const has = hasImportFile(summary, IMPORT_PATHS.square);
  let body =
    `<p>Square Online is the website part of Square. It has a free plan, and it is the easiest choice if you already use a Square card reader or register in person, because your items and stock stay in sync. Card payments cost Square's normal processing fees. Check Square's site for current terms.</p>` +
    h2("Which file to use") +
    filesToUse(
      summary,
      doc,
      [{ path: IMPORT_PATHS.square, what: "your products as a Square item library." }],
      "Square",
    );
  if (has) {
    body +=
      h2("Import your items") +
      ol([
        "Create your Square account and log in to the Square Dashboard.",
        "Go to <strong>Items</strong> (it may be called <strong>Items &amp; services</strong>, <strong>Items &amp; menus</strong> or <strong>Items &amp; inventory</strong>), then <strong>Items</strong>, then <strong>Item library</strong>.",
        "Click <strong>Actions</strong>, then <strong>Import library</strong>.",
        `Drag ${link(doc, IMPORT_PATHS.square, "items.csv")} into the upload area, or click <strong>Browse file</strong>, then click <strong>Next</strong>.`,
        "Check that each column matches the right item detail, then click <strong>Next</strong>.",
        "Wait a few minutes. If you see no error message, it worked. If you see errors, you can accept Square's suggested fixes or fix the file and upload it again.",
      ]) +
      callout(
        "<p>If Square asks whether to add to your library or replace it, choose to add or update. Replacing deletes the items you already have in Square.</p>",
        "warn",
      ) +
      callout(
        "<p>If Square complains about the columns, download Square's own blank template from the same <strong>Import library</strong> screen. Copy the information from our file into it, column by column, and upload that instead.</p>",
        "tip",
      ) +
      `<p><strong>Square's import does not bring in pictures or stock counts.</strong> After importing, add each item's picture, and set how many you have in stock in the Dashboard. Your stock numbers are in the products spreadsheet in the ${folder(SITE_EXPORT_DIRS.spreadsheets)} folder.</p>`;
  }
  body +=
    photosSection(
      summary,
      `<p><strong>Square's item import does not bring in pictures.</strong> After importing, open each item in Square and upload its picture from the ${folder("Photos/Products")} folder.</p>`,
      has,
    ) +
    byHandSection(summary, doc, [
      "<strong>Tax rates and modifiers.</strong> Square's import does not carry these over. Create them in the Dashboard.",
      "<strong>Blog.</strong> Square Online has no blog import. Paste each post from the Blog folder into a new page if you want to keep them.",
    ]) +
    nextStepsSection(doc) +
    stampCheckedNote();
  return guideFile(doc, "Moving to Square Online", summary, body, "Free to start. Easiest if you already use Square in person.");
}
