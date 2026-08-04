import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/sellerflow/page-header";
import { OrderTable, Panel } from "@/components/sellerflow/primitives";
import { useOrderDialogs } from "@/components/sellerflow/use-order-dialogs";
import { couriersPerformance, money } from "@/lib/sellerflow-data";
import { useSellerFlow } from "@/lib/sellerflow-store";

export const Route = createFileRoute("/_app/couriers")({
  head: () => ({
    meta: [
      { title: "Delivery & couriers — SellerFlow BD" },
      {
        name: "description",
        content:
          "Compare Pathao, RedX, Steadfast and Paperfly success rates, delivery times and outstanding COD collection.",
      },
      { property: "og:title", content: "Delivery & couriers — SellerFlow BD" },
      {
        property: "og:description",
        content: "Pick reliable couriers and track every taka of COD.",
      },
    ],
  }),
  component: Delivery,
});

function Delivery() {
  const { orders } = useSellerFlow();
  const { dialogs, openOrder } = useOrderDialogs();
  const shipments = orders.filter((o) => !["New", "Confirmed"].includes(o.status));

  return (
    <>
      <PageHeader
        title="Delivery & couriers"
        subtitle="Choose reliable fulfillment and track COD collection."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {couriersPerformance.map((c) => (
          <Panel key={c.name} title={c.name} subtitle="Connected courier">
            <p className="text-lg font-extrabold">{c.success}</p>
            <p className="text-xs text-muted-foreground">
              delivery success · {c.avg} avg.
            </p>
            <p className="mt-2 text-xs font-bold text-primary">COD: {money(c.cod)}</p>
          </Panel>
        ))}
      </div>

      <OrderTable
        title="Shipments"
        subtitle={`${shipments.length} parcels in the courier network`}
        orders={shipments}
        onSelect={openOrder}
      />
      {dialogs}
    </>
  );
}
