import { createFileRoute, Link } from "@tanstack/react-router";
import { DefaultActions, PageHeader } from "@/components/sellerflow/page-header";
import {
  BarChart,
  KpiCard,
  KpiSkeletonRow,
  OrderTable,
  Panel,
  StateBlock,
} from "@/components/sellerflow/primitives";
import { useOrderDialogs } from "@/components/sellerflow/use-order-dialogs";
import { Button } from "@/components/ui/button";
import { channelDotClass, money } from "@/lib/sellerflow-data";
import { computeDashboard, deltaHint } from "@/lib/sellerflow-metrics";
import { useSellerFlow } from "@/lib/sellerflow-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "SellerFlow BD — Social commerce order console" },
      {
        name: "description",
        content:
          "Run your Bangladesh social-commerce store: orders, unified inbox, inventory, courier performance and COD tracking in one console.",
      },
      { property: "og:title", content: "SellerFlow BD — Social commerce order console" },
      {
        property: "og:description",
        content:
          "Track orders, COD collection and courier performance for your Facebook, WhatsApp and TikTok store.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { orders, store, isLoading, isError, error, refetch } = useSellerFlow();
  const { dialogs, openCreate, openOrder } = useOrderDialogs();

  const displayName =
    (user?.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "there";

  const m = computeDashboard(orders);

  return (
    <>
      <PageHeader
        title={<>Good day, {displayName} 👋</>}
        subtitle={
          store
            ? `Here is what is happening at ${store.name} today.`
            : "Here is what is happening with your store today."
        }
        actions={<DefaultActions onCreate={() => openCreate()} />}
      />

      {isLoading ? (
        <KpiSkeletonRow />
      ) : isError ? (
        <StateBlock
          tone="error"
          title="Could not load your store data"
          body={error?.message ?? "Please try again."}
          action={
            <Button variant="outline" onClick={refetch}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Today’s orders"
              value={String(m.todayOrders)}
              hint={deltaHint(m.todayOrders, m.yesterdayOrders, "orders")}
            />
            <KpiCard
              label="Today’s revenue"
              value={money(m.todayRevenue)}
              hint={`${m.todayOrders} order${m.todayOrders === 1 ? "" : "s"} today`}
            />
            <KpiCard
              label="Pending confirmation"
              value={String(m.pendingConfirmation)}
              hint={
                m.pendingConfirmation > 0 ? "Needs your attention" : "Nothing waiting on you"
              }
              tone={m.pendingConfirmation > 0 ? "bad" : "good"}
            />
            <KpiCard
              label="COD to collect"
              value={money(m.codOutstanding)}
              hint={`From ${m.codDeliveries} parcel${m.codDeliveries === 1 ? "" : "s"}`}
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.65fr_1fr]">
            <Panel
              title="Orders this week"
              subtitle={`${m.weekOrders} orders · ${money(m.weekRevenue)} in sales`}
            >
              <BarChart data={m.week} />
            </Panel>
            <Panel title="Sales channels" subtitle="Share of your orders">
              {m.channelShare.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Channel mix appears once you have orders.
                </p>
              ) : (
                <div className="grid gap-3.5">
                  {m.channelShare.map((c) => (
                    <div key={c.channel} className="flex items-center gap-2.5">
                      <i
                        className={cn("size-2.5 rounded-full", channelDotClass(c.channel))}
                        aria-hidden
                      />
                      {c.channel}
                      <b className="ml-auto">{c.share}</b>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {orders.length === 0 ? (
            <div className="mt-5">
              <StateBlock
                title="No orders yet"
                body="Create your first order, or load demo data from Settings to explore the console."
                action={
                  <div className="flex flex-wrap gap-2">
                    <Button className="shadow-primary" onClick={() => openCreate()}>
                      Create order
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/settings">Open settings</Link>
                    </Button>
                  </div>
                }
              />
            </div>
          ) : (
            <OrderTable
              title="Recent orders"
              subtitle="Keep your customer orders moving"
              orders={orders.slice(0, 5)}
              onSelect={openOrder}
              action={
                <Link to="/orders" className="text-xs font-semibold text-primary">
                  View all orders →
                </Link>
              }
            />
          )}
        </>
      )}
      {dialogs}
    </>
  );
}
