import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/sellerflow/page-header";
import {
  KpiSkeletonRow,
  OrderTable,
  Panel,
  StateBlock,
} from "@/components/sellerflow/primitives";
import { useOrderDialogs } from "@/components/sellerflow/use-order-dialogs";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/sellerflow-data";
import { computeCouriers } from "@/lib/sellerflow-metrics";
import { useSellerFlow } from "@/lib/sellerflow-store";

export const Route = createFileRoute("/_authenticated/_app/couriers")({
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
  const { orders, isLoading, isError, error, refetch } = useSellerFlow();
  const { dialogs, openOrder } = useOrderDialogs();
  const shipments = orders.filter((o) => !["New", "Confirmed"].includes(o.status));
  const couriers = computeCouriers(orders);

  return (
    <>
      <PageHeader
        title="Delivery & couriers"
        subtitle="Choose reliable fulfillment and track COD collection."
      />

      {isLoading ? (
        <KpiSkeletonRow />
      ) : isError ? (
        <StateBlock
          tone="error"
          title="Could not load courier performance"
          body={error?.message ?? "Please try again."}
          action={
            <Button variant="outline" onClick={refetch}>
              Retry
            </Button>
          }
        />
      ) : couriers.length === 0 ? (
        <StateBlock
          title="No parcels in the courier network yet"
          body="Courier performance is calculated from your own shipped orders. Confirm and pack an order to start tracking."
          action={
            <Button asChild className="shadow-primary">
              <Link to="/orders">Go to orders</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {couriers.map((c) => (
              <Panel
                key={c.name}
                title={c.name}
                subtitle={`${c.parcels} parcel${c.parcels === 1 ? "" : "s"}`}
              >
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
        </>
      )}
      {dialogs}
    </>
  );
}
