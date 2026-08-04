import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CHANNELS,
  COURIERS,
  DELIVERY_CHARGE,
  DISTRICTS,
  money,
  ORDER_STATUSES,
  type Channel,
  type Order,
  type OrderStatus,
} from "@/lib/sellerflow-data";
import { useSellerFlow } from "@/lib/sellerflow-store";
import { StatusPill } from "./primitives";

export type Prefill = { name?: string; channel?: Channel };

export function NewOrderDialog({
  open,
  prefill,
  onOpenChange,
}: {
  open: boolean;
  prefill?: Prefill | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const { products, createOrder } = useSellerFlow();
  const [name, setName] = useState(prefill?.name ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState(DISTRICTS[0]!);
  const [channel, setChannel] = useState<Channel>(prefill?.channel ?? "Facebook");
  const [sku, setSku] = useState(products[0]?.sku ?? "");
  const [qty, setQty] = useState(1);
  const [courier, setCourier] = useState(COURIERS[0]!);
  const [payment, setPayment] = useState<"COD" | "Prepaid">("COD");

  const total = useMemo(() => {
    const p = products.find((x) => x.sku === sku);
    return (p?.price ?? 0) * qty + DELIVERY_CHARGE;
  }, [products, sku, qty]);

  const submit = async () => {
    try {
      const id = await createOrder({
      name,
      phone,
      address,
      district,
      channel,
      productSku: sku,
      qty,
      courier,
      payment,
    });
      onOpenChange(false);
      toast.success(`Order ${id} created successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create order");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Create a new order</DialogTitle>
          <DialogDescription>
            Captured from a social chat? Add it in seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="cname">Customer name</Label>
            <Input
              id="cname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ayesha Rahman"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="address">Delivery address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House, road, area"
              rows={2}
            />
          </div>

          <Field label="District">
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger>
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
          </Field>

          <Field label="Channel">
            <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
              <SelectTrigger>
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
          </Field>

          <Field label="Product">
            <Select value={sku} onValueChange={setSku}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.sku} value={p.sku}>
                    {p.name} — {money(p.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-1.5">
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          <Field label="Courier">
            <Select value={courier} onValueChange={setCourier}>
              <SelectTrigger>
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
          </Field>

          <Field label="Payment">
            <Select
              value={payment}
              onValueChange={(v) => setPayment(v as "COD" | "Prepaid")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COD">Cash on Delivery</SelectItem>
                <SelectItem value="Prepaid">Prepaid</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="my-2 flex items-center justify-between rounded-lg bg-accent px-4 py-3.5 font-extrabold text-accent-foreground">
          <span>Total incl. {money(DELIVERY_CHARGE)} delivery</span>
          <span>{money(total)}</span>
        </div>

        <DialogFooter>
          <Button className="w-full shadow-primary" onClick={() => void submit()}>
            Create order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function OrderDetailsDialog({
  order,
  onOpenChange,
}: {
  order: Order | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateStatus } = useSellerFlow();
  const [next, setNext] = useState<OrderStatus | null>(null);
  const current = next ?? order?.status ?? "New";

  if (!order) return null;

  return (
    <Dialog
      open={!!order}
      onOpenChange={(o) => {
        if (!o) setNext(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{order.id}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center gap-2">
              <StatusPill status={order.status} /> <span>· {order.channel}</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-lg bg-surface p-4">
            <h4 className="mb-2 font-bold">Customer</h4>
            <p className="text-xs font-bold">{order.name}</p>
            <p className="text-xs text-muted-foreground">{order.phone}</p>
            <p className="text-xs text-muted-foreground">
              {order.address}, {order.district}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Payment: <b className="text-foreground">{order.payment}</b>
            </p>
          </section>
          <section className="rounded-lg bg-surface p-4">
            <h4 className="mb-2 font-bold">Order summary</h4>
            <p className="text-xs text-muted-foreground">{order.items}</p>
            <p className="text-xs text-muted-foreground">
              Courier: <b className="text-foreground">{order.courier}</b>
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Total: <b className="text-foreground">{money(order.amount)}</b>
            </p>
            <Select value={current} onValueChange={(v) => setNext(v as OrderStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
        </div>

        <h4 className="mt-4 font-bold">Order timeline</h4>
        <div className="ml-1 space-y-3 border-l-2 border-accent pl-4">
          {[
            ["Order created", "Today, 10:18 AM"],
            [order.status, "Latest status"],
          ].map(([a, b]) => (
            <p key={a} className="relative text-xs">
              <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-primary" />
              <b>{a}</b>
              <br />
              <span className="text-muted-foreground">{b}</span>
            </p>
          ))}
        </div>

        <DialogFooter>
          <Button
            className="w-full shadow-primary"
            onClick={() => {
              void updateStatus(order.id, current)
                .then(() => {
                  setNext(null);
                  onOpenChange(false);
                  toast.success("Order status updated");
                })
                .catch((error: unknown) =>
                  toast.error(
                    error instanceof Error ? error.message : "Could not update status",
                  ),
                );
            }}
          >
            Update status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
