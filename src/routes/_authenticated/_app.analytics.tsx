import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/sellerflow/page-header";
import {
  BarChart,
  KpiCard,
  KpiSkeletonRow,
  Panel,
  StateBlock,
} from "@/components/sellerflow/primitives";
import { Button } from "@/components/ui/button";
import { channelDotClass, money } from "@/lib/sellerflow-data";
import { computeAnalytics } from "@/lib/sellerflow-metrics";
import { useSellerFlow } from "@/lib/sellerflow-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — SellerFlow BD" },
      {
        name: "description",
        content:
          "See which channels, products and districts drive profitable growth for your Bangladesh online store.",
      },
      { property: "og:title", content: "Analytics — SellerFlow BD" },
      {
        property: "og:description",
        content: "Revenue trends, return rate and channel performance at a glance.",
      },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  const { orders, customers, isLoading, isError, error, refetch } = useSellerFlow();
  const a = computeAnalytics(orders, customers);

  if (isLoading) return <AnalyticsShell><KpiSkeletonRow /></AnalyticsShell>;

  if (isError)
    return (
      <AnalyticsShell>
        <StateBlock
          tone="error"
          title="Could not load analytics"
          body={error?.message ?? "Please try again."}
          action={
            <Button variant="outline" onClick={refetch}>
              Retry
            </Button>
          }
        />
      </AnalyticsShell>
    );

  if (!a.hasHistory)
    return (
      <AnalyticsShell>
        <StateBlock
          title="Not enough history yet"
          body="Analytics fills in as soon as your store has orders. Create one, or load demo data from Settings."
          action={
            <Button asChild className="shadow-primary">
              <Link to="/orders/new">Create order</Link>
            </Button>
          }
        />
      </AnalyticsShell>
    );

  return (
    <AnalyticsShell>
      <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <Panel
          title="Sales performance"
          subtitle={`${orders.length} orders · ${money(a.revenue)} revenue`}
        >
          <BarChart data={a.trend} />
        </Panel>
        <Panel title="Top districts" subtitle="Where your buyers are">
          <div className="grid gap-3.5">
            {a.districts.map((d) => (
              <div key={d.district} className="flex items-center gap-2.5 text-sm">
                {d.district}
                <b className="ml-auto">{d.share}</b>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-5" title="Channel mix" subtitle="Share of orders by channel">
        <div className="grid gap-3.5 sm:grid-cols-2">
          {a.channelShare.map((c) => (
            <div key={c.channel} className="flex items-center gap-2.5 text-sm">
              <i
                className={cn("size-2.5 rounded-full", channelDotClass(c.channel))}
                aria-hidden
              />
              {c.channel}
              <b className="ml-auto">
                {c.share} · {c.orders}
              </b>
            </div>
          ))}
        </div>
      </Panel>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Average order value"
          value={money(a.avgOrderValue)}
          hint="Across all orders"
        />
        <KpiCard label="Return rate" value={a.returnRate} hint="Of closed orders" tone="bad" />
        <KpiCard label="Repeat customers" value={a.repeatRate} hint="Ordered more than once" />
        <KpiCard label="COD success rate" value={a.codSuccess} hint="Across all couriers" />
      </div>
    </AnalyticsShell>
  );
}

function AnalyticsShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Analytics" subtitle="See what is driving profitable growth." />
      {children}
    </>
  );
}
