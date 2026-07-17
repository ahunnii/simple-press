import { Fragment } from "react";

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

import { CommandPaletteTrigger } from "./command-palette-trigger";

type Props = {
  breadcrumbs: {
    label: string;
    href?: string;
  }[];
};

export function TrailHeader({ breadcrumbs }: Props) {
  const hasCrumbs = breadcrumbs.length > 0;

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
              {hasCrumbs ? (
                <BreadcrumbLink href="/admin/dashboard">
                  Dashboard
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {hasCrumbs && <BreadcrumbSeparator />}
            {breadcrumbs.map((breadcrumb) =>
              breadcrumb.href ? (
                <Fragment key={breadcrumb.label}>
                  <BreadcrumbItem key={breadcrumb.label}>
                    <BreadcrumbLink href={breadcrumb.href}>
                      {breadcrumb.label}
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

        <div className="ml-auto flex items-center gap-2">
          <CommandPaletteTrigger />
        </div>
      </div>
    </header>
  );
}
