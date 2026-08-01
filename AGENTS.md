<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# sellerFlow — Agent Instructions

## Stack

- TanStack Start (file-based routing, `src/routes/`)
- React 19 + TypeScript strict
- Supabase (auth + Postgres + realtime)
- Tailwind CSS v4 (utility-first, no `@apply` abuse)
- Bun as package manager and runtime

## Rules

- Never force-push or rebase/amend pushed commits (Lovable constraint).
- Keep `main` branch always buildable (`bun run build` must pass).
- Run `bun run check` (typecheck + lint + format) before committing.
- Route files live in `src/routes/`. Do NOT create `src/pages/`.
- DB changes go in `supabase/migrations/` as numbered SQL files.
- Do not commit `.env` — use `.env.example` for key scaffolding.
- Prefer `sonner` for toasts, `lucide-react` for icons.
- COD and courier integrations are Bangladesh-specific — handle BDT currency, BD phone validation.

## Quality gate

`bun run check` → `tsc --noEmit && eslint . --max-warnings=0 && prettier --check .`
