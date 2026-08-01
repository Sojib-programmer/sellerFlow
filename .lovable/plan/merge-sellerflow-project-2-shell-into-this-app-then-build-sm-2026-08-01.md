# Merge SellerFlow project 2 shell into this app, then build + smoke test

Full merge: this project keeps its data/state layer (orders, products, inbox, courier data) but adopts project 2's chrome, primitives, tokens and route structure. Then a production build and a scripted multi-viewport smoke test of every route.

## What changes

**1. Design tokens**
Adopt project 2's token set in `src/styles.css` while keeping the status/channel utilities this app already relies on. Adds what project 2's components need: `surface`, `navy`, `coral` (+ `coral-soft`), `amber` (+ soft), `primary-soft`, `shadow-card`/`shadow-lift`, `card-surface` and `num` utilities, radius scale and the dark-mode block.

**2. Chrome components** (new, under `src/components/sellerflow/`)
- `logo.tsx` — ported verbatim (sm/md/lg, mark + wordmark).
- `app-shell.tsx` — ported: fixed 16rem desktop sidebar (`lg:flex`), sticky mobile top header with logo + "New" action, mobile bottom nav with 4 primary items + a "More" bottom sheet for Couriers/Analytics/Settings. Sign-out UI is dropped (no auth). Store name/owner rendered from a static settings constant.
- `footer.tsx` — new (project 2 has none): brand line, workspace links, courier/support links, copyright. Rendered inside the shell's `<main>` below content on desktop, and above the bottom nav padding on mobile.
- `badges.tsx`, `order-drawer.tsx` merged with the existing `primitives.tsx` / `dialogs.tsx`; project 2's `page-header.tsx` replaces the current one where its API is a superset.
- Nav badges are derived from existing state: Orders = count of `status === "New"`, Inbox = length of `conversations`. `nav.tsx` is deleted once `app-shell.tsx` replaces it.

**3. Routing (adopt project 2's layout)**
```text
/                     landing page (project 2's welcome, CTA -> /dashboard, no auth gate)
/_app                 pathless layout rendering <AppShell><Outlet/></AppShell>
/_app/dashboard       -> /dashboard   (current index.tsx content moves here)
/_app/orders/         -> /orders
/_app/orders/new      -> /orders/new  (full-page create form; dialog kept for inbox quick-add)
/_app/inbox, /_app/products, /_app/couriers, /_app/analytics, /_app/settings
```
`/delivery` becomes `/couriers` to match project 2's nav. `__root.tsx` stops rendering sidebar/mobile nav directly — chrome moves into `_app.tsx` so the landing page renders without app chrome. Each route keeps its own `head()` metadata with route-specific title/description/og tags; `/` gets landing-specific copy.

**4. Verification**
- `bun run build` (production, Worker target) — must exit 0 with no error text in output.
- Playwright script under `/tmp/browser/`: visit `/`, `/dashboard`, `/orders`, `/orders/new`, `/inbox`, `/products`, `/couriers`, `/analytics`, `/settings` at 375x812, 768x1024, 1024x800 and 1440x900. For each: capture console errors/warnings and failed requests, assert bottom nav visible + sidebar hidden below `lg`, sidebar visible + bottom nav hidden at/above `lg`, and screenshot. The "More" sheet is opened and its links clicked at mobile width. Any console error or layout assertion failure is fixed before reporting.
- Reference for visual parity is project 2's rendered shell (ported markup + tokens), verified against the captured screenshots.

## Technical notes

- Store stays client-side React context (`sellerflow-store.tsx`); no Cloud, no auth, no `signIn`/`signOut`/`hydrated` gating — the `_app` layout renders immediately, so there is no SSR/hydration skeleton flash.
- `sheet.tsx` and `skeleton.tsx` already exist in `src/components/ui/`, so the More sheet needs no new dependency.
- `tw-animate-css` import in project 2's stylesheet is only added if it is already a dependency here; otherwise the equivalent animations already shipped in this project's CSS are kept.
- Route filenames follow TanStack dot convention (`_app.orders.index.tsx`, `_app.orders.new.tsx`) with `createFileRoute` strings including the `_app` segment; `routeTree.gen.ts` is left to the plugin.
- Old route files (`index.tsx` dashboard body, `delivery.tsx`) are moved, not duplicated, so `/` has exactly one claimant.
