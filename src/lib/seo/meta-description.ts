import { productDescriptionToPlainText } from "~/lib/product-description";

/**
 * Converts raw HTML/text to a meta description suitable for search results.
 * Returns undefined for empty input; truncates to max length with ellipsis.
 */
export function toMetaDescription(
  raw: string | null | undefined,
  max = 160,
): string | undefined {
  const plainText = productDescriptionToPlainText(raw);

  if (!plainText) return undefined;

  if (plainText.length <= max) return plainText;

  // Find the last space within max - 1 characters
  const truncated = plainText.substring(0, max - 1);
  const lastSpace = truncated.lastIndexOf(" ");

  // If there's no space, just cut at max - 1
  const cutPoint = lastSpace > 0 ? lastSpace : max - 1;
  let result = plainText.substring(0, cutPoint).trim();

  // Trim trailing punctuation: ,;:.-–—
  result = result.replace(/[,;:.\-–—]+$/, "");

  // Append ellipsis and ensure it doesn't exceed max
  result = result + "…";
  if (result.length > max) {
    result = plainText.substring(0, cutPoint - 1).trim();
    result = result.replace(/[,;:.\-–—]+$/, "");
    result = result + "…";
  }

  return result;
}
