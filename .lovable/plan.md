## Goal

Four production-grade tracks on top of the merged SellerFlow app: build performance guardrails, accessibility fixes in the nav chrome, a real error-reporting pipeline with an in-app dashboard, and CI that fails on console errors.

Current state verified: no `.github/` directory exists, `package.json` has only dev/build/lint/format scripts (no test or perf tooling, no Playwright dep), and the nav chrome lives in `src/components/sellerflow/app-shell.tsx` (desktop `<aside>`, mobile bottom `<nav>`, shadcn/Radix `Sheet` for "More"). Client error plumbing exists (`src/lib/lovable-error-reporting.ts`, `src/lib/error-capture.ts`, root `errorComponent`) but only reports into the Lovable editor preview — nothing is persisted or queryable.

---

## 1. Build performance checks

- Add `scripts/perf-budget.mjs`: runs after `vite build`, walks the client output dir, and reports gzipped size per entry/chunk plus a total. Fails with a non-zero exit when any budget in `perf-budget.json` is exceeded.
- Budgets seeded from the current build (initial JS, initial CSS, total client bundle), with ~10% headroom so today's build passes and regressions trip.
- Add `scripts/lighthouse-check.mjs`: boots the production build (`vite preview`), drives headless Chromium via Playwright, and measures real route metrics for `/`, `/dashboard`, `/orders`, `/inbox`, `/products`, `/couriers`, `/analytics`, `/settings`, `/orders/new` — FCP, LCP, CLS, TTFB, DOM-content-loaded, transfer size — from the Performance/PerformanceObserver APIs. Thresholds live in the same config; any route over budget fails.
- New scripts: `perf:budget`, `perf:routes`, `perf` (both), plus `test:smoke`.
- Note: full Google Lighthouse needs a Node+Chrome host that CI has but the Worker runtime doesn't; the Playwright-driven metric harness gives the same regression signal without pinning a Lighthouse binary. If you want literal Lighthouse scores in CI, we add `lighthouse` as a CI-only devDependency in a follow-up step.

## 2. Accessibility audit + fixes for sidebar / mobile nav / bottom sheet

Audit all three surfaces, then apply fixes. Expected work based on reading `app-shell.tsx`:

- **Landmarks**: desktop `<aside>` and the mobile bottom `<nav aria-label="Primary">` both render simultaneously in the DOM (visibility is CSS-only), so screen readers announce two navigations. Give each a distinct, honest label and hide the offscreen one from AT.
- **Current page**: nav links carry active *styling* only. Add `aria-current="page"` driven by the same `pathname.startsWith` check.
- **Active-route bug**: `pathname.startsWith("/orders")` also matches `/orders/new`, so two items can read as active at once. Tighten matching to exact-or-child-segment.
- **Badges**: the coral count pills are bare numbers — `3` next to "Inbox" reads as "Inbox 3". Add visually-hidden text ("3 unread") and `aria-hidden` on the decorative pill.
- **Tap targets**: mobile nav items and `size="icon"` triggers get `min-h-11` to clear 44x44.
- **Sheet**: Radix handles focus trap/restore and Escape; verify trigger→content focus move and that closing a link returns focus sensibly. Add a `SheetDescription` (or `aria-describedby`) since Radix warns when it's missing, and confirm links inside are reachable by keyboard in order.
- **Focus visibility**: ensure `focus-visible` rings on all sidebar/bottom-nav links using design tokens (no hardcoded colors).
- **Skip link**: add a "Skip to content" link and an `id` target on the `<main>` content wrapper.
- Verified with a Playwright keyboard-only pass (Tab order, Enter activation, Escape on the sheet) plus an axe-core scan on every route; both wired into the smoke test.

## 3. Production error reporting + dashboard

- Enable Lovable Cloud (Postgres + server functions) for persistence.
- Migration creates `public.error_events` (id, occurred_at, level, message, stack, route, user_agent, release, session_id, extra jsonb, fingerprint) with GRANTs, RLS enabled, an insert path for anonymous clients scoped to a narrow policy, and read access limited to an admin role stored in a separate `user_roles` table via a `has_role` security-definer function. Seeded with a few literal demo rows so the dashboard renders non-empty immediately.
- `src/lib/telemetry.functions.ts`: `reportErrorEvent` server function (Zod-validated, rate-limit-friendly, drops obvious PII) and `listErrorEvents` / `errorStats` readers for the dashboard.
- `src/lib/telemetry-client.ts`: installs `window.onerror`, `unhandledrejection`, and a `console.error` wrapper (mirroring the existing `error-capture.ts` approach, without double-reporting), batches with `sendBeacon`-style flushing, dedupes by fingerprint, and is mounted once from `__root.tsx`. The root `errorComponent` and a new route-level error boundary both feed it.
- New route `/_app/diagnostics`: error-rate sparkline, group-by-fingerprint table with counts and last-seen, route/level filters, and a detail panel with stack + context. Added to nav under the "More" sheet.

## 4. CI workflow

- `.github/workflows/ci.yml`, triggered on push and pull_request:
  1. install (bun, frozen lockfile)
  2. `bun run lint` + `bunx tsgo --noEmit`
  3. `bun run build`
  4. `bun run perf:budget` (fails on bundle regression)
  5. serve the production build, then `bun run test:smoke` — Playwright across mobile/tablet/laptop/desktop viewports over all routes, asserting responsive chrome (sidebar ≥1024px, bottom nav <1024px), running axe-core, and **failing the job on any console error or page error**, plus `bun run perf:routes`
  6. upload screenshots, axe reports, and the perf JSON as artifacts
- Smoke tests move from `/tmp` into a committed `tests/` directory so CI and local runs share one harness.

## Technical notes

- Console-error failure is enforced by collecting `page.on("console")` (level `error`) and `page.on("pageerror")` into a per-route array and asserting empty at teardown; known-benign lines go into an explicit, small allowlist rather than a broad regex.
- Playwright becomes a devDependency and CI installs only Chromium.
- The telemetry `console.error` hook must not re-report errors that `error-capture.ts` already expanded — the client hook is browser-only and keys off a marker to avoid loops.
- No color literals in any new UI; all styling goes through the existing OKLCH token set in `src/styles.css`.

## Verification before I report done

Production build green, perf budget green, typecheck + lint clean, smoke suite green across four viewports with zero console errors, axe scan clean on every route, and a screenshot of the diagnostics dashboard showing captured events.
