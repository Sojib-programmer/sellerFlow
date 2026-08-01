import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DefaultActions, PageHeader } from "@/components/sellerflow/page-header";
import { OrderTable } from "@/components/sellerflow/primitives";
import { useOrderDialogs } from "@/components/sellerflow/use-order-dialogs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORDER_STATUSES } from "@/lib/sellerflow-data";
import { useSellerFlow } from "@/lib/sellerflow-store";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders — SellerFlow BD" },
      {
        name: "description",
        content:
          "Manage every order from first social message to delivery: filter by status, update couriers and track COD.",
      },
      { property: "og:title", content: "Orders — SellerFlow BD" },
      {
        property: "og:description",
        content: "Filter, confirm and fulfil every order from one queue.",
      },
    ],
  }),
  component: Orders,
});

function Orders() {
  const { orders } = useSellerFlow();
  const { dialogs, openCreate, openOrder } = useOrderDialogs();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const matchesQuery = Object.values(o)
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesQuery && (status === "all" || o.status === status);
      }),
    [orders, query, status],
  );

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Manage every order from first message to delivery."
        actions={<DefaultActions onCreate={() => openCreate()} />}
      />

      <div className="flex flex-wrap gap-2.5">
        <Input
          className="sm:w-64"
          placeholder="Search customer or order ID"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <OrderTable
        title={query || status !== "all" ? "Matching orders" : "All orders"}
        subtitle={`${filtered.length} of ${orders.length} orders`}
        orders={filtered}
        onSelect={openOrder}
      />
      {dialogs}
    </>
  );
}
