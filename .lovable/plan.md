# SellerFlow BD — remaining work to close out production

## Done already
Auth (`/auth`, `/reset-password`), `_authenticated` gate, multi-tenant Supabase schema with RLS, live workspace query replacing in-memory state, live dashboard/couriers/analytics/products/settings metrics, owner-only demo seeder, PII stripped from `/orders/new` URL, release label `v1.0.0-beta`, perf budget + CI workflow.

## What's left (this plan)

### 1. Two-user cross-store RLS verification (highest value)
A script that creates two throwaway users, each with their own auto-provisioned store, seeds demo data in store A, then asserts from user B's session that:
- selecting orders/customers/products/order_items returns zero rows from store A
- a direct insert into store A's tables fails
- `renameStore` / `loadDemoData` against store A's id are rejected
- `store_members` for store A is not readable
Output a pass/fail table. This is the proof that tenant isolation actually holds at the database level, not just in the UI.

### 2. Signed-in Playwright + axe sweep
The current smoke suite walks `/dashboard`, `/orders`, etc. — but those routes now redirect to `/auth`, so it is effectively testing the login page across four viewports. Fix:
- restore a Supabase session into the browser context before navigating (cookies + localStorage) so gated routes actually render
- keep the four-viewport sidebar/bottom-nav assertions, the skip-link/Tab-order check and the axe serious/critical gate
- add `/auth` and `/` as explicit public-route cases
- fail on any console error, as today

### 3. Order status / stock regression pass
Confirm through the UI that a full lifecycle (create → confirm → pack → ship → deliver, plus return and cancel) writes correct `order_items`, decrements and restores `stock_quantity`, and that dashboard KPIs and courier COD totals move accordingly.

### 4. Small open items
- Inbox is still labelled sample data with no backing table. Decide: leave as an honest "coming soon" panel (recommended now) or add a `conversations` table.
- Verify email confirmation setting matches intent — currently sign-up shows a "confirm your email" state; instant sign-in needs auto-confirm enabled.
- Re-run `supabase--linter` + security scan after the RLS test, so the closing state is clean.

## Technical notes
- RLS test runs as a Node script using two publishable-key clients with real sessions (never service role), so it exercises the same policy path as the browser.
- Session restore for Playwright uses the injected `LOVABLE_BROWSER_SUPABASE_*` env vars when available; otherwise the script signs in a dedicated test user created by step 1.
- No schema changes are expected. If the RLS test finds a gap, the fix is a policy migration, reported before applying.

## Order
1 → 2 → 3 → 4. Steps 1 and 2 can share the test-user bootstrap.
