"use client";

import Link from "next/link";
import { FileText, Home, Shield, Wrench } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export function SettingsDashboard() {
  return (
    <>
      {/* Main Content Sections */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* General */}
        <Link href="/admin/settings/general">
          <Card className="h-full cursor-pointer transition-all hover:border-slate-500 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-3">
                  <Home className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <CardTitle>General</CardTitle>
                  <CardDescription>
                    Name, email, address, tax ID
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Edit general settings for your business
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Integrations */}
        <Link href="/admin/settings/integrations">
          <Card className="h-full cursor-pointer transition-all hover:border-purple-500 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 p-3">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Integrations</CardTitle>
                    <CardDescription>
                      Payment gateways, email marketing, analytics, and more.
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-gray-600">
                Connect your business to third-party services
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Domain */}
        <Link href="/admin/settings/domain">
          <Card className="h-full cursor-pointer transition-all hover:border-orange-500 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-3">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Domain</CardTitle>
                  <CardDescription>
                    Your business domain and custom domain
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-gray-600">
                Manage your business domain and custom domain
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Features */}
        <Link href="/admin/settings/features">
          <Card className="h-full cursor-pointer transition-all hover:border-indigo-500 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-100 p-3">
                  <Wrench className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <CardTitle>Features</CardTitle>
                  <CardDescription>Fine tune your business</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-gray-600">
                Enable or disable features for your business
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}
