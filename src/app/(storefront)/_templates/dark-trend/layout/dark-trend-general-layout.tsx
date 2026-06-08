import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

type Props = {
  children: React.ReactNode;
  title: string;
  productsCount?: number;
  excerpt?: string;
  /** When set, breadcrumb is Home → parent → current title (e.g. blog post). */
  parentBreadcrumb?: { label: string; href: string };
  /** Renders after the breadcrumb, before the main title (e.g. back link + date). */
  topContent?: React.ReactNode;
  /** Spread on the header block for the preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function DarkTrendGeneralLayout({
  children,
  title,
  productsCount,
  excerpt,
  parentBreadcrumb,
  topContent,
  sectionAttrs,
}: Props) {
  return (
    <div className="flex-1 px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="my-14 w-full space-y-4" {...sectionAttrs}>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/"
                  className="text-white/80 hover:text-white"
                >
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/60" />
              {parentBreadcrumb ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href={parentBreadcrumb.href}
                      className="text-white/80 hover:text-white"
                    >
                      {parentBreadcrumb.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-white/60" />
                </>
              ) : null}
              <BreadcrumbItem>
                {/* S-11: purple-500 (#A855F7) ≈4.4:1 on dark bg; purple-400 (#C084FC) ≈6.5:1 */}
                <BreadcrumbPage className="max-w-[min(100%,28rem)] truncate font-semibold text-purple-400">
                  {title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {topContent ? (
            <div className="max-w-4xl pt-2">{topContent}</div>
          ) : null}

          <h1 className="mb-2 text-left text-4xl font-bold text-white lg:text-7xl">
            {title}
          </h1>

          {productsCount && (
            // S-11: gray-600 (#4B5563) ≈2.2:1 on dark bg — swap to white/60 (≈5.7:1)
            <p className="text-center text-white/60">
              {productsCount} product
              {productsCount !== 1 ? "s" : ""}
            </p>
          )}
          {excerpt && (
            <p className="text-center text-xl text-white/80">{excerpt}</p>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
