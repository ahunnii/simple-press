export function getStoredPath(file: {
  objectInfo?: {
    key?: string;
    path?: string;
    metadata?: { pathname?: string; pathName?: string };
  };
}): string {
  const meta = file.objectInfo?.metadata as Record<string, string> | undefined;
  return meta?.pathname ?? meta?.pathName ?? "";
}
