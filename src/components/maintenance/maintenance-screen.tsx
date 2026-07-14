type Props = {
  variant: "maintenance" | "coming_soon";
  message?: string | null;
  businessName?: string | null;
};

export function MaintenanceScreen({ variant, message, businessName }: Props) {
  const heading =
    variant === "coming_soon" ? "Coming soon" : "We'll be back soon";

  const subtext =
    variant === "coming_soon"
      ? "This shop is getting ready. Check back soon."
      : "This shop is temporarily undergoing maintenance. Please check back in a little while.";

  return (
    <>
      {/*
        React 19 (used by this app's Next 15 app-router build) hoists any
        <title>/<meta>/<link> tag rendered by a component — regardless of
        where in the tree it lives — into the document <head> at commit
        time. Previously this tag rendered visually inside <body> with no
        head-hoisting guarantee prior to React 19; Google only honors the
        robots meta tag when it resolves into <head>. Keeping it as a plain
        rendered <meta> here (rather than a `metadata` export) is
        intentional: MaintenanceScreen is shared by three different
        page/layout server components (src/app/page.tsx,
        src/app/admin/layout.tsx, src/app/(storefront)/layout.tsx) that are
        out of scope for this fix, so the tag travels with the component
        itself instead of requiring each call site to add its own
        `generateMetadata`/`metadata.robots`.
      */}
      <meta name="robots" content="noindex" />
      <div className="bg-background flex min-h-dvh flex-col items-center justify-center px-4">
        <main className="flex max-w-lg flex-col items-center text-center">
          {businessName && (
            <p className="text-muted-foreground mb-4 text-sm font-medium tracking-widest uppercase">
              {businessName}
            </p>
          )}
          <h1 className="text-foreground mb-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            {heading}
          </h1>
          <p className="text-muted-foreground max-w-md text-base leading-relaxed sm:text-lg">
            {subtext}
          </p>
          {message && (
            <p className="text-foreground/80 mt-4 max-w-md text-sm leading-relaxed">
              {message}
            </p>
          )}
        </main>
      </div>
    </>
  );
}
