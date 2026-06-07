/**
 * JsonLd — server-safe component for injecting schema.org JSON-LD structured data.
 *
 * Usage (in a server component):
 *   <JsonLd data={buildProductSchema(...)} />
 *   <JsonLd data={[buildOrganizationSchema(...), buildWebSiteSchema(...)]} />
 *
 * The script tag is rendered into the document body by Next.js App Router, which
 * is the recommended pattern for JSON-LD in Next.js 13+.
 */

interface JsonLdProps {
  // Accept a single schema object or an array of schema objects.
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLd({ data }: JsonLdProps) {
  // Escape "<" so tenant-supplied strings (e.g. a product name containing
  // "</script>") cannot break out of the script tag — a stored-XSS vector.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data requires dangerouslySetInnerHTML; content is escaped server-controlled schema.org data.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
