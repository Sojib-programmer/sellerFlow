# sellerFlow

The back-office workspace for Bangladeshi social commerce merchants — chat orders, couriers, COD and inventory in one place.

**Live URL:** https://sellerflow.assistant.bd

## Tech Stack

| Technology      | Purpose                                            |
| --------------- | -------------------------------------------------- |
| TanStack Start  | Full-stack React framework with file-based routing |
| React 19        | UI layer                                           |
| TypeScript      | Type safety                                        |
| Supabase        | Auth, Postgres, realtime                           |
| Tailwind CSS v4 | Utility-first styling                              |
| Vite            | Dev server and bundling                            |
| Bun             | Package manager and runtime scripts                |

## Architecture Overview

- **Routing:** File-based routes in `src/routes/`.
- **Layout groups:** `_app.*` files define app-area routes and shared layout behavior.
- **Backend services:** Supabase handles authentication and database operations.
- **Server functions:** TanStack Start server capabilities are used for server-side logic.
- **Database schema/migrations:** Managed in `supabase/` with PLpgSQL migration SQL files.

## Routes Reference

| Route file              | URL            | Description         |
| ----------------------- | -------------- | ------------------- |
| `index.tsx`             | `/`            | Landing / auth gate |
| `_app.dashboard.tsx`    | `/dashboard`   | KPI overview        |
| `_app.inbox.tsx`        | `/inbox`       | Chat order inbox    |
| `_app.orders.index.tsx` | `/orders`      | Order list          |
| `_app.orders.new.tsx`   | `/orders/new`  | New order form      |
| `_app.products.tsx`     | `/products`    | Product / inventory |
| `_app.couriers.tsx`     | `/couriers`    | Courier management  |
| `_app.analytics.tsx`    | `/analytics`   | Analytics           |
| `_app.settings.tsx`     | `/settings`    | Settings            |
| `_app.diagnostics.tsx`  | `/diagnostics` | Dev diagnostics     |

## Local Development (Bun)

```sh
git clone <repo-url>
cd sellerFlow
bun install
cp .env.example .env   # fill in Supabase keys
bun run dev
```

## Available Scripts

| Script         | Command                                                       | Description                          |
| -------------- | ------------------------------------------------------------- | ------------------------------------ |
| `dev`          | `vite dev`                                                    | Start local development server       |
| `build`        | `vite build`                                                  | Build for production                 |
| `build:dev`    | `vite build --mode development`                               | Build with development mode          |
| `preview`      | `vite preview`                                                | Preview production build locally     |
| `typecheck`    | `tsc --noEmit`                                                | Run TypeScript type checks           |
| `lint`         | `eslint . --max-warnings=0`                                   | Lint with warnings treated as errors |
| `lint:fix`     | `eslint . --fix`                                              | Auto-fix lint issues where possible  |
| `format`       | `prettier --write .`                                          | Format files                         |
| `format:check` | `prettier --check .`                                          | Verify formatting                    |
| `check`        | `npm run typecheck && npm run lint && npm run format:check`   | Full quality gate                    |
| `test:smoke`   | `node tests/smoke.mjs`                                        | Run smoke tests                      |
| `perf:budget`  | `node scripts/perf-budget.mjs`                                | Validate bundle budget               |
| `perf:routes`  | `node scripts/route-perf.mjs`                                 | Validate route performance budget    |
| `perf`         | `node scripts/perf-budget.mjs && node scripts/route-perf.mjs` | Run all perf checks                  |

## Database & Migrations

- Supabase configuration and migrations are in `supabase/`.
- Add schema changes as numbered SQL migrations in `supabase/migrations/`.
- Apply local schema updates with:

```sh
supabase db push
```

## Contributing

1. Branch from `main`.
2. Make focused changes.
3. Run `bun run check` before pushing.
4. Keep Lovable history safe: never force-push and never rebase/amend already-pushed commits.
