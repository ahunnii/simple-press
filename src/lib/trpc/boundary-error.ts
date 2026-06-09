const PREFIX = "__SP_TRPC__" as const;

export function formatTrpcErrorForBoundary(
  code: string,
  message: string,
): string {
  return `${PREFIX}${JSON.stringify({ code, message })}`;
}

export function parseTrpcFromBoundaryMessage(
  message: string,
): { code: string; message: string } | null {
  if (!message.startsWith(PREFIX)) return null;
  try {
    const data = JSON.parse(message.slice(PREFIX.length)) as {
      code?: unknown;
      message?: unknown;
    };
    if (typeof data.code === "string" && typeof data.message === "string") {
      return { code: data.code, message: data.message };
    }
  } catch {
    /* ignore malformed payload */
  }
  return null;
}
