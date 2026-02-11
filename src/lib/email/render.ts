import type { ReactElement } from "react";
import { render } from "@react-email/components";

// Helper to render email to HTML (for testing/preview)
export async function renderEmail(react: ReactElement): Promise<string> {
  return render(react);
}
