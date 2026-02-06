export function getStoredPath(file: {
  objectInfo?: {
    key?: string;
    path?: string;
    metadata?: { pathname?: string };
  };
}): string {
  return (
    file.objectInfo?.key ??
    (file.objectInfo as { path?: string })?.path ??
    file.objectInfo?.metadata?.pathname ??
    ""
  );
}
