import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/sellerflow/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  CHANNELS,
  COURIERS,
  DELIVERY_CHARGE,
  DISTRICTS,
  money,
  type Channel,
} from "@/lib/sellerflow-data";
import { useSellerFlow } from "@/lib/sellerflow-store";

interface NewSearch {
  customer: string;
  phone: string;
  channel: string;
  district: string;
}

export const Route = createFileRoute("/_authenticated/_app/orders/new")({
  validateSearch: (s: Record<string, unknown>): NewSearch => ({
    customer: typeof s["customer"] === "string" ? s["customer"] : "",
    phone: typeof s["phone"] === "string" ? s["phone"] : "",
    channel: typeof s["channel"] === "string" ? s["channel"] : "",
    district: typeof s["district"] === "string" ? s["district"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Create order — SellerFlow BD" },
      {
        name: "description",
        content:
          "Turn a chat message into a confirmed order in seconds: customer, address, courier, COD and live totals.",
      },
      { property: "og:title", content: "Create order — SellerFlow BD" },
      {
        property: "og:description",
        content: "Fast order entry built for orders that arrive by chat.",
      },
    ],
  }),
  component: CreateOrderPage,
});

function CreateOrderPage() {
  const prefill = Route.useSearch();
  const navigate = useNavigate();
  const { products, createOrder } = useSellerFlow();

  const [customer, setCustomer] = useState(prefill.customer);
  const [phone, setPhone] = useState(prefill.phone);
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState(prefill.district || DISTRICTS[0]!);
  const [channel, setChannel] = useState<Channel>((prefill.channel as Channel) || "Facebook");
  const [sku, setSku] = useState(products[0]?.sku ?? "");
  const [qty, setQty] = useState(1);
  const [payment, setPayment] = useState<"COD" | "Prepaid">("COD");
  const [courier, setCourier] = useState(COURIERS[0]!);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const product = products.find((p) => p.sku === sku);
  const subtotal = (product?.price ?? 0) * qty;
  const total = subtotal + DELIVERY_CHARGE;

  const phoneOk = /^01[3-9]\d{8}$/.test(phone.replace(/[\s-]/g, ""));
  const valid = Boolean(customer.trim() && phoneOk && address.trim() && product && qty > 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || !product) {
      toast.error("Please complete the required fields");
      return;
    }
    if (qty > product.stock) {
      toast.error(`Only ${product.stock} units of ${product.name} left in stock`);
      return;
    }
    setSaving(true);
    const id = createOrder({
      name: customer.trim(),
      phone: phone.trim(),
      address: address.trim(),
      district,
      channel,
      productSku: product.sku,
      qty,
      courier,
      payment,
    });
    toast.success(`Order ${id} created`, {
      description: `${customer.trim()} · ${money(total)} · ${payment}`,
    });
    setSaving(false);
    navigate({ to: "/orders" });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Create order"
        subtitle="Built for orders that arrive in chat — fill it in while you’re still talking."
      />

      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="card-surface space-y-4 p-4">
            <h2 className="text-sm font-semibold">Customer</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="customer">Customer name *</Label>
                <Input
                  id="customer"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="e.g. Nusrat Jahan"
                  className="mt-1.5"
                />
                {touched && !customer.trim() ? (
                  <p className="mt-1 text-xs text-coral">Name is required</p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="phone">Mobile number *</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01712345678"
                  className="num mt-1.5"
                />
                {touched && !phoneOk ? (
                  <p className="mt-1 text-xs text-coral">
                    Enter a valid Bangladeshi mobile number
                  </p>
                ) : null}
              </div>
            </div>
            <div>
              <Label htmlFor="address">Delivery address *</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House / road / area, landmark"
                rows={2}
                className="mt-1.5"
              />
              {touched && !address.trim() ? (
                <p className="mt-1 text-xs text-coral">Address is required</p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="district">District</Label>
                <Select value={district} onValueChange={setDistrict}>
                  <SelectTrigger id="district" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="channel">Order channel</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                  <SelectTrigger id="channel" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="card-surface space-y-4 p-4">
            <h2 className="text-sm font-semibold">Product &amp; delivery</h2>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_110px]">
              <div>
                <Label htmlFor="product">Product</Label>
                <Select value={sku} onValueChange={setSku}>
                  <SelectTrigger id="product" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.sku} value={p.sku}>
                        {p.name} — {money(p.price)} ({p.stock} in stock)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="qty">Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className="num mt-1.5"
                />
              </div>
            </div>
            {product && qty > product.stock ? (
              <p className="text-xs text-coral">Only {product.stock} units available</p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="payment">Payment type</Label>
                <Select value={payment} onValueChange={(v) => setPayment(v as "COD" | "Prepaid")}>
                  <SelectTrigger id="payment" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COD">Cash on delivery</SelectItem>
                    <SelectItem value="Prepaid">Prepaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="courier">Courier</Label>
                <Select value={courier} onValueChange={setCourier}>
                  <SelectTrigger id="courier" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COURIERS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="card-surface p-4">
            <h2 className="text-sm font-semibold">Order summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="min-w-0 truncate text-muted-foreground">
                  {product?.name ?? "No product"} × {qty}
                </dt>
                <dd className="num shrink-0">{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery ({district})</dt>
                <dd className="num">{money(DELIVERY_CHARGE)}</dd>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-extrabold">
                <dt>Total</dt>
                <dd className="num">{money(total)}</dd>
              </div>
            </dl>
            <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              {payment === "COD"
                ? `Collect ${money(total)} in cash on delivery via ${courier}.`
                : "Prepaid — confirm payment before dispatch."}
            </p>
            <Button type="submit" className="mt-4 h-11 w-full gap-2" disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              {saving ? "Saving…" : "Save order"}
            </Button>
          </div>
        </aside>
      </form>
    </div>
  );
}
