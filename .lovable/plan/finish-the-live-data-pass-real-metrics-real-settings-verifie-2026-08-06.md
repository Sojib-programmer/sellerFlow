# Finish the live-data pass: real metrics, real settings, verified isolation

Auth, the `_authenticated` gate, the query-backed store and the core server functions are in place. What is still fake or unverified: every KPI, chart and courier card on the app pages, the Settings page (static text, no demo-data button, no store rename), customer name/phone still travelling in the `/orders/new` URL, and no executed cross-store RLS or accessibility run. No redesign — same routes, same layout, same components.

## What changes for the user

- Dashboard KPIs (today's orders, today's revenue, pending confirmation, COD to collect), the weekly bar chart and the channel-share list are computed from your store's real orders instead of fixed numbers. Greeting uses your own name.
- Delivery & couriers cards are built from your own orders grouped by courier name: parcel count, delivered share, average handling time, outstanding COD. Couriers with no orders are not shown; empty state explains why.
- Analytics shows real revenue trend, real channel mix, real top districts and real return rate, with an empty state when there is not enough history.
- Products page can add and edit a product (name, SKU, price, stock, low-stock threshold, active) and shows live low-stock warnings.
- Inbox stays a clearly labelled "coming soon" surface rather than pretending to be live chat data.
- Settings becomes functional: rename your store, see your own role and team members, and — owner only — a "Load demo data" button that is disabled once the store already has orders and is safe to press twice.
- Creating an order from a chat message no longer puts the customer name or phone in the address bar.
- Every page keeps skeleton loading, empty-with-next-action, and error-with-retry states; mutations show success/failure toasts.

## Technical approach

- New authenticated server functions in `src/lib/sellerflow.functions.ts` (all `.middleware([requireSupabaseAuth])`, store id resolved from the caller's `store_members` row, any client-supplied store id ignored): `dashboardMetrics`, `courierSummary`, `analyticsSummary`, `listMembers`. Aggregation happens in SQL/JS on the server; only rolled-up numbers cross the wire — no customer rows leave the server for metric surfaces.
- `src/lib/sellerflow-store.tsx` gains query hooks for the new fetchers plus `isOwner` derived from the workspace payload, so pages keep using `useSellerFlow()`.
- Dashboard/couriers/analytics drop their module-level constants (`week`, `weeks`, `insights`, `couriersPerformance`, `channelShare` usage) and read the new query data. `sellerflow-data.ts` keeps only types, formatters and class helpers; demo arrays stay used exclusively by the server-side seeder.
- Settings is rebuilt from the same card markup: store profile card wired to `renameStore`, team card to `listMembers`, and an owner-gated demo card calling `loadDemoData` with `useMutation` + query invalidation. Non-owners see a read-only note, not a disabled mystery button.
- `/orders/new` `validateSearch` narrows to non-PII keys only (`channel`, optional `product`); the prefill of name/phone moves to in-memory state passed through the dialog hook.
- Products add/edit dialog reuses `upsertProduct`.
- Dashboard greeting uses the session user's metadata name with an email-local-part fallback, from the existing gate context — no new fetch.

## Verification

- `bunx tsgo --noEmit` and a production build, output read in full.
- Cross-store RLS script under `tests/`: two users in two stores; for all six tables assert user B cannot read, insert, update or delete user A's rows. Every table/operation result reported; partial success counts as failure.
- Playwright pass signed in with the injected session over `/`, `/auth`, and every protected route at 375/768/1024/1440 px, failing on console errors, failed requests, or axe violations; plus an unauthenticated pass asserting each protected route redirects to `/auth`.
- Mobile More-sheet keyboard check: focus trap, Escape closes, focus returns to trigger.

Failures are reported with raw test output rather than smoothed over.
