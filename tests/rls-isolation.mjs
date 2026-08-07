// Two-user cross-store RLS verification.
//
// Creates two throwaway users with the publishable (anon) key, so every query
// below travels the exact same policy path as the browser client. The service
// role key is deliberately NOT used anywhere in this script.
//
// Usage: bun tests/rls-isolation.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* env already provided */
  }
}
loadEnv();

const URL = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
const KEY =
  process.env["SUPABASE_PUBLISHABLE_KEY"] ??
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
if (!URL || !KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const results = [];
function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function client() {
  return createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

const stamp = Date.now();
async function makeUser(tag, storeName) {
  const email = `rls-${tag}-${stamp}@example.com`;
  const password = `Test-${stamp}-${tag}!`;
  const sb = client();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { store_name: storeName } },
  });
  if (error) throw new Error(`signUp(${tag}): ${error.message}`);
  if (!data.session) {
    const { error: signInError } = await sb.auth.signInWithPassword({ email, password });
    if (signInError) {
      throw new Error(
        `No session for ${tag} (${signInError.message}). Email confirmation is likely enabled — enable auto-confirm to run this test.`,
      );
    }
  }
  const { data: userData } = await sb.auth.getUser();
  const userId = userData.user?.id;
  // The signup trigger provisions the store; give it a beat on cold starts.
  let store = null;
  for (let i = 0; i < 10 && !store; i += 1) {
    const { data: stores } = await sb.from("stores").select("id, name, slug").limit(1);
    store = stores?.[0] ?? null;
    if (!store) await new Promise((r) => setTimeout(r, 300));
  }
  if (!store) throw new Error(`No auto-provisioned store for ${tag}`);
  return { sb, email, userId, store };
}

async function seedStoreA(a) {
  const { error: custErr } = await a.sb.from("customers").insert({
    store_id: a.store.id,
    name: "Rahim Uddin",
    phone: "+8801711000111",
    district: "Dhaka",
    address: "House 4, Road 7, Dhanmondi",
  });
  if (custErr) throw new Error(`seed customer: ${custErr.message}`);
  const { data: customer } = await a.sb.from("customers").select("id").limit(1).single();

  const { data: product, error: prodErr } = await a.sb
    .from("products")
    .insert({
      store_id: a.store.id,
      name: "Jamdani Saree",
      sku: `JAM-${stamp}`,
      selling_price: 3200,
      stock_quantity: 12,
    })
    .select("id")
    .single();
  if (prodErr) throw new Error(`seed product: ${prodErr.message}`);

  const { data: order, error: orderErr } = await a.sb
    .from("orders")
    .insert({
      store_id: a.store.id,
      order_number: `A-${stamp}`,
      customer_id: customer.id,
      channel: "facebook",
      status: "confirmed",
      subtotal: 3200,
      delivery_charge: 80,
      cod_amount: 3280,
      courier_name: "Pathao",
      delivery_district: "Dhaka",
    })
    .select("id")
    .single();
  if (orderErr) throw new Error(`seed order: ${orderErr.message}`);

  const { error: itemErr } = await a.sb.from("order_items").insert({
    order_id: order.id,
    product_id: product.id,
    quantity: 1,
    unit_price: 3200,
    total: 3200,
  });
  if (itemErr) throw new Error(`seed order item: ${itemErr.message}`);

  return { customerId: customer.id, productId: product.id, orderId: order.id };
}

