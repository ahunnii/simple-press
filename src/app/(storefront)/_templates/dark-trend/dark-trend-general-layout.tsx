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
};

export function DarkTrendGeneralLayout({
  children,
  title,
  productsCount,
  excerpt,
  parentBreadcrumb,
  topContent,
}: Props) {
  return (
    <div className="flex-1 px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="my-20 w-full space-y-4">
          <Breadcrumb className="mx-auto w-full">
            <BreadcrumbList className="mx-auto w-full flex-wrap justify-center text-center">
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
                <BreadcrumbPage className="max-w-[min(100%,28rem)] truncate font-semibold text-purple-500">
                  {title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {topContent ? (
            <div className="mx-auto max-w-4xl pt-2">{topContent}</div>
          ) : null}

          <h1 className="mb-2 text-center text-4xl font-bold text-white lg:text-7xl">
            {title}
          </h1>

          {productsCount && (
            <p className="text-center text-gray-600">
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
