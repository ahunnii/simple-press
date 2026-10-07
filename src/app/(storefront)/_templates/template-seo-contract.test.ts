import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Template SEO Contract Guard Test
 *
 * Enforces B1.8 (Crawlable listings) and B1.9 (SEO lives in routes):
 * - B1.9: no file emits JSON-LD (application/ld+json) or imports JsonLd component
 * - B1.8: every file using pagination must use pageLinkProps, not button onClick handlers
 */

const TEMPLATES_DIR = resolve(__dirname);

/**
 * Check if content contains JSON-LD (B1.9)
 */
function hasJsonLd(content: string): boolean {
  return (
    content.includes("application/ld+json") ||
    /from ['"].*JsonLd['"]|import.*JsonLd/.test(content)
  );
}

/**
 * Check if content uses pagination (B1.8)
 */
function hasPagination(content: string): boolean {
  return (
    content.includes("usePageParam(") ||
    content.includes("PAGE_SIZE") ||
    /useShopFilters\([^)]*pageSize/.test(content)
  );
}

/**
 * Check if content uses pageSize in useShopFilters (B1.8)
 */
function hasPageSizeInFilters(content: string): boolean {
  return /useShopFilters\([^)]*pageSize/.test(content);
}

/**
 * Check if content has pageLinkProps (B1.8)
 */
function hasPagingLinkProps(content: string): boolean {
  return content.includes("pageLinkProps");
}

/**
 * Check if content has button onClick pagers (B1.8 - fail condition)
 */
function hasButtonOnClickPager(content: string): boolean {
  return /<button[^>]*onClick=\{\(\)\s*=>\s*(handlePage|goToPage)\(/s.test(
    content,
  );
}

/**
 * Unit tests for detection functions using inline sample code
 */
describe("template-seo-detection functions", () => {
  it("detects JSON-LD string literal", () => {
    const sample = 'const schema = "application/ld+json"';
    expect(hasJsonLd(sample)).toBe(true);
  });

  it("detects JsonLd import", () => {
    const sample = 'import { JsonLd } from "~/components/json-ld"';
    expect(hasJsonLd(sample)).toBe(true);
  });

  it("passes code without JSON-LD", () => {
    const sample = "export function MyComponent() { return <div>Hello</div> }";
    expect(hasJsonLd(sample)).toBe(false);
  });

  it("detects usePageParam call", () => {
    const sample = "const { page } = usePageParam()";
    expect(hasPagination(sample)).toBe(true);
  });

  it("detects useShopFilters with pageSize", () => {
    const sample =
      "const { products } = useShopFilters(items, { pageSize: 12 })";
    expect(hasPageSizeInFilters(sample)).toBe(true);
  });

  it("detects pageLinkProps usage", () => {
    const sample = "<a {...pageLinkProps(2)}>Page 2</a>";
    expect(hasPagingLinkProps(sample)).toBe(true);
  });

  it("detects button onClick pager (violation)", () => {
    const sample = "<button onClick={() => handlePage(2)}>Page 2</button>";
    expect(hasButtonOnClickPager(sample)).toBe(true);
  });

  it("passes link-based pager", () => {
    const sample = '<a href="?page=2">Page 2</a>';
    expect(hasButtonOnClickPager(sample)).toBe(false);
  });
});

/**
 * Scan all template files for B1.8 and B1.9 violations
 */
describe("B1.8 & B1.9 contract compliance", () => {
  it("no template files emit JSON-LD (B1.9)", async () => {
    const violations: string[] = [];

    async function scanDir(dir: string): Promise<void> {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return; // skip inaccessible dirs
      }

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Skip test files, node_modules, hidden dirs
        if (
          entry.name.endsWith(".test.ts") ||
          entry.name.endsWith(".test.tsx") ||
          entry.name.startsWith(".") ||
          entry.name === "node_modules"
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          try {
            const content = await fs.readFile(fullPath, "utf-8");
            if (hasJsonLd(content)) {
              violations.push(`${fullPath}: contains JSON-LD`);
            }
          } catch {
            // skip unreadable files
          }
        }
      }
    }

    await scanDir(TEMPLATES_DIR);
    expect(
      violations,
      `B1.9 violation: Templates must not emit JSON-LD:\n${violations.join("\n")}`,
    ).toEqual([]);
  });

  it("pagination files use pageLinkProps, not button onClick (B1.8)", async () => {
    const violations: string[] = [];

    async function scanDir(dir: string): Promise<void> {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (
          entry.name.endsWith(".test.ts") ||
          entry.name.endsWith(".test.tsx") ||
          entry.name.startsWith(".") ||
          entry.name === "node_modules"
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          try {
            const content = await fs.readFile(fullPath, "utf-8");

            // Only check files that use pagination
            if (hasPagination(content)) {
              // If it uses useShopFilters with pageSize, must have pageLinkProps
              if (hasPageSizeInFilters(content)) {
                if (!hasPagingLinkProps(content)) {
                  violations.push(
                    `${fullPath}: uses useShopFilters with pageSize but no pageLinkProps`,
                  );
                }
              }

              // If it uses usePageParam, must have pageLinkProps
              if (
                content.includes("usePageParam(") &&
                !hasPagingLinkProps(content)
              ) {
                violations.push(
                  `${fullPath}: uses usePageParam but no pageLinkProps`,
                );
              }

              // Never use button onClick for pagers
              if (hasButtonOnClickPager(content)) {
                violations.push(`${fullPath}: uses button onClick pager`);
              }
            }
          } catch {
            // skip unreadable files
          }
        }
      }
    }

    await scanDir(TEMPLATES_DIR);
    expect(
      violations,
      `B1.8 violation: Pagination must use pageLinkProps links, not button onClick:\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});
