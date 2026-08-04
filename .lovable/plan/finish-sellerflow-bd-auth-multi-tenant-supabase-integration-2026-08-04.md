# Finish SellerFlow BD auth + multi-tenant Supabase integration

The schema, RLS helpers, signup trigger and server functions already exist. What is missing is the auth surface, the route gate, and the UI still reading the in-memory demo store. No visual redesign — route paths, shell, sidebar, bottom nav and page layouts stay as they are.

## What changes for the user

- New public `/auth` page (sign up / sign in) in the existing design language, with inline field errors, submit spinners, success toasts, and password reset via email.
- Signup signs you straight in (email auto-confirm enabled) and provisions one store with you as owner.
- Everything except `/` and `/auth` requires sign-in; unauthenticated visits land on `/auth` and are returned to the page they wanted after login.
- `/diagnostics` additionally requires the owner role; non-owners see a clear "owners only" state instead of an error.
- Dashboard, orders, order detail/create, products, customers, couriers, analytics and settings all read live store data with skeleton loading, empty states with a next action, error states with retry, and success toasts.
- Settings gets an owner-only "Load demo data" button, disabled once the store has data, safe to click twice.
- Header shows session-aware account state with sign-out.
- Release label reads `v1.0.0-beta` instead of `dev`.

## Technical approach

- `src/routes/auth.tsx` — public, SSR on, no gate. Email/password via the browser Supabase client; redirect target carried as a sanitized same-origin `redirect` search param.
- `src/routes/_authenticated/route.tsx` — integration-managed gate (`ssr: false`, `getUser()`, redirect to `/auth`). Existing `_app.*.tsx` route files move to `_authenticated/_app.*` so URLs are unchanged; only file names and `createFileRoute` strings change plus `routeTree.gen.ts` regeneration.
- Owner gate for diagnostics: `getDiagnostics` already enforces authenticated + owner server-side; the page renders a role-aware empty state rather than throwing.
- `src/lib/sellerflow-store.tsx` becomes a thin adapter over TanStack Query around `getWorkspace` / `createOrder` / `updateOrder` / `loadDemoData`, so `dialogs.tsx`, `primitives.tsx` and the page files keep their current `useSellerFlow()` calls. Loading/error/empty flags are added to the context value and consumed per page.
- New server functions for the remaining surfaces: `listCustomers`, `upsertProduct`, `courierSummary`, `analyticsSummary`, plus store settings read. All use `.middleware([requireSupabaseAuth])`, resolve `store_id` from the caller's `store_members` row, and ignore any client-supplied store id.
- `loadDemoData` gets an idempotency guard tightened to a single owner-scoped precondition check plus `onConflict` upserts, so a double click is a no-op instead of an error.
- Privacy: order detail navigates by opaque order id/number only — no names, phones or addresses in URLs; telemetry payloads keep the existing PII scrubbing, and no server function logs row contents.
- Release label: `VITE_RELEASE` defaults to `v1.0.0-beta` in `telemetry-client.ts` and the footer/settings label reads the same constant.
- Auth config: enable email auto-confirm so signup returns a session.

## Cross-store RLS verification

A script under `tests/` signs in two users belonging to two different stores and, for each of the six tables, asserts that user B cannot SELECT, INSERT, UPDATE or DELETE user A's rows (expecting empty result sets or policy errors, never partial success). Results reported per table per operation.

## Verification

- `bunx tsgo --noEmit` and a production build.
- Playwright over `/`, `/auth` and every protected route at 375 / 768 / 1024 / 1440 px, signed in via the injected session, failing on console errors, failed requests or axe violations.
- Unauthenticated pass asserting each protected route redirects to `/auth`.
- Mobile More-sheet: focus trap, Escape closes, focus returns to the trigger, and the trigger/sheet expose accessible names.

Failures are reported with the exact test output, not papered over.
