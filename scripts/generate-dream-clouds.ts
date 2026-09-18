/**
 * generate-dream-clouds.ts
 *
 * Bakes the "dream" template's cloud sprites from scripts/dream-clouds/clouds.html
 * (an SVG shaded-sphere recipe) into transparent WebP files under
 * public/templates/dream/clouds/, and converts the bundled fallback logo to WebP.
 *
 * Runtime never touches SVG filters — the storefront animates these sprites with
 * transform-only keyframes (see docs/templates/dream/design.md → Motion).
 *
 * Run:  pnpm exec tsx scripts/generate-dream-clouds.ts
 * Deterministic: the recipe uses seeded noise, so re-running reproduces the files.
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECIPE = path.join(ROOT, "scripts/dream-clouds/clouds.html");
const OUT_DIR = path.join(ROOT, "public/templates/dream/clouds");
const LOGO_SRC = path.join(ROOT, "docs/templates/dream/references/dream-your-theme-logo-transparent.png");
const LOGO_WIDTH = 1000;
const LOGO_WEBP = path.join(ROOT, "public/templates/dream/images/logo.webp");
const QUALITY = 0.85;

/** Map recipe stage ids to shipped file names. */
function fileNameFor(id: string): string {
  if (id.startsWith("w")) return `wisp-${id.slice(1)}.webp`;
  return `cloud-${id}.webp`;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1700, height: 1200 },
    deviceScaleFactor: 1,
  });
  await page.goto(`file://${RECIPE}`);
  await page.waitForTimeout(500);
  // Element screenshots keep ancestor backgrounds — clear them so the
  // sprites are truly transparent.
  await page.evaluate(() => {
    document.body.style.background = "transparent";
    const sky = document.getElementById("sky");
    if (sky) sky.style.background = "none";
    document.querySelectorAll(".label").forEach((el) => el.remove());
  });

  const stages = await page.locator(".stage").all();
  let total = 0;
  for (const stage of stages) {
    const id = (await stage.getAttribute("data-id")) ?? "unknown";
    const png = await stage.screenshot({ omitBackground: true, type: "png" });
    // These are decorative, blurred/animated-on-transform sprites — the
    // native render resolution (up to 1400px wide) is far above what any
    // preset displays them at (≤960px, mostly ≤760px), so downscale before
    // WebP encoding to hit the sprite-budget contract without touching the
    // recipe's shape/alpha work. Soft (already-blurred) and wisp sprites
    // tolerate more downscale than the sharp near-layer clouds.
    const maxWidth = id.startsWith("w") ? 900 : id.endsWith("-soft") ? 750 : 1000;
    const webp = await pngToWebp(page, png, QUALITY, maxWidth);
    const file = path.join(OUT_DIR, fileNameFor(id));
    writeFileSync(file, webp);
    total += webp.length;
    console.log(`${fileNameFor(id)}  ${(webp.length / 1024).toFixed(0)} KB`);
  }

  const logoWebp = await pngToWebp(page, readFileSync(LOGO_SRC), 0.88, LOGO_WIDTH);
  writeFileSync(LOGO_WEBP, logoWebp);
  console.log(`logo.webp  ${(logoWebp.length / 1024).toFixed(0)} KB`);
  console.log(`clouds total  ${(total / 1024).toFixed(0)} KB`);
  await browser.close();
}

/** Chromium encodes WebP-with-alpha via canvas — no sharp/cwebp needed. */
async function pngToWebp(
  page: import("@playwright/test").Page,
  png: Buffer,
  quality = QUALITY,
  maxWidth?: number,
): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    async ([b64, q, w]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const scale = w ? Math.min(1, Number(w) / img.width) : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/webp", Number(q));
    },
    [png.toString("base64"), String(quality), maxWidth ? String(maxWidth) : ""] as const,
  );
  return Buffer.from(dataUrl.split(",")[1] ?? "", "base64");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
