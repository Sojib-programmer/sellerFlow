import { createFileRoute, Link } from "@tanstack/react-router";
import { DefaultActions, PageHeader } from "@/components/sellerflow/page-header";
import { BarChart, KpiCard, OrderTable, Panel } from "@/components/sellerflow/primitives";
import { useOrderDialogs } from "@/components/sellerflow/use-order-dialogs";
import { channelDotClass, channelShare } from "@/lib/sellerflow-data";
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

const week = [
  { label: "Mon", value: 45 },
  { label: "Tue", value: 62 },
  { label: "Wed", value: 55 },
  { label: "Thu", value: 78 },
  { label: "Fri", value: 61 },
  { label: "Sat", value: 89 },
  { label: "Sun", value: 74 },
];

function Dashboard() {
  const { orders } = useSellerFlow();
  const { dialogs, openCreate, openOrder } = useOrderDialogs();

  return (
    <>
      <PageHeader
        title={<>Good morning, Dan 👋</>}
        subtitle="Here is what is happening with your store today."
        actions={<DefaultActions onCreate={() => openCreate()} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Today’s orders" value="38" hint="↑ 12% vs. yesterday" />
        <KpiCard label="Today’s revenue" value="৳86,420" hint="↑ 18% vs. yesterday" />
        <KpiCard
          label="Pending confirmation"
          value="7"
          hint="Needs your attention"
          tone="bad"
        />
        <KpiCard label="COD to collect" value="৳42,750" hint="From 26 deliveries" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <Panel title="Orders this week" subtitle="118 orders · ৳264,930 in sales">
          <BarChart data={week} />
        </Panel>
        <Panel title="Sales channels" subtitle="Share of orders this month">
          <div className="grid gap-3.5">
            {channelShare.map((c) => (
              <div key={c.channel} className="flex items-center gap-2.5">
                <i className={cn("size-2.5 rounded-full", channelDotClass(c.channel))} />
                {c.channel}
                <b className="ml-auto">{c.share}</b>
              </div>
            ))}
          </div>
        </Panel>
      </div>

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
      {dialogs}
    </>
  );
}
