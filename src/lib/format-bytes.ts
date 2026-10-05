/** Human-readable byte size: "0 B", "512 B", "1.5 KB", "12.3 MB", "2.0 GB". */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const val = bytes / Math.pow(1024, i);
  return `${i === 0 ? val.toString() : val.toFixed(1)} ${units[i] ?? "B"}`;
}
