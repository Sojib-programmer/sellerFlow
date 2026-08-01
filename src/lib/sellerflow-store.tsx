import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DELIVERY_CHARGE,
  seedOrders,
  seedProducts,
  type Channel,
  type Order,
  type OrderStatus,
  type Product,
} from "./sellerflow-data";

export type NewOrderDraft = {
  name: string;
  phone: string;
  address: string;
  district: string;
  channel: Channel;
  productSku: string;
  qty: number;
  courier: string;
  payment: "COD" | "Prepaid";
};

type StoreValue = {
  orders: Order[];
  products: Product[];
  createOrder: (draft: NewOrderDraft) => string;
  updateStatus: (id: string, status: OrderStatus) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function SellerFlowProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [products, setProducts] = useState<Product[]>(seedProducts);

  const createOrder = useCallback(
    (draft: NewOrderDraft) => {
      const product = products.find((p) => p.sku === draft.productSku) ?? products[0];
      if (!product) return "";
      const id = `SFB-${1083 + orders.length}`;


      setOrders((prev) => [
        {
          id,
          name: draft.name.trim() || "Walk-in Customer",
          phone: draft.phone.trim() || "01XXXXXXXXX",
          district: draft.district,
          address: draft.address.trim() || "Address pending",
          channel: draft.channel,
          items: `${product.name} × ${draft.qty}`,
          amount: product.price * draft.qty + DELIVERY_CHARGE,
          status: "New",
          courier: draft.courier,
          payment: draft.payment,
        },
        ...prev,
      ]);

      setProducts((prev) =>
        prev.map((p) =>
          p.sku === product.sku ? { ...p, stock: Math.max(0, p.stock - draft.qty) } : p,
        ),
      );

      return id;
    },
    [orders.length, products],
  );

  const updateStatus = useCallback((id: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }, []);

  const value = useMemo(
    () => ({ orders, products, createOrder, updateStatus }),
    [orders, products, createOrder, updateStatus],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useSellerFlow() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useSellerFlow must be used inside SellerFlowProvider");
  return ctx;
}
