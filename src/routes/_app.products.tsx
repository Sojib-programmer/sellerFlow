import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/sellerflow/page-header";
import { KpiCard } from "@/components/sellerflow/primitives";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/sellerflow-data";
import { useSellerFlow } from "@/lib/sellerflow-store";

export const Route = createFileRoute("/_app/products")({
  head: () => ({
    meta: [
      { title: "Products & inventory — SellerFlow BD" },
      {
        name: "description",
        content:
          "Track stock levels, SKUs, prices and best sellers so you never disappoint a customer mid-chat.",
      },
      { property: "og:title", content: "Products & inventory — SellerFlow BD" },
      {
        property: "og:description",
        content: "Know what is selling and restock before you run out.",
      },
    ],
  }),
  component: Products,
});

function Products() {
  const { products } = useSellerFlow();
  const lowStock = products.filter((p) => p.stock < 8).length;

  return (
    <>
      <PageHeader
        title="Products & inventory"
        subtitle="Know what is selling and never disappoint a customer."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Active products" value="24" hint="All selling channels" />
        <KpiCard
          label="Low-stock items"
          value={String(lowStock)}
          hint="Restock soon"
          tone="bad"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
          <h3 className="text-[15px] font-bold">Product catalogue</h3>
          <Button
            className="shadow-primary"
            onClick={() => toast.success("Product editor opened — demo mode")}
          >
            <Plus className="size-4" /> Add product
          </Button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-xs">
            <thead>
              <tr className="bg-surface text-muted-foreground">
                {["PRODUCT", "SKU", "STOCK", "PRICE", "SALES"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.sku} className="border-t border-border">
                  <td className="px-5 py-3.5 font-bold">{p.name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{p.sku}</td>
                  <td className="px-5 py-3.5">
                    {p.stock < 8 ? (
                      <b className="text-destructive">⚠ {p.stock} left</b>
                    ) : (
                      `${p.stock} in stock`
                    )}
                  </td>
                  <td className="px-5 py-3.5">{money(p.price)}</td>
                  <td className="px-5 py-3.5">{p.sales} units</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
