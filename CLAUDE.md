# CLAUDE.md

Permanent development instructions for Claude sessions working on this
repository. Read this before making changes.

## What this project is

Peças Luís Santos: an automotive-parts management platform for a business
operating in Portugal. Public catalogue + admin panel, built on
React/Vite/TypeScript + Supabase. Currently in the **foundation phase** —
see [docs/ROADMAP.md](docs/ROADMAP.md) for what exists vs. what's planned.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/DATABASE.md](docs/DATABASE.md) before making structural or schema
changes — they document the decisions already made and why.

## Non-negotiable rules

- **Never** put a Supabase `service_role` key, database password, or any
  other privileged credential in client-side code, a `VITE_`-prefixed env
  var, or anywhere in the repository. Only the public anon key belongs in
  `VITE_SUPABASE_ANON_KEY`.
- **Never** commit `.env`, `.env.local`, or any file containing real
  secrets. `.env.example` documents required variables with placeholder
  values only.
- Database security is enforced with **Row Level Security policies**, not
  by hiding frontend routes. If a table needs restricted access, write the
  RLS policy — don't rely on the UI not showing a button.
- The admin role is enforced at the database layer via `public.is_admin()`
  (see `supabase/migrations/`) — reuse it in new RLS policies rather than
  inventing a parallel authorization check.
- Do not hardcode store-specific values (name, phone, WhatsApp number,
  colours, etc.) in components. They belong in `store_settings` /
  `StoreConfig` (see `src/types/store-config.ts`,
  `src/services/storeConfigService.ts`). The repository name
  ("pecasluissantos") is not the store's public brand name — don't assume
  it is.
- Keep public and admin functionality separated at the routing/layout
  level (`PublicLayout` vs `AdminLayout`, see `src/app/routes.tsx`). Don't
  let admin-only UI or data leak into public routes.
- User-facing text is European Portuguese (PT-PT). Code, identifiers,
  comments, commit messages and docs are English.
- Avoid introducing a backend server, a new state-management library, a
  CSS framework alongside Tailwind, or other significant new dependencies
  without first checking whether the existing stack already covers the
  need — this project deliberately stays small.

## Working method

- Do not implement speculative features. Build what's needed for the
  current, explicitly-requested task.
- If a change would require a new table, prefer adding a focused migration
  over widening an existing table's purpose — but don't create tables
  "just in case." Document proposed-but-not-yet-built schema in
  `docs/DATABASE.md` instead of migrating it early.
- If a requirement conflicts with an established architectural decision
  (documented in `docs/ARCHITECTURE.md`), say so and explain the tradeoff
  before changing the architecture — don't silently diverge.
- After a meaningful change: run `npm run build` (type-checks and builds)
  and `npm run lint`. Both must pass before considering work done.
- Keep documentation in `docs/` in sync with what's actually implemented.
  Don't describe features that don't exist yet.

## Common commands

```bash
npm install
npm run dev            # dev server
npm run build           # tsc -b && vite build
npm run lint             # oxlint
npm run format           # prettier --write .
```

## Supabase migrations

SQL files in `supabase/migrations/` are numbered and applied in order.
There is no Supabase project linked to this repo by default — migrations
are written/reviewed here but applied manually (Supabase SQL editor or
CLI) against whichever project the developer is using. When adding a
migration, follow the existing style: a comment block explaining the
_why_, not just the _what_, above the SQL.
