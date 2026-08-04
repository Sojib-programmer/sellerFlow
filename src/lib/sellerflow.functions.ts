import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Channel, Order, OrderStatus, Product } from "./sellerflow-data";
import { toDbChannel, toDbStatus, toDisplayChannel, toDisplayStatus } from "./sellerflow-mapping";
import {
  DEMO_CUSTOMERS,
  DEMO_DELIVERY_CHARGE,
  DEMO_ORDERS,
  DEMO_PRODUCTS,
} from "./sellerflow-seed";

export type StoreInfo = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "manager" | "staff";
  createdAt: string;
};

export type CustomerInfo = {
  id: string;
  name: string;
  phone: string;
  district: string;
  orders: number;
};

export type Workspace = {
  store: StoreInfo | null;
  orders: Order[];
  products: Product[];
  customers: CustomerInfo[];
};

export type CreateOrderInput = {
  name: string;
  phone: string;
  address: string;
  district: string;
  channel: Channel;
  productSku: string;
  qty: number;
  courier: string;
  payment: "COD" | "Prepaid";
  trackingNumber?: string;
};

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Workspace> => {
    const { supabase, userId } = context;

    const { data: membership, error: memberError } = await supabase
      .from("store_members")
      .select("role, store_id, stores(id, name, slug, created_at)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (memberError) throw new Error(memberError.message);
    const storeRow = membership?.stores as
      | { id: string; name: string; slug: string; created_at: string }
      | null
      | undefined;
    if (!membership || !storeRow)
      return { store: null, orders: [], products: [], customers: [] };

    const [productsRes, ordersRes, customersRes] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("store_id", membership.store_id)
        .order("created_at", { ascending: true }),
      supabase
        .from("orders")
        .select(
          "id, order_number, channel, status, subtotal, delivery_charge, cod_amount, courier_name, tracking_number, delivery_district, delivery_address, created_at, customer_id, customers(name, phone, district, address), order_items(quantity, unit_price, total, product_id, products(name))",
        )
        .eq("store_id", membership.store_id)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("customers")
        .select("id, name, phone, district")
        .eq("store_id", membership.store_id)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (productsRes.error) throw new Error(productsRes.error.message);
    if (ordersRes.error) throw new Error(ordersRes.error.message);
    if (customersRes.error) throw new Error(customersRes.error.message);

    const soldByProduct = new Map<string, number>();
    const orders: Order[] = (ordersRes.data ?? []).map((row) => {
      const items = (row.order_items ?? []) as {
        quantity: number;
        unit_price: number;
        total: number;
        product_id: string | null;
        products: { name: string } | null;
      }[];
      for (const item of items) {
        if (item.product_id) {
          soldByProduct.set(
            item.product_id,
            (soldByProduct.get(item.product_id) ?? 0) + Number(item.quantity),
          );
        }
      }
      const customer = row.customers as
        | { name: string; phone: string; district: string | null; address: string | null }
        | null;
      return {
        id: row.order_number,
        name: customer?.name ?? "Walk-in customer",
        phone: customer?.phone ?? "",
        district: row.delivery_district ?? customer?.district ?? "",
        address: row.delivery_address ?? customer?.address ?? "",
        channel: toDisplayChannel(row.channel),
        items:
          items.length > 0
            ? items
                .map((i) => `${i.products?.name ?? "Item"} × ${i.quantity}`)
                .join(", ")
            : "No items",
        amount: Number(row.subtotal) + Number(row.delivery_charge),
        status: toDisplayStatus(row.status),
        courier: row.courier_name ?? "Not assigned",
        payment: Number(row.cod_amount) > 0 ? "COD" : "Prepaid",
        tracking: row.tracking_number ?? "",
      };
    });

    const products: Product[] = (productsRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stock: p.stock_quantity,
      price: Number(p.selling_price),
      sales: soldByProduct.get(p.id) ?? 0,
      lowStockThreshold: p.low_stock_threshold,
      active: p.active,
    }));

    return {
      store: {
        id: storeRow.id,
        name: storeRow.name,
        slug: storeRow.slug,
        role: membership.role,
        createdAt: storeRow.created_at,
      },
      orders,
      products,
    };
  });

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateOrderInput) => input)
  .handler(async ({ data, context }): Promise<{ orderNumber: string }> => {
    const { supabase, userId } = context;

    const { data: membership, error: memberError } = await supabase
      .from("store_members")
      .select("store_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (memberError) throw new Error(memberError.message);
    if (!membership) throw new Error("No store found for this account");
    const storeId = membership.store_id;

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, selling_price, stock_quantity")
      .eq("store_id", storeId)
      .eq("sku", data.productSku)
      .maybeSingle();
    if (productError) throw new Error(productError.message);
    if (!product) throw new Error("Product not found in this store");

    const qty = Math.max(1, Math.round(data.qty));
    const phone = data.phone.replace(/[\s-]/g, "");

    const { data: existing, error: customerLookupError } = await supabase
      .from("customers")
      .select("id")
      .eq("store_id", storeId)
      .eq("phone", phone)
      .maybeSingle();
    if (customerLookupError) throw new Error(customerLookupError.message);

    let customerId = existing?.id ?? null;
    if (!customerId) {
      const { data: inserted, error: customerError } = await supabase
        .from("customers")
        .insert({
          store_id: storeId,
          name: data.name.trim() || "Walk-in customer",
          phone,
          district: data.district,
          address: data.address.trim(),
        })
        .select("id")
        .single();
      if (customerError) throw new Error(customerError.message);
      customerId = inserted.id;
    }

    const { data: latest, error: latestError } = await supabase
      .from("orders")
      .select("order_number")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw new Error(latestError.message);
    const lastNumber = Number(latest?.order_number?.replace(/\D/g, "") ?? 0);
    const orderNumber = `SFB-${(lastNumber >= 1075 ? lastNumber : 1082) + 1}`;

    const unitPrice = Number(product.selling_price);
    const subtotal = unitPrice * qty;
    const total = subtotal + DEMO_DELIVERY_CHARGE;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        store_id: storeId,
        order_number: orderNumber,
        customer_id: customerId,
        channel: toDbChannel(data.channel),
        status: "new",
        subtotal,
        delivery_charge: DEMO_DELIVERY_CHARGE,
        cod_amount: data.payment === "COD" ? total : 0,
        courier_name: data.courier,
        tracking_number: data.trackingNumber?.trim() || null,
        delivery_district: data.district,
        delivery_address: data.address.trim(),
      })
      .select("id")
      .single();
    if (orderError) throw new Error(orderError.message);

    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: product.id,
      quantity: qty,
      unit_price: unitPrice,
      total: subtotal,
    });
    if (itemError) throw new Error(itemError.message);

    await supabase
      .from("products")
      .update({ stock_quantity: Math.max(0, product.stock_quantity - qty) })
      .eq("id", product.id);

    return { orderNumber };
  });

