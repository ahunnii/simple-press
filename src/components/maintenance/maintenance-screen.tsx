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
      <meta name="robots" content="noindex" />
      <div className="bg-background flex min-h-dvh flex-col items-center justify-center px-4">
        <main className="flex max-w-lg flex-col items-center text-center">
          {businessName && (
            <p className="text-muted-foreground mb-4 text-sm font-medium uppercase tracking-widest">
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
