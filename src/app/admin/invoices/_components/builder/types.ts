import type { z } from "zod";

import type { invoiceDraftSchema } from "~/lib/validators/invoice";

/**
 * The invoice builder's react-hook-form values — the `zodResolver`'s INPUT
 * type, not its parsed output. `new/page.tsx` and `[id]/edit/page.tsx` build
 * this shape server-side (from settings defaults, or from `getById`) so the
 * client component never has to know about either source.
 */
export type InvoiceBuilderValues = z.input<typeof invoiceDraftSchema>;
