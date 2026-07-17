import { Info } from "lucide-react";

const POLICY_SLUGS = new Set(["privacy-policy", "terms-of-service"]);

export function PlatformPolicyNotice({ slug }: { slug: string }) {
  if (!POLICY_SLUGS.has(slug)) return null;

  const domain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "";
  const baseUrl = domain ? `https://${domain}` : "";

  return (
    <div className="bg-muted/50 mt-12 rounded-lg border p-4">
      <div className="flex gap-3">
        <Info className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
        <div className="text-muted-foreground text-sm">
          <p className="text-foreground font-medium">Powered by SimplePress</p>
          <p className="mt-1">
            This store is hosted on the SimplePress platform, operated by{" "}
            <strong>Center for Generative Justice LLC</strong>. Your use of this
            store is also subject to the SimplePress{" "}
            <a
              href={`${baseUrl}/platform/policies/terms-of-service`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href={`${baseUrl}/platform/policies/privacy-policy`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
