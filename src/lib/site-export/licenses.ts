/**
 * "Download your site" export — license files.
 *
 * Ships the AGPL-3.0 text next to a plain-language NOTICE so the owner knows
 * which parts of the export are theirs and which parts SimplePress licenses.
 * The LICENSE file is read from the repo root at runtime; if it is missing
 * (e.g. a trimmed deploy), a one-line pointer to the canonical text is used.
 */
import fs from "node:fs";
import path from "node:path";

import type { SiteExportBusiness, SiteExportFile } from "./types";

import { SITE_EXPORT_DIRS } from "./types";

const LICENSE_FALLBACK =
  "GNU Affero General Public License v3.0 — full text: https://www.gnu.org/licenses/agpl-3.0.txt";

const PLATFORM_SUPPORT_EMAIL = "csdt@generativejustice.org";

const NOTICE_WIDTH = 80;

async function readLicenseText(): Promise<string> {
  try {
    return await fs.promises.readFile(
      path.join(process.cwd(), "LICENSE"),
      "utf8",
    );
  } catch {
    return LICENSE_FALLBACK;
  }
}

/** Greedy word wrap. Words longer than the width are left intact. */
function wrap(text: string, width: number = NOTICE_WIDTH): string {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

function buildNotice(business: SiteExportBusiness): string {
  const exportDate = business.exportedAt.toISOString().slice(0, 10);
  const paragraphs = [
    `This export was created from ${business.name}'s SimplePress site on ${exportDate}.`,
    `Your content belongs to you: the text, photos, videos, products, and customer and order records in this export are ${business.name}'s. Use them however you like.`,
    `SimplePress software and templates: SimplePress (including its website templates, page designs, styles and code) is Copyright (C) 2026 Andrew Alvarez and is free software licensed under the GNU Affero General Public License, version 3 (AGPL-3.0-only) — see LICENSE-AGPL-3.0.txt. You may reuse, study, change and share template code and designs under those terms; if you run a modified version as a public website or service, the AGPL asks you to offer its source code to its users.`,
    `Fonts: fonts used by SimplePress templates come from Google Fonts and are licensed under the SIL Open Font License 1.1 (https://openfontlicense.org) or Apache 2.0 — free to use on your new site.`,
    `Images in "Photos/Template & stock images": these were shown on your site but were not uploaded by you (template sample photos or images from other websites). Check that you have the right to reuse them before publishing them elsewhere.`,
    `SimplePress is operated by the Center for Generative Justice. Questions: ${PLATFORM_SUPPORT_EMAIL}`,
  ];
  return `${paragraphs.map((p) => wrap(p)).join("\n\n")}\n`;
}

/**
 * Build the `Licenses/` folder: the AGPL-3.0 license text and a NOTICE.txt
 * describing who owns what in this export.
 */
export async function buildLicenseFiles(
  business: SiteExportBusiness,
): Promise<SiteExportFile[]> {
  const dir = SITE_EXPORT_DIRS.licenses;
  return [
    {
      path: `${dir}/LICENSE-AGPL-3.0.txt`,
      contents: await readLicenseText(),
    },
    {
      path: `${dir}/NOTICE.txt`,
      contents: buildNotice(business),
    },
  ];
}
