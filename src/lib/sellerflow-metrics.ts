import type { Channel, Order } from "./sellerflow-data";

const DAY = 86_400_000;

function orderDate(order: Order): Date | null {
  if (!order.createdAt) return null;
  const d = new Date(order.createdAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pct(part: number, whole: number) {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

export type DashboardMetrics = {
  todayOrders: number;
  todayRevenue: number;
  yesterdayOrders: number;
  pendingConfirmation: number;
  codOutstanding: number;
  codDeliveries: number;
  week: { label: string; value: number }[];
  weekOrders: number;
  weekRevenue: number;
  channelShare: { channel: Channel; share: string; orders: number }[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function computeDashboard(orders: Order[], now = new Date()): DashboardMetrics {
  const yesterday = new Date(now.getTime() - DAY);
  let todayOrders = 0;
  let todayRevenue = 0;
  let yesterdayOrders = 0;
  let pendingConfirmation = 0;
  let codOutstanding = 0;
  let codDeliveries = 0;

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * DAY);
    return { date: d, label: WEEKDAYS[d.getDay()]!, value: 0, revenue: 0 };
  });

  const byChannel = new Map<Channel, number>();

  for (const order of orders) {
    const created = orderDate(order);
    if (order.status === "New") pendingConfirmation += 1;
    if (
      order.payment === "COD" &&
      !["Delivered", "Returned", "Cancelled"].includes(order.status)
    ) {
      codOutstanding += order.amount;
      codDeliveries += 1;
    }
    byChannel.set(order.channel, (byChannel.get(order.channel) ?? 0) + 1);

    if (!created) continue;
    if (sameDay(created, now)) {
      todayOrders += 1;
      todayRevenue += order.amount;
    }
    if (sameDay(created, yesterday)) yesterdayOrders += 1;
    const bucket = week.find((b) => sameDay(b.date, created));
    if (bucket) {
      bucket.value += 1;
      bucket.revenue += order.amount;
    }
  }

  const totalChannel = orders.length;
  const channelShare = [...byChannel.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([channel, count]) => ({
      channel,
      orders: count,
      share: pct(count, totalChannel),
    }));

  return {
    todayOrders,
    todayRevenue,
    yesterdayOrders,
    pendingConfirmation,
    codOutstanding,
    codDeliveries,
    week: week.map((b) => ({ label: b.label, value: b.value })),
    weekOrders: week.reduce((sum, b) => sum + b.value, 0),
    weekRevenue: week.reduce((sum, b) => sum + b.revenue, 0),
    channelShare,
  };
}

export function deltaHint(today: number, yesterday: number, noun: string) {
  if (yesterday === 0) return today === 0 ? `No ${noun} yet` : "First activity today";
  const change = Math.round(((today - yesterday) / yesterday) * 100);
  if (change === 0) return "Same as yesterday";
  return `${change > 0 ? "↑" : "↓"} ${Math.abs(change)}% vs. yesterday`;
}

export type CourierRow = {
  name: string;
  parcels: number;
  success: string;
  avg: string;
  cod: number;
};

export function computeCouriers(orders: Order[], now = new Date()): CourierRow[] {
  const grouped = new Map<
    string,
    { parcels: number; delivered: number; closed: number; cod: number; ageDays: number[] }
  >();

  for (const order of orders) {
    const name = order.courier?.trim();
    if (!name || name === "Not assigned") continue;
    if (["New", "Confirmed"].includes(order.status)) continue;
    const row =
      grouped.get(name) ??
      { parcels: 0, delivered: 0, closed: 0, cod: 0, ageDays: [] as number[] };
    row.parcels += 1;
    if (order.status === "Delivered") {
      row.delivered += 1;
      const created = orderDate(order);
      if (created) row.ageDays.push(Math.max(0, (now.getTime() - created.getTime()) / DAY));
    }
    if (["Delivered", "Returned", "Cancelled"].includes(order.status)) row.closed += 1;
    if (order.payment === "COD" && order.status !== "Delivered" && order.status !== "Cancelled")
      row.cod += order.amount;
    grouped.set(name, row);
  }

  return [...grouped.entries()]
    .map(([name, r]) => ({
      name,
      parcels: r.parcels,
      success: r.closed > 0 ? pct(r.delivered, r.closed) : "—",
      avg:
        r.ageDays.length > 0
          ? `${(r.ageDays.reduce((a, b) => a + b, 0) / r.ageDays.length).toFixed(1)} days`
          : "—",
      cod: r.cod,
    }))
    .sort((a, b) => b.parcels - a.parcels);
}

export type AnalyticsMetrics = {
  revenue: number;
  trend: { label: string; value: number }[];
  channelShare: { channel: Channel; share: string; orders: number }[];
  districts: { district: string; orders: number; share: string }[];
  returnRate: string;
  repeatRate: string;
  codSuccess: string;
  avgOrderValue: number;
  hasHistory: boolean;
};

export function computeAnalytics(
  orders: Order[],
  customers: { orders: number }[],
  now = new Date(),
): AnalyticsMetrics {
  const revenue = orders.reduce((sum, o) => sum + o.amount, 0);

  const trend = Array.from({ length: 6 }, (_, i) => {
    const end = now.getTime() - (5 - i) * 7 * DAY;
    const start = end - 7 * DAY;
    const value = orders.reduce((sum, o) => {
      const created = orderDate(o);
      if (!created) return sum;
      const t = created.getTime();
      return t > start && t <= end ? sum + o.amount : sum;
    }, 0);
    return { label: `Wk ${i + 1}`, value };
  });

  const byChannel = new Map<Channel, number>();
  const byDistrict = new Map<string, number>();
  let returned = 0;
  let closed = 0;
  let codDelivered = 0;
  let codClosed = 0;

  for (const o of orders) {
    byChannel.set(o.channel, (byChannel.get(o.channel) ?? 0) + 1);
    const district = o.district?.trim();
    if (district) byDistrict.set(district, (byDistrict.get(district) ?? 0) + 1);
    if (["Delivered", "Returned", "Cancelled"].includes(o.status)) {
      closed += 1;
      if (o.status === "Returned") returned += 1;
      if (o.payment === "COD") {
        codClosed += 1;
        if (o.status === "Delivered") codDelivered += 1;
      }
    }
  }

  const repeat = customers.filter((c) => c.orders > 1).length;

  return {
    revenue,
    trend,
    channelShare: [...byChannel.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([channel, count]) => ({
        channel,
        orders: count,
        share: pct(count, orders.length),
      })),
    districts: [...byDistrict.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([district, count]) => ({
        district,
        orders: count,
        share: pct(count, orders.length),
      })),
    returnRate: closed > 0 ? pct(returned, closed) : "—",
    repeatRate: customers.length > 0 ? pct(repeat, customers.length) : "—",
    codSuccess: codClosed > 0 ? pct(codDelivered, codClosed) : "—",
    avgOrderValue: orders.length > 0 ? Math.round(revenue / orders.length) : 0,
    hasHistory: orders.length > 0,
  };
}
