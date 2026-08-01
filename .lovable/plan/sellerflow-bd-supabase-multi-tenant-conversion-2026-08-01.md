# SellerFlow BD — Supabase multi-tenant conversion

Turn the in-memory demo workspace into a real multi-store app on Supabase Auth + Postgres, keeping the current visual design, tokens, and route names intact.

## What changes for the user

- New public `/auth` page (email + password sign-up and sign-in) matching the existing design language.
- The landing page at `/` stays public; the workspace (`/dashboard`, `/orders`, `/orders/new`, `/products`, `/inbox`, `/couriers`, `/analytics`, `/settings`, `/diagnostics`) moves behind sign-in with the same layout, sidebar, and mobile nav.
- On first sign-up a store is created automatically and the user becomes its owner. Store name/slug derive from the sign-up name and are editable in Settings.
- Dashboard, orders list, order detail, order creation, and products all read and write live store data.
- A "Load demo data" button in Settings — visible only to the store owner, and only while the store is empty-ish — seeds realistic Bangladesh social-commerce records (customers, products, orders with items across Facebook/WhatsApp/TikTok/Instagram, Pathao/Steadfast/RedX couriers, Dhaka/Chattogram/Sylhet districts).
- Every data surface gets explicit loading skeletons, empty states with a clear next action, error states with retry, and success toasts.
- Money renders as ৳ everywhere; districts come from the existing Bangladesh district list; phone fields accept `01XXXXXXXXX` style input.
- Courier name and tracking number are plain manual fields — no courier API work.

## Database

Six tables in `public`, exactly as specified, each with RLS enabled and explicit grants:

`stores`, `store_members`, `customers`, `products`, `orders`, `order_items`.

Types: `store_role` (owner | manager | staff), `order_channel` (facebook | whatsapp | instagram | tiktok | manual), `order_status` (new | confirmed | packed | shipped | delivered | returned | cancelled). Money as `numeric(12,2)`, `updated_at` trigger on `orders`.

Access model:

- Security-definer helpers `public.is_store_member(store_id)` and `public.store_role(store_id)` read `store_members` without recursive RLS.
- Every tenant table is readable/writable only when the caller has a `store_members` row for that `store_id`; `order_items` resolves the store through its parent order.
- Destructive store-level operations (rename, delete, seed) require role `owner`.
- `store_members` self-select plus owner-manage policies; no role column on any profile table.
- Auto-provisioning on first sign-up runs as a trigger on `auth.users` → insert `stores` + `store_members(owner)`, using a slug derived from email/name with a uniqueness suffix.
- Grants: `SELECT/INSERT/UPDATE/DELETE` to `authenticated`, `ALL` to `service_role`, no `anon` grants (nothing is publicly readable).

## Technical approach

- Auth gate: integration-managed `src/routes/_authenticated/route.tsx` (`ssr: false`, redirect to `/auth`). Existing `_app` layout becomes `_authenticated/_app`-style so the shell and route paths are preserved; route file renames only, no layout redesign. `src/routes/index.tsx` stays public and becomes session-aware (CTA → `/auth` or `/dashboard`).
- Data access via `createServerFn` with `.middleware([requireSupabaseAuth])` in `src/lib/*.functions.ts`: `stores.functions.ts` (current store + membership + role), `orders.functions.ts` (list, get, create with items, update status/courier/tracking), `products.functions.ts` (list, upsert, stock adjust), `customers.functions.ts` (find-or-create by phone), `seed.functions.ts` (owner-only demo seeding, single transaction-style batch).
- No protected loaders on public routes; protected routes use loader `ensureQueryData` + `useSuspenseQuery` under the gate, or `useQuery` where interaction-driven.
- `src/lib/sellerflow-store.tsx` React context is replaced by TanStack Query hooks; `useSellerFlow()` is kept as a thin adapter so existing components (`dialogs.tsx`, `primitives.tsx`, page files) need minimal edits.
- `src/lib/sellerflow-data.ts` keeps DISTRICTS, COURIERS, DELIVERY_CHARGE, and the `money()` formatter (৳); seed arrays move server-side into the demo seeder, and the display labels map to/from the lowercase DB enums.
- Order numbers: `SFB-<counter>` generated server-side per store from the current max, kept in `orders.order_number`.
- Sign-out follows the standard teardown (cancel queries → clear cache → `signOut()` → replace-navigate to `/auth`); header shows session-aware account state instead of a static button.
- Existing telemetry, perf budget scripts, CI smoke suite, and a11y work stay as-is; smoke test route list updates for `/auth` and the gated paths.

## Order of work

1. Migration (schema, enums, grants, RLS, helpers, signup trigger, `updated_at` trigger).
2. Auth route + gate + session-aware header/sign-out.
3. Server functions and query hooks; swap the context store behind `useSellerFlow`.
4. Wire dashboard, orders, order detail/create, products to live data with loading/empty/error/success states.
5. Owner-only "Load demo data" in Settings.
6. Verify: typecheck, production build, and an authenticated Playwright pass over every route at the existing viewports with zero console errors.
