import type { Channel, OrderStatus } from "./sellerflow-data";

export type DbOrderStatus =
  | "new"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "returned"
  | "cancelled";

export type DbChannel = "facebook" | "whatsapp" | "instagram" | "tiktok" | "manual";

const STATUS_TO_DISPLAY: Record<DbOrderStatus, OrderStatus> = {
  new: "New",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Out for Delivery",
  delivered: "Delivered",
  returned: "Returned",
  cancelled: "Cancelled",
};

const STATUS_TO_DB: Record<OrderStatus, DbOrderStatus> = {
  New: "new",
  Confirmed: "confirmed",
  Packed: "packed",
  "Out for Delivery": "shipped",
  Delivered: "delivered",
  Returned: "returned",
  Cancelled: "cancelled",
};

const CHANNEL_TO_DISPLAY: Record<DbChannel, Channel> = {
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  tiktok: "TikTok",
  manual: "Manual",
};

const CHANNEL_TO_DB: Record<Channel, DbChannel> = {
  Facebook: "facebook",
  WhatsApp: "whatsapp",
  Instagram: "instagram",
  TikTok: "tiktok",
  Manual: "manual",
};

export const toDisplayStatus = (s: string): OrderStatus =>
  STATUS_TO_DISPLAY[s as DbOrderStatus] ?? "New";
export const toDbStatus = (s: OrderStatus): DbOrderStatus => STATUS_TO_DB[s] ?? "new";
export const toDisplayChannel = (c: string): Channel =>
  CHANNEL_TO_DISPLAY[c as DbChannel] ?? "Manual";
export const toDbChannel = (c: Channel): DbChannel => CHANNEL_TO_DB[c] ?? "manual";
