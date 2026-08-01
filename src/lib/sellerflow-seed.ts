// Realistic Bangladesh social-commerce demo records used by the owner-only
// "Load demo data" action. Plain data — safe to import anywhere.
export type DemoProduct = {
  name: string;
  sku: string;
  selling_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
};

export type DemoCustomer = {
  name: string;
  phone: string;
  email: string | null;
  district: string;
  address: string;
};

export type DemoOrder = {
  customerPhone: string;
  channel: "facebook" | "whatsapp" | "instagram" | "tiktok" | "manual";
  status:
    | "new"
    | "confirmed"
    | "packed"
    | "shipped"
    | "delivered"
    | "returned"
    | "cancelled";
  sku: string;
  quantity: number;
  courier_name: string;
  tracking_number: string | null;
  cod: boolean;
  daysAgo: number;
};

export const DEMO_DELIVERY_CHARGE = 120;

export const DEMO_PRODUCTS: DemoProduct[] = [
  { name: "Linen Kurti", sku: "SFB-KUR-01", selling_price: 1890, stock_quantity: 18, low_stock_threshold: 8 },
  { name: "Premium Hijab", sku: "SFB-HIJ-03", selling_price: 740, stock_quantity: 7, low_stock_threshold: 8 },
  { name: "Cotton Co-ord Set", sku: "SFB-COO-02", selling_price: 2450, stock_quantity: 12, low_stock_threshold: 8 },
  { name: "Kids Eid Panjabi", sku: "SFB-KID-05", selling_price: 1350, stock_quantity: 4, low_stock_threshold: 8 },
  { name: "Handloom Saree", sku: "SFB-SAR-07", selling_price: 3250, stock_quantity: 9, low_stock_threshold: 8 },
];

export const DEMO_CUSTOMERS: DemoCustomer[] = [
  { name: "Nusrat Jahan", phone: "01712883214", email: "nusrat.jahan@example.com", district: "Dhaka", address: "House 12, Road 7, Dhanmondi" },
  { name: "Arif Hossain", phone: "01845930621", email: null, district: "Gazipur", address: "Board Bazar, Gazipur" },
  { name: "Mim Akter", phone: "01677441903", email: "mim.akter@example.com", district: "Chattogram", address: "GEC Circle, Chattogram" },
  { name: "Sadia Islam", phone: "01922651245", email: null, district: "Narayanganj", address: "Chashara, Narayanganj" },
  { name: "Faria Sultana", phone: "01750994812", email: null, district: "Sylhet", address: "Zindabazar, Sylhet" },
  { name: "Tanvir Ahmed", phone: "01817212100", email: "tanvir.ahmed@example.com", district: "Dhaka", address: "Uttara Sector 11, Dhaka" },
  { name: "Rukaiya Rahman", phone: "01551772234", email: null, district: "Dhaka", address: "Mirpur DOHS, Dhaka" },
  { name: "Jannat Ara", phone: "01909221444", email: null, district: "Chattogram", address: "Panchlaish, Chattogram" },
];

export const DEMO_ORDERS: DemoOrder[] = [
  { customerPhone: "01712883214", channel: "facebook", status: "new", sku: "SFB-KUR-01", quantity: 1, courier_name: "Pathao", tracking_number: null, cod: true, daysAgo: 0 },
  { customerPhone: "01845930621", channel: "whatsapp", status: "confirmed", sku: "SFB-HIJ-03", quantity: 2, courier_name: "Steadfast", tracking_number: "SF-772104", cod: true, daysAgo: 0 },
  { customerPhone: "01677441903", channel: "tiktok", status: "packed", sku: "SFB-COO-02", quantity: 1, courier_name: "RedX", tracking_number: "RX-991284", cod: false, daysAgo: 1 },
  { customerPhone: "01922651245", channel: "facebook", status: "shipped", sku: "SFB-KUR-01", quantity: 2, courier_name: "Pathao", tracking_number: "PT-441029", cod: true, daysAgo: 2 },
  { customerPhone: "01750994812", channel: "instagram", status: "delivered", sku: "SFB-HIJ-03", quantity: 1, courier_name: "Paperfly", tracking_number: "PF-100238", cod: true, daysAgo: 3 },
  { customerPhone: "01817212100", channel: "facebook", status: "delivered", sku: "SFB-KID-05", quantity: 1, courier_name: "Sundarban", tracking_number: "SB-556231", cod: true, daysAgo: 4 },
  { customerPhone: "01551772234", channel: "whatsapp", status: "returned", sku: "SFB-COO-02", quantity: 1, courier_name: "RedX", tracking_number: "RX-880122", cod: true, daysAgo: 5 },
  { customerPhone: "01909221444", channel: "tiktok", status: "confirmed", sku: "SFB-SAR-07", quantity: 1, courier_name: "Steadfast", tracking_number: null, cod: true, daysAgo: 5 },
  { customerPhone: "01712883214", channel: "facebook", status: "delivered", sku: "SFB-SAR-07", quantity: 1, courier_name: "Pathao", tracking_number: "PT-330918", cod: true, daysAgo: 6 },
  { customerPhone: "01677441903", channel: "instagram", status: "cancelled", sku: "SFB-KID-05", quantity: 2, courier_name: "RedX", tracking_number: null, cod: true, daysAgo: 7 },
];
