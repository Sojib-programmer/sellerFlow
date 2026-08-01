import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/sellerflow/page-header";
import { BarChart, KpiCard, Panel } from "@/components/sellerflow/primitives";

export const Route = createFileRoute("/_app/analytics")({
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

const weeks = [44, 59, 66, 51, 78, 70, 92].map((value, i) => ({
  label: `Week ${i + 1}`,
  value,
}));

const insights = [
  ["📈", "Facebook converts best", "52% of all orders originate here."],
  ["↩️", "Return rate: 5.2%", "Down 1.4% from last month."],
  ["📍", "Dhaka drives 46% of sales", "Prioritize same-day options here."],
];

function Analytics() {
  return (
    <>
      <PageHeader title="Analytics" subtitle="See what is driving profitable growth." />

      <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <Panel title="Sales performance" subtitle="Last 30 days · ৳761,240 revenue">
          <BarChart data={weeks} />
        </Panel>
        <Panel title="Key insights">
          <div className="grid gap-4">
            {insights.map(([icon, title, body]) => (
              <p key={title}>
                {icon} <b>{title}</b>
                <br />
                <span className="text-xs text-muted-foreground">{body}</span>
              </p>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Top product" value="Linen Kurti" hint="84 sold this month" />
        <KpiCard label="Avg. order value" value="৳1,842" hint="↑ 6% vs. last month" />
        <KpiCard label="Repeat customers" value="31%" hint="Loyal buyer base" />
        <KpiCard label="COD success rate" value="94.8%" hint="Across all couriers" />
      </div>
    </>
  );
}
