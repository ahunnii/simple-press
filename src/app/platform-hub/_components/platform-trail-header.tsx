import { Fragment } from "react";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";

type Props = {
  breadcrumbs: {
    label: string;
    href?: string;
  }[];
};

export function PlatformTrailHeader({ breadcrumbs }: Props) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/users">Platform Admin</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {breadcrumbs.map((breadcrumb) =>
              breadcrumb.href ? (
                <Fragment key={breadcrumb.label}>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </Fragment>
              ) : (
                <BreadcrumbItem key={breadcrumb.label}>
                  <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                </BreadcrumbItem>
              ),
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
