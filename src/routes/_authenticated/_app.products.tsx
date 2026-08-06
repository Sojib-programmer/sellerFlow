import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/sellerflow/page-header";
import { KpiCard, KpiSkeletonRow, StateBlock } from "@/components/sellerflow/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, type Product } from "@/lib/sellerflow-data";
import { useSellerFlow } from "@/lib/sellerflow-store";

export const Route = createFileRoute("/_authenticated/_app/products")({
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

function threshold(p: Product) {
  return p.lowStockThreshold ?? 5;
}

function Products() {
  const { products, saveProduct, isLoading, isError, error, refetch } = useSellerFlow();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const lowStock = products.filter((p) => p.stock <= threshold(p)).length;
  const active = products.filter((p) => p.active !== false).length;

  return (
    <>
      <PageHeader
        title="Products & inventory"
        subtitle="Know what is selling and never disappoint a customer."
      />

      {isLoading ? (
        <KpiSkeletonRow count={2} />
      ) : isError ? (
        <StateBlock
          tone="error"
          title="Could not load your catalogue"
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
              label="Active products"
              value={String(active)}
              hint="All selling channels"
            />
            <KpiCard
              label="Low-stock items"
              value={String(lowStock)}
              hint={lowStock > 0 ? "Restock soon" : "Stock levels healthy"}
              tone={lowStock > 0 ? "bad" : "good"}
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
              <h3 className="text-[15px] font-bold">Product catalogue</h3>
              <Button
                className="shadow-primary"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden /> Add product
              </Button>
            </header>
            {products.length === 0 ? (
              <div className="px-5 pb-6">
                <StateBlock
                  title="No products yet"
                  body="Add your first product so you can create orders from chat in seconds."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface text-muted-foreground">
                      {["PRODUCT", "SKU", "STOCK", "PRICE", "SALES", ""].map((h, i) => (
                        <th key={i} className="px-5 py-3 text-left font-semibold">
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
                          {p.stock <= threshold(p) ? (
                            <b className="text-destructive">⚠ {p.stock} left</b>
                          ) : (
                            `${p.stock} in stock`
                          )}
                        </td>
                        <td className="px-5 py-3.5">{money(p.price)}</td>
                        <td className="px-5 py-3.5">{p.sales} units</td>
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(p);
                              setOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <ProductDialog
        key={editing?.sku ?? "new"}
        open={open}
        product={editing}
        onOpenChange={setOpen}
        onSave={saveProduct}
      />
    </>
  );
}

function ProductDialog({
  open,
  product,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    name: string;
    sku: string;
    price: number;
    stock: number;
    lowStockThreshold?: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [stock, setStock] = useState(String(product?.stock ?? ""));
  const [low, setLow] = useState(String(product?.lowStockThreshold ?? 5));
  const [saving, setSaving] = useState(false);

  const valid = name.trim() && sku.trim() && Number(price) >= 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      toast.error("Name, SKU and a valid price are required");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        sku: sku.trim(),
        price: Number(price),
        stock: Number(stock) || 0,
        lowStockThreshold: Number(low) || 5,
      });
      toast.success(product ? "Product updated" : "Product added");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(e) => void submit(e)}>
          <div className="grid gap-1.5">
            <Label htmlFor="p-name">Product name</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="p-sku">SKU</Label>
              <Input
                id="p-sku"
                value={sku}
                disabled={Boolean(product)}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-price">Selling price (৳)</Label>
              <Input
                id="p-price"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-stock">Stock quantity</Label>
              <Input
                id="p-stock"
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-low">Low-stock threshold</Label>
              <Input
                id="p-low"
                inputMode="numeric"
                value={low}
                onChange={(e) => setLow(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="gap-2 shadow-primary" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Save product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