async function main() {
  const a = await makeUser("a", "Dhaka Fashion House");
  const b = await makeUser("b", "Chattogram Gadget Bazar");
  check("each signup auto-provisions its own store", a.store.id !== b.store.id, `${a.store.id.slice(0, 8)} vs ${b.store.id.slice(0, 8)}`);

  const seeded = await seedStoreA(a);
  check("owner A can write and read its own store data", true, "customer + product + order + item");

  // --- Reads: B must see nothing of A ---
  for (const table of ["orders", "customers", "products"]) {
    const { data, error } = await b.sb.from(table).select("id, store_id");
    const leaked = (data ?? []).filter((r) => r.store_id === a.store.id);
    check(`B reads no ${table} rows from store A`, !error && leaked.length === 0, error?.message ?? `${leaked.length} leaked`);
  }
  {
    const { data, error } = await b.sb.from("order_items").select("id, order_id");
    const leaked = (data ?? []).filter((r) => r.order_id === seeded.orderId);
    check("B reads no order_items from store A", !error && leaked.length === 0, error?.message ?? `${leaked.length} leaked`);
  }
  {
    const { data, error } = await b.sb.from("stores").select("id").eq("id", a.store.id);
    check("B cannot read store A row", !error && (data ?? []).length === 0, error?.message ?? "");
  }
  {
    const { data, error } = await b.sb
      .from("store_members")
      .select("id, store_id, user_id")
      .eq("store_id", a.store.id);
    check("B cannot read store A membership", !error && (data ?? []).length === 0, error?.message ?? "");
  }
  {
    const { data, error } = await b.sb.from("orders").select("id").eq("id", seeded.orderId);
    check("B cannot fetch store A order by id", !error && (data ?? []).length === 0, error?.message ?? "");
  }

  // --- Writes: B must be rejected against store A ---
  {
    const { error } = await b.sb.from("orders").insert({
      store_id: a.store.id,
      order_number: `B-INTRUDE-${stamp}`,
      channel: "manual",
      subtotal: 1,
      cod_amount: 1,
    });
    check("B cannot insert an order into store A", Boolean(error), error?.message ?? "insert succeeded");
  }
  {
    const { error } = await b.sb
      .from("customers")
      .insert({ store_id: a.store.id, name: "Intruder", phone: "+8801700000000" });
    check("B cannot insert a customer into store A", Boolean(error), error?.message ?? "insert succeeded");
  }
  {
    const { error } = await b.sb
      .from("products")
      .insert({ store_id: a.store.id, name: "Intruder SKU", sku: `INT-${stamp}` });
    check("B cannot insert a product into store A", Boolean(error), error?.message ?? "insert succeeded");
  }
  {
    const { error } = await b.sb
      .from("order_items")
      .insert({ order_id: seeded.orderId, quantity: 9, unit_price: 0, total: 0 });
    check("B cannot attach order_items to store A order", Boolean(error), error?.message ?? "insert succeeded");
  }
  {
    const { data, error } = await b.sb
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", seeded.orderId)
      .select("id");
    check("B cannot update a store A order", !error && (data ?? []).length === 0, error ? error.message : `${(data ?? []).length} rows updated`);
  }
  {
    const { data, error } = await b.sb
      .from("stores")
      .update({ name: "Hijacked" })
      .eq("id", a.store.id)
      .select("id");
    check("B cannot rename store A", !error && (data ?? []).length === 0, error ? error.message : `${(data ?? []).length} rows updated`);
  }
  {
    const { data, error } = await b.sb
      .from("orders")
      .delete()
      .eq("id", seeded.orderId)
      .select("id");
    check("B cannot delete a store A order", !error && (data ?? []).length === 0, error ? error.message : `${(data ?? []).length} rows deleted`);
  }
  {
    const { data, error } = await b.sb
      .from("store_members")
      .insert({ store_id: a.store.id, user_id: b.userId, role: "owner" })
      .select("id");
    check("B cannot grant itself membership of store A", Boolean(error) || (data ?? []).length === 0, error?.message ?? "insert succeeded");
  }

  // --- Store A data still intact after B's attempts ---
  {
    const { data } = await a.sb.from("orders").select("id, status").eq("id", seeded.orderId);
    check("store A order survived intact", data?.[0]?.status === "confirmed", data?.[0]?.status ?? "missing");
  }

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\nERROR: ${err.message}`);
  process.exit(1);
});
