import { env } from "~/env";

// IndexNow key location. One platform key serves every tenant host;
// keyLocation = <canonical base>/indexnow-key.txt
export const runtime = "nodejs";

export async function GET() {
  if (!env.INDEXNOW_KEY) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(env.INDEXNOW_KEY, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