export const updateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      orderNumber: string;
      status?: OrderStatus;
      courier?: string;
      trackingNumber?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: membership, error: memberError } = await supabase
      .from("store_members")
      .select("store_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (memberError) throw new Error(memberError.message);
    if (!membership) throw new Error("No store found for this account");

    const patch: {
      status?: ReturnType<typeof toDbStatus>;
      courier_name?: string | null;
      tracking_number?: string | null;
    } = {};
    if (data.status) patch.status = toDbStatus(data.status);
    if (data.courier !== undefined) patch.courier_name = data.courier || null;
    if (data.trackingNumber !== undefined)
      patch.tracking_number = data.trackingNumber.trim() || null;

    const { error } = await supabase
      .from("orders")
      .update(patch)
      .eq("store_id", membership.store_id)
      .eq("order_number", data.orderNumber);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: membership } = await supabase
      .from("store_members")
      .select("store_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (!membership) throw new Error("No store found for this account");
    if (membership.role !== "owner") throw new Error("Only the store owner can do that");

    const name = data.name.trim();
    if (!name) throw new Error("Store name is required");

    const { error } = await supabase
      .from("stores")
      .update({ name })
      .eq("id", membership.store_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const loadDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: membership, error: memberError } = await supabase
      .from("store_members")
      .select("store_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (memberError) throw new Error(memberError.message);
    if (!membership) throw new Error("No store found for this account");
    if (membership.role !== "owner")
      throw new Error("Only the store owner can load demo data");

    const storeId = membership.store_id;

    const { count: existingOrders } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId);
    if ((existingOrders ?? 0) > 0)
      throw new Error("This store already has orders — demo data was not loaded");

    const { data: products, error: productError } = await supabase
      .from("products")
      .upsert(
        DEMO_PRODUCTS.map((p) => ({ ...p, store_id: storeId })),
        { onConflict: "store_id,sku" },
      )
      .select("id, sku, selling_price");
    if (productError) throw new Error(productError.message);

    const { data: customers, error: customerError } = await supabase
      .from("customers")
      .insert(DEMO_CUSTOMERS.map((c) => ({ ...c, store_id: storeId })))
      .select("id, phone, district, address");
    if (customerError) throw new Error(customerError.message);

    const productBySku = new Map((products ?? []).map((p) => [p.sku, p]));
    const customerByPhone = new Map((customers ?? []).map((c) => [c.phone, c]));

    const orderRows = DEMO_ORDERS.map((o, index) => {
      const product = productBySku.get(o.sku)!;
      const customer = customerByPhone.get(o.customerPhone)!;
      const subtotal = Number(product.selling_price) * o.quantity;
      const total = subtotal + DEMO_DELIVERY_CHARGE;
      const createdAt = new Date(Date.now() - o.daysAgo * 86_400_000 - index * 3_600_000);
      return {
        store_id: storeId,
        order_number: `SFB-${1075 + (DEMO_ORDERS.length - 1 - index)}`,
        customer_id: customer.id,
        channel: o.channel,
        status: o.status,
        subtotal,
        delivery_charge: DEMO_DELIVERY_CHARGE,
        cod_amount: o.cod ? total : 0,
        courier_name: o.courier_name,
        tracking_number: o.tracking_number,
        delivery_district: customer.district,
        delivery_address: customer.address,
        created_at: createdAt.toISOString(),
      };
    });

    const { data: insertedOrders, error: orderError } = await supabase
      .from("orders")
      .insert(orderRows)
      .select("id, order_number");
    if (orderError) throw new Error(orderError.message);

    const orderIdByNumber = new Map(
      (insertedOrders ?? []).map((o) => [o.order_number, o.id]),
    );

    const itemRows = orderRows.map((row, index) => {
      const demo = DEMO_ORDERS[index]!;
      const product = productBySku.get(demo.sku)!;
      const unitPrice = Number(product.selling_price);
      return {
        order_id: orderIdByNumber.get(row.order_number)!,
        product_id: product.id,
        quantity: demo.quantity,
        unit_price: unitPrice,
        total: unitPrice * demo.quantity,
      };
    });

    const { error: itemError } = await supabase.from("order_items").insert(itemRows);
    if (itemError) throw new Error(itemError.message);

    return { orders: orderRows.length, products: DEMO_PRODUCTS.length };
  });
