/**
 * "Download your site" export — dev/QA CLI.
 *
 *   pnpm site-export <subdomain|slug|businessId|custom domain> [--out <dir>] [--zip]
 *   pnpm site-export <store> --into <dir> [--pictures "Website pictures"]
 *   pnpm site-export <store> --check   (look the store up, print it, exit)
 *   (= tsx --env-file=.env --env-file=.env.local scripts/site-export.ts …)
 *
 * Builds the same export the owner download produces (src/lib/site-export/
 * build.ts) and writes it to disk:
 *   default  → <out>/<Store> - Site Export - YYYY-MM-DD/   (unzipped folder)
 *   --zip    → <out>/<Store> - Site Export - YYYY-MM-DD.zip
 *   --into   → straight into <dir> (created if missing). Used by the
 *              sp-site-snapshot skill to build one handoff folder. Refuses to
 *              overwrite any file that already exists there.
 *   --pictures <folder> (with --into) → a folder already inside <dir>, e.g.
 *              the skill's "Website pictures"; START HERE and the hiring
 *              guide link its site-book.pdf / style-guide.pdf / index.html.
 * <out> defaults to the OS temp dir. An existing folder/zip of the same name is
 * never overwritten — " (2)", " (3)" … is appended instead.
 *
 * READ-ONLY: only reads the database and storage. Mind which DATABASE_URL the
 * env files point at (.env.local overrides .env).
 */
import { createWriteStream, existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

// The env files set NODE_ENV=development, which turns on Prisma's per-query
// logging and makes getBusinessUrl() emit *.localhost:3000 links (e.g. in the
// WordPress WXR). Run as "test" so the export matches what production
// produces. Must happen before ~/server/db loads, hence the dynamic imports.
if (process.env.NODE_ENV !== "production") {
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";
}

interface Args {
  target: string;
  out: string;
  zip: boolean;
  into: string | null;
  pictures: string | null;
  check: boolean;
}

function parseArgs(argv: string[]): Args {
  let target: string | undefined;
  let out = os.tmpdir();
  let zip = false;
  let into: string | null = null;
  let pictures: string | null = null;
  let check = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--zip") zip = true;
    else if (a === "--check") check = true;
    else if (a === "--into") {
      const v = argv[++i];
      if (!v) usage("--into needs a directory");
      into = v;
    } else if (a === "--pictures") {
      const v = argv[++i];
      if (!v) usage("--pictures needs a folder name");
      pictures = v;
    }
    else if (a === "--out") {
      const v = argv[++i];
      if (!v) usage("--out needs a directory");
      out = v;
    } else if (a.startsWith("--out=")) out = a.slice("--out=".length);
    else if (a === "-h" || a === "--help") usage();
    else if (a.startsWith("-")) usage(`Unknown option ${a}`);
    else if (!target) target = a;
    else usage(`Unexpected argument ${a}`);
  }
  if (!target) usage("Missing <subdomain|slug|businessId>");
  if (into && zip) usage("--into and --zip can't be combined");
  if (pictures && !into) usage("--pictures only works with --into");
  return {
    target,
    out: path.resolve(out),
    zip,
    into: into ? path.resolve(into) : null,
    pictures,
    check,
  };
}

function usage(error?: string): never {
  if (error) console.error(`Error: ${error}\n`);
  console.error(
    "Usage: pnpm site-export <subdomain|slug|businessId> [--out <dir>] [--zip]",
  );
  process.exit(error ? 1 : 0);
}

