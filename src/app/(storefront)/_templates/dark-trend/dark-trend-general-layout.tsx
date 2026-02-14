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
};

export function DarkTrendGeneralLayout({
  children,
  title,
  productsCount,
  excerpt,
}: Props) {
  return (
    <div className="flex-1 px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="my-20 w-full space-y-4">
          <Breadcrumb className="mx-auto w-full">
            <BreadcrumbList className="mx-auto w-full justify-center text-center">
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/"
                  className="text-white/80 hover:text-white"
                >
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/60" />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-purple-500">
                  {title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

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
