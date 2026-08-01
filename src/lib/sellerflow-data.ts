export type OrderStatus =
  | "New"
  | "Confirmed"
  | "Packed"
  | "Out for Delivery"
  | "Delivered"
  | "Returned";

export type Channel = "Facebook" | "WhatsApp" | "TikTok" | "Instagram";

export type Order = {
  id: string;
  name: string;
  phone: string;
  district: string;
  address: string;
  channel: Channel;
  items: string;
  amount: number;
  status: OrderStatus;
  courier: string;
  payment: "COD" | "Prepaid";
};

export type Product = {
  name: string;
  sku: string;
  stock: number;
  price: number;
  sales: number;
};

export const ORDER_STATUSES: OrderStatus[] = [
  "New",
  "Confirmed",
  "Packed",
  "Out for Delivery",
  "Delivered",
  "Returned",
];

export const CHANNELS: Channel[] = ["Facebook", "WhatsApp", "TikTok", "Instagram"];

export const COURIERS = ["Pathao", "Steadfast", "RedX", "Paperfly", "Sundarban"];

export const DISTRICTS = [
  "Dhaka",
  "Chattogram",
  "Gazipur",
  "Narayanganj",
  "Sylhet",
  "Khulna",
  "Rajshahi",
  "Cumilla",
];

export const DELIVERY_CHARGE = 120;

export const seedOrders: Order[] = [
  {
    id: "SFB-1082",
    name: "Nusrat Jahan",
    phone: "01712-883214",
    district: "Dhaka",
    address: "House 12, Road 7, Dhanmondi",
    channel: "Facebook",
    items: "Linen Kurti × 1",
    amount: 1890,
    status: "New",
    courier: "Pathao",
    payment: "COD",
  },
  {
    id: "SFB-1081",
    name: "Arif Hossain",
    phone: "01845-930621",
    district: "Gazipur",
    address: "Board Bazar, Gazipur",
    channel: "WhatsApp",
    items: "Premium Hijab × 2",
    amount: 1480,
    status: "Confirmed",
    courier: "Steadfast",
    payment: "COD",
  },
  {
    id: "SFB-1080",
    name: "Mim Akter",
    phone: "01677-441903",
    district: "Chattogram",
    address: "GEC Circle, Chattogram",
    channel: "TikTok",
    items: "Cotton Co-ord Set × 1",
    amount: 2450,
    status: "Packed",
    courier: "RedX",
    payment: "Prepaid",
  },
  {
    id: "SFB-1079",
    name: "Sadia Islam",
    phone: "01922-651245",
    district: "Narayanganj",
    address: "Chashara, Narayanganj",
    channel: "Facebook",
    items: "Linen Kurti × 2",
    amount: 3780,
    status: "Out for Delivery",
    courier: "Pathao",
    payment: "COD",
  },
  {
    id: "SFB-1078",
    name: "Faria Sultana",
    phone: "01750-994812",
    district: "Sylhet",
    address: "Zindabazar, Sylhet",
    channel: "Instagram",
    items: "Premium Hijab × 1",
    amount: 740,
    status: "Delivered",
    courier: "Paperfly",
    payment: "COD",
  },
  {
    id: "SFB-1077",
    name: "Tanvir Ahmed",
    phone: "01817-212100",
    district: "Dhaka",
    address: "Uttara Sector 11, Dhaka",
    channel: "Facebook",
    items: "Kids Eid Panjabi × 1",
    amount: 1350,
    status: "Delivered",
    courier: "Sundarban",
    payment: "COD",
  },
  {
    id: "SFB-1076",
    name: "Rukaiya Rahman",
    phone: "01551-772234",
    district: "Dhaka",
    address: "Mirpur DOHS, Dhaka",
    channel: "WhatsApp",
    items: "Cotton Co-ord Set × 1",
    amount: 2450,
    status: "Returned",
    courier: "RedX",
    payment: "COD",
  },
  {
    id: "SFB-1075",
    name: "Jannat Ara",
    phone: "01909-221444",
    district: "Chattogram",
    address: "Panchlaish, Chattogram",
    channel: "TikTok",
    items: "Linen Kurti × 1",
    amount: 1890,
    status: "Confirmed",
    courier: "Steadfast",
    payment: "COD",
  },
];

export const seedProducts: Product[] = [
  { name: "Linen Kurti", sku: "SFB-KUR-01", stock: 18, price: 1890, sales: 84 },
  { name: "Premium Hijab", sku: "SFB-HIJ-03", stock: 7, price: 740, sales: 56 },
  { name: "Cotton Co-ord Set", sku: "SFB-COO-02", stock: 12, price: 2450, sales: 39 },
  { name: "Kids Eid Panjabi", sku: "SFB-KID-05", stock: 4, price: 1350, sales: 31 },
];

export type Conversation = {
  name: string;
  channel: Channel;
  message: string;
  ago: string;
};

export const conversations: Conversation[] = [
  {
    name: "Nabila Akter",
    channel: "Facebook",
    message: "Assalamu alaikum, is the Linen Kurti available in M?",
    ago: "2 min",
  },
  {
    name: "Sanjida Rahman",
    channel: "WhatsApp",
    message: "Please confirm delivery charge for Sylhet.",
    ago: "18 min",
  },
  {
    name: "Ruma Saha",
    channel: "TikTok",
    message: "I want the navy hijab. Can I order now?",
    ago: "1 hr",
  },
];

export const couriersPerformance = [
  { name: "Pathao", success: "93.4%", avg: "1.6 days", cod: 18650 },
  { name: "RedX", success: "91.8%", avg: "2.1 days", cod: 12900 },
  { name: "Steadfast", success: "90.2%", avg: "2.4 days", cod: 11200 },
  { name: "Paperfly", success: "88.9%", avg: "2.7 days", cod: 0 },
];

export const channelShare: { channel: Channel; share: string }[] = [
  { channel: "Facebook", share: "52%" },
  { channel: "WhatsApp", share: "28%" },
  { channel: "TikTok", share: "14%" },
  { channel: "Instagram", share: "6%" },
];

export function money(n: number) {
  return "৳" + Number(n).toLocaleString("en-US");
}

export function statusClass(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    New: "status-new",
    Confirmed: "status-confirmed",
    Packed: "status-packed",
    "Out for Delivery": "status-transit",
    Delivered: "status-delivered",
    Returned: "status-returned",
  };
  return map[status];
}

export function channelDotClass(channel: Channel) {
  const map: Record<Channel, string> = {
    Facebook: "channel-dot-facebook",
    WhatsApp: "channel-dot-whatsapp",
    TikTok: "channel-dot-tiktok",
    Instagram: "channel-dot-instagram",
  };
  return map[channel];
}