function freePath(base: string, ext = ""): string {
  let candidate = `${base}${ext}`;
  for (let n = 2; existsSync(candidate); n++) candidate = `${base} (${n})${ext}`;
  return candidate;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

/** START HERE entry for a pictures folder that already sits inside `into`. */
function picturesFolder(into: string, name: string) {
  const dir = path.join(into, name);
  if (!existsSync(dir)) usage(`--pictures folder not found: ${dir}`);
  const candidates = [
    { file: "site-book.pdf", label: "the site book (every page, desktop and phone)" },
    { file: "style-guide.pdf", label: "the style guide (colors, fonts, buttons)" },
    { file: "index.html", label: "the picture index" },
  ];
  return {
    dir: name,
    what: "Pictures of every page of your website on a computer and a phone, plus a style guide with your colors, fonts and buttons. Handy for showing a designer what your site looked like.",
    links: candidates
      .filter((c) => existsSync(path.join(dir, c.file)))
      .map((c) => ({ label: c.label, path: `${name}/${c.file}` })),
  };
}

const byteLength = (c: string | Uint8Array) =>
  typeof c === "string" ? Buffer.byteLength(c) : c.byteLength;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { db } = await import("~/server/db");
  const { buildSiteExport, zipSiteExportStream } = await import(
    "~/lib/site-export/build"
  );

  try {
    const business = await db.business.findFirst({
      where: {
        OR: [
          { id: args.target },
          { subdomain: args.target },
          { slug: args.target },
          { customDomain: args.target },
        ],
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        customDomain: true,
        templateId: true,
        status: true,
      },
    });
    if (!business) {
      console.error(`No business found for "${args.target}".`);
      process.exitCode = 1;
      return;
    }
    console.log(
      `${args.check ? "Found" : "Exporting"} ${business.name} (subdomain ${business.subdomain}, custom domain ${business.customDomain ?? "none"}, status ${business.status}, ${business.id}, template ${business.templateId})`,
    );

    if (args.check) return;

    const extraFolders = args.into && args.pictures
      ? [picturesFolder(args.into, args.pictures)]
      : undefined;

    const started = Date.now();
    const result = await buildSiteExport(business.id, {
      onProgress: (step) =>
        console.log(`  [${((Date.now() - started) / 1000).toFixed(1)}s] ${step}`),
      extraFolders,
    });

    const totalBytes = result.files.reduce(
      (sum, f) => sum + byteLength(f.contents),
      0,
    );
    await mkdir(args.out, { recursive: true });

    let written: string;
    if (args.into) {
      written = args.into;
      // Check every path first so a clash never leaves a half-written folder.
      for (const f of result.files) {
        const dest = path.join(written, ...f.path.split("/"));
        if (!dest.startsWith(written + path.sep)) {
          throw new Error(`Refusing to write outside the export: ${f.path}`);
        }
        if (existsSync(dest)) {
          throw new Error(
            `Refusing to overwrite ${dest} — use an empty folder (or one that only holds the pictures folder).`,
          );
        }
      }
      for (const f of result.files) {
        const dest = path.join(written, ...f.path.split("/"));
        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, f.contents);
      }
    } else if (args.zip) {
      written = freePath(
        path.join(args.out, result.filename.replace(/\.zip$/, "")),
        ".zip",
      );
      // Same streaming path the download route uses.
      await pipeline(
        Readable.fromWeb(
          zipSiteExportStream(result.files) as Parameters<
            typeof Readable.fromWeb
          >[0],
        ),
        createWriteStream(written),
      );
      console.log(`\nZip: ${formatBytes(statSync(written).size)}`);
    } else {
      written = freePath(
        path.join(args.out, result.filename.replace(/\.zip$/, "")),
      );
      for (const f of result.files) {
        const dest = path.join(written, ...f.path.split("/"));
        if (!dest.startsWith(written + path.sep)) {
          throw new Error(`Refusing to write outside the export: ${f.path}`);
        }
        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, f.contents);
      }
    }

    const s = result.summary;
    const folders = new Map<string, number>();
    for (const f of result.files) {
      const top = f.path.includes("/") ? f.path.split("/")[0]! : "(root)";
      folders.set(top, (folders.get(top) ?? 0) + 1);
    }

    console.log(`\nWrote ${written}`);
    console.log(
      `${result.files.length} files, ${formatBytes(totalBytes)} uncompressed, ${((Date.now() - started) / 1000).toFixed(1)}s`,
    );
    console.log("\nFiles per folder:");
    for (const [name, n] of folders) console.log(`  ${name.padEnd(16)} ${n}`);
    console.log("\nCounts:");
    for (const [k, v] of Object.entries(s.counts))
      console.log(`  ${k.padEnd(16)} ${v}`);
    console.log("\nSpreadsheets:");
    for (const sh of s.spreadsheets) console.log(`  ${sh.path} (${sh.rows} rows)`);
    console.log(`\nImport files: ${s.importFiles.join(", ") || "(none)"}`);
    console.log(
      `External images: ${s.externalImages.length} (${s.externalImages.filter((e) => e.zipPath).length} saved)`,
    );
    console.log(`Stripe: ${s.hasStripe}  Custom domain: ${s.hasCustomDomain}`);
    console.log(`\nNotes (${s.notes.length}):`);
    for (const n of s.notes) console.log(`  [${n.level}] ${n.message}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
