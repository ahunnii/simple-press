/**
 * Older gallery uploads (before June 2026) stored the upload's FILE NAME as the
 * image's alt text ("download-9.png"), and store transfers carried those into
 * other stores. Current uploads store "". A file name is not a description, so
 * everywhere alt text is read or scored, a file-name-looking value is treated as
 * missing. There is no data migration; this is the read-side rule.
 */

const IMAGE_EXTENSION =
  /\.(?:png|jpe?g|webp|gif|avif|heic|heif|svg|bmp|tiff?)$/i;

/**
 * True when the trimmed value has no whitespace and ends in an image extension
 * ("download-9.png", "IMG_1234.JPG"). Anything with a space is real prose.
 */
export function isFilenameAltText(alt: string | null | undefined): boolean {
  if (typeof alt !== "string") return false;
  const value = alt.trim();
  if (value === "") return false;
  if (/\s/.test(value)) return false;
  return IMAGE_EXTENSION.test(value);
}

/**
 * The alt text worth showing or counting: the trimmed value, or `null` when it
 * is empty, whitespace, or just a file name.
 */
export function meaningfulAltText(
  alt: string | null | undefined,
): string | null {
  if (typeof alt !== "string") return null;
  const value = alt.trim();
  if (value === "" || isFilenameAltText(value)) return null;
  return value;
}
