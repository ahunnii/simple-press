"use client";

import Link from "next/link";
import {
  BarChart2,
  Clock,
  CreditCard,
  ExternalLink,
  Eye,
  MousePointerClick,
  ShoppingBag,
  ShoppingCart,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  UmamiMetricRow,
  UmamiPageviewSeries,
  UmamiStats,
} from "~/lib/umami/client";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";

// ─── Stat cards ───────────────────────────────────────────────────────────────

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
};

function StatCard({ label, value, icon, sub }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Metric table ─────────────────────────────────────────────────────────────

function MetricTable({
  title,
  rows,
  label,
}: {
  title: string;
  rows: UmamiMetricRow[];
  label: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No data for this period
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pb-2">{label}</TableHead>
                <TableHead className="pb-2 text-right">Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell
                    className="max-w-[240px] truncate py-2 pr-4 font-mono text-xs"
                    title={row.x || "(direct)"}
                  >
                    {row.x || "(direct)"}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    {row.y.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Commerce events section ──────────────────────────────────────────────────

function EventsSection({
  commerce,
  rows,
}: {
  commerce: EventsCommerceStats;
  rows: UmamiMetricRow[];
}) {
  // Other events beyond the known commerce events
  const KNOWN = new Set([
    "add-to-cart",
    "begin-checkout",
    "product-view",
    "purchase",
  ]);
  const otherRows = rows.filter((r) => !KNOWN.has(r.x));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Commerce Events</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Product Views"
          value={commerce.productView.toLocaleString()}
          icon={<Eye className="h-4 w-4 text-blue-500" />}
          sub="product-view events"
        />
        <StatCard
          label="Add to Cart"
          value={commerce.addToCart.toLocaleString()}
          icon={<ShoppingCart className="h-4 w-4 text-green-500" />}
          sub="add-to-cart events"
        />
        <StatCard
          label="Checkout Started"
          value={commerce.beginCheckout.toLocaleString()}
          icon={<ShoppingBag className="h-4 w-4 text-purple-500" />}
          sub="begin-checkout events"
        />
        <StatCard
          label="Purchases"
          value={commerce.purchase.toLocaleString()}
          icon={<CreditCard className="h-4 w-4 text-emerald-500" />}
          sub="purchase events"
        />
      </div>

      {otherRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Custom Events</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pb-2">Event</TableHead>
                  <TableHead className="pb-2 text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="py-2 pr-4 font-mono text-xs">
                      {row.x}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      {row.y.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Embed engagement section ─────────────────────────────────────────────────

function EmbedEngagementSection({
  engagements,
  dwellSessions,
}: {
  engagements: number;
  dwellSessions: number;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Embed Engagement</h2>
      <p className="text-muted-foreground text-sm">
        Tracks visitor interactions with third-party embedded widgets (e.g.
        booking forms). Due to browser cross-origin security, only click-ins and
        approximate dwell time can be measured — exact in-frame activity is not
        accessible to the parent page.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Embed Click-Ins"
          value={engagements.toLocaleString()}
          icon={<ExternalLink className="h-4 w-4 text-indigo-500" />}
          sub="Times a visitor clicked into an embed"
        />
        <StatCard
          label="Dwell Sessions"
          value={dwellSessions.toLocaleString()}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          sub={
            "Times a visitor clicked back out (approximate — may over-count due to tab switching)"
          }
        />
      </div>
      {dwellSessions > 0 && (
        <p className="text-muted-foreground text-xs">
          <strong>Note:</strong> Dwell session counts are approximate. Window
          focus/blur events also fire when visitors switch browser tabs, so the
          count above may be higher than actual embed engagement sessions.
          Sessions exceeding 30 minutes are discarded automatically.
        </p>
      )}
    </div>
  );
}

// ─── Empty / not-configured state ────────────────────────────────────────────

function NotConfiguredState() {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-blue-500" />
          Analytics not connected
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">
          Analytics data is not available because Umami tracking has not been
          configured for your storefront. Connect your Umami website ID and
          enable tracking in your settings.
        </p>
        <Link
          href="/admin/settings/integrations"
          className="text-primary text-sm underline-offset-4 hover:underline"
        >
          Go to Settings &rarr; Integrations
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── Full analytics content ───────────────────────────────────────────────────

type OverviewResult =
  | { configured: false }
  | {
      configured: true;
      stats: UmamiStats;
      active: { visitors: number };
      pageviewsSeries: UmamiPageviewSeries;
    };

type PagesResult =
  | { configured: false }
  | { configured: true; rows: UmamiMetricRow[] };

type ReferrersResult =
  | { configured: false }
  | { configured: true; rows: UmamiMetricRow[] };

type EventsCommerceStats = {
  addToCart: number;
  beginCheckout: number;
  productView: number;
  purchase: number;
};

type EventsResult =
  | { configured: false }
  | { configured: true; rows: UmamiMetricRow[]; commerce: EventsCommerceStats };

type EmbedEngagementResult =
  | { configured: false }
  | { configured: true; engagements: number; dwellSessions: number };

type AnalyticsContentProps = {
  overview: OverviewResult;
  topPages: PagesResult;
  topReferrers: ReferrersResult;
  events: EventsResult;
  embedEngagement: EmbedEngagementResult;
};

function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function AnalyticsContent({
  overview,
  topPages,
  topReferrers,
  events,
  embedEngagement,
}: AnalyticsContentProps) {
  if (!overview.configured) {
    return (
      <div className="grid gap-6">
        <NotConfiguredState />
      </div>
    );
  }

  const { stats, active, pageviewsSeries } = overview;

  // Build chart data from pageviews series
  const chartData = pageviewsSeries.pageviews.map((pt) => ({
    date: pt.x,
    pageviews: pt.y,
  }));

  // Bounce rate as percentage (bounces / visits, rounded)
  const bounceRate =
    stats.visits > 0
      ? `${Math.round((stats.bounces / stats.visits) * 100)}%`
      : "—";

  // Average time on site in seconds
  const avgTime =
    stats.visits > 0
      ? formatSeconds(Math.round(stats.totaltime / stats.visits))
      : "—";

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Visitors"
          value={stats.visitors.toLocaleString()}
          icon={<Users className="h-4 w-4 text-blue-500" />}
          sub={`${active.visitors} active now`}
        />
        <StatCard
          label="Pageviews"
          value={stats.pageviews.toLocaleString()}
          icon={<Eye className="h-4 w-4 text-green-500" />}
        />
        <StatCard
          label="Bounce Rate"
          value={bounceRate}
          icon={<MousePointerClick className="h-4 w-4 text-orange-500" />}
          sub="Bounces / visits"
        />
        <StatCard
          label="Avg. Time on Site"
          value={avgTime}
          icon={<Clock className="h-4 w-4 text-purple-500" />}
          sub="Per visit"
        />
      </div>

      {/* Pageviews chart */}
      <Card>
        <CardHeader>
          <CardTitle>Pageviews</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="py-12 text-center">
              <BarChart2 className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
              <p className="text-muted-foreground text-sm">
                No pageview data for this period
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="colorPageviews"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    "Pageviews",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pageviews"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#colorPageviews)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top pages + referrers */}
      <div className="grid gap-6 lg:grid-cols-2">
        {topPages.configured ? (
          <MetricTable title="Top Pages" rows={topPages.rows} label="URL" />
        ) : (
          <NotConfiguredState />
        )}
        {topReferrers.configured ? (
          <MetricTable
            title="Top Referrers"
            rows={topReferrers.rows}
            label="Referrer"
          />
        ) : (
          <NotConfiguredState />
        )}
      </div>

      {/* Commerce events */}
      {events.configured ? (
        <EventsSection commerce={events.commerce} rows={events.rows} />
      ) : null}

      {/* Embed engagement */}
      {embedEngagement.configured ? (
        <EmbedEngagementSection
          engagements={embedEngagement.engagements}
          dwellSessions={embedEngagement.dwellSessions}
        />
      ) : null}
    </div>
  );
}
