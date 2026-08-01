import type { ReactNode } from "react";
import { money, statusClass, type Order, type OrderStatus } from "@/lib/sellerflow-data";
import { cn } from "@/lib/utils";

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={cn("status-pill", statusClass(status))}>{status}</span>;
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "good",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "good" | "bad" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="my-2 text-2xl font-extrabold tracking-tight">{value}</p>
      <p
        className={cn(
          "text-xs font-bold",
          tone === "good" && "text-primary",
          tone === "bad" && "text-destructive",
          tone === "neutral" && "text-muted-foreground",
        )}
      >
        {hint}
      </p>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-card", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-[15px] font-bold">{title}</h3>}
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex h-[185px] items-end gap-3 border-b border-border px-2">
      {data.map((d) => (
        <div key={d.label} className="flex-1 text-center text-[10px] text-muted-foreground">
          <div
            className="bar-fill mb-2 min-h-4 w-full transition-all"
            style={{ height: `${(d.value / max) * 150}px` }}
          />
          {d.label}
        </div>
      ))}
    </div>
  );
}

export function OrderTable({
  title,
  subtitle,
  orders,
  action,
  onSelect,
}: {
  title: string;
  subtitle?: string;
  orders: Order[];
  action?: ReactNode;
  onSelect: (order: Order) => void;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
        <div>
          <h3 className="text-[15px] font-bold">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-xs">
          <thead>
            <tr className="bg-surface text-muted-foreground">
              {["ORDER", "CUSTOMER", "CHANNEL", "AMOUNT", "STATUS", "COURIER"].map((h) => (
                <th key={h} className="px-5 py-3 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                onClick={() => onSelect(o)}
                className="cursor-pointer border-t border-border transition-colors hover:bg-accent/40"
              >
                <td className="px-5 py-3.5">
                  <b>{o.id}</b>
                  <br />
                  <span className="text-muted-foreground">{o.items}</span>
                </td>
                <td className="px-5 py-3.5">
                  {o.name}
                  <br />
                  <span className="text-muted-foreground">{o.district}</span>
                </td>
                <td className="px-5 py-3.5">{o.channel}</td>
                <td className="px-5 py-3.5 font-bold">{money(o.amount)}</td>
                <td className="px-5 py-3.5">
                  <StatusPill status={o.status} />
                </td>
                <td className="px-5 py-3.5">{o.courier}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-muted-foreground">
                  No orders match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
