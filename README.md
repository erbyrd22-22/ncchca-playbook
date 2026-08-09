# NCCHCA Conference & Event Playbook — web app

A living playbook. The content lives in Postgres, authorized users edit it in the
browser, and each real event runs its own instance of the same template with its
own progress, owners, and dates.

Built by Leverage AI Strategies. Brand colors and type sampled from ncchca.org.

---

## The core idea: template vs. instance

This is the one concept worth understanding before touching the code.

**Template layer** — `section` → `block` → `item`. This is the playbook itself:
Part 1 Foundations, the nine timeline phases, all 71 checklist items. Editing here
changes the playbook for everyone.

**Instance layer** — `instance` + `item_state`. An instance is one real event
running the playbook: *2027 Annual Primary Care Conference*, *HCCN Excel Dashboard
Series — Fall 2026*. Checking a box, assigning an owner, or setting a due date
writes to `item_state`, scoped to that instance only.

So: fix a typo in a checklist item once, and every event sees the fix. Check that
item off for the 2027 conference, and the 2028 conference is unaffected.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions) |
| Database | Postgres — Supabase in production |
| Auth | Supabase Auth (email invite), roles in `app_user` |
| Authorization | App-layer checks **and** Postgres RLS |
| Data access | `postgres.js`, server-side only |
| Styling | Plain CSS custom properties, no framework |

No ORM. The queries are short enough to read, and the schema is the documentation.

---

## Running locally

Requires Node 20+ and a Postgres 16 instance.

```bash
npm install
cp .env.example .env.local        # then edit DATABASE_URL
npm run seed                      # creates schema content + 3 demo instances
npm run dev                       # http://localhost:3100
```

`.env.local`:

```
DATABASE_URL=postgres://user@host:5432/playbook
AUTH_MODE=dev
```

With `AUTH_MODE=dev` there is no login. A role switcher appears in the top-right so
you can move between **admin**, **editor**, and **viewer** and see exactly what each
one can do. This switcher is disabled whenever `AUTH_MODE=supabase`.

Apply the schema before seeding:

```bash
psql "$DATABASE_URL" -f db/001_schema.sql
```

---

## Roles

| | Viewer | Editor | Admin |
|---|:--:|:--:|:--:|
| Read the playbook | ✓ | ✓ | ✓ |
| Check items, set owners / due dates / notes | | ✓ | ✓ |
| Edit playbook content, add / reorder / delete items and blocks | | ✓ | ✓ |
| Edit event details | | ✓ | ✓ |
| Create and delete event instances | | | ✓ |
| Reset an event's progress | | | ✓ |

Enforced twice: every server action calls `requireEditor()` / `requireAdmin()`, and
`db/002_rls.sql` applies matching Row Level Security policies so the database
refuses unauthorized writes even if something reaches it directly.

---

## Deploying to Supabase + Railway

See **DEPLOY-CHECKLIST.md** for the full step-by-step. The short version:

```bash
DATABASE_URL="<supabase session-mode string>" ADMIN_EMAIL="you@domain.com" npm run setup
```

Then run `db/003_auth_sync.sql` in the Supabase SQL editor, push to GitHub, deploy
on Railway with these four variables:

```
DATABASE_URL=<supabase POOLED string, port 6543>
AUTH_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://[REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

and add `https://your-domain/auth/callback` to Supabase → Authentication → URL
Configuration → Redirect URLs. Magic links fail silently until you do.

Use the **pooled** connection (port 6543) on Railway. The direct connection will
exhaust Postgres connections under any real traffic.

---

## What is not built yet

Being explicit so nothing is assumed:

- **Comments.** Table, action, and RLS exist; no UI surfaces them yet.
- **Drag-and-drop reordering.** Items move with ↑ ↓ buttons. Blocks don't reorder.
- **Rich text.** Editable fields accept inline HTML (`<b>`, `<i>`) and are
  sanitized on write, but there's no formatting toolbar.
- **File attachments** on items or appendices.
- **The Appendix A–Q templates** themselves. Part 7 lists them; the files don't exist.

## Known issues to close before real users

1. **No optimistic UI outside checkboxes.** Owner/date/note changes wait for the
   round-trip. Fine on a fast connection, noticeable on a slow one.
2. **`item_state` rows are created lazily.** A never-touched item has no row. The
   progress view handles this with `left join`; new queries must too.

---

## Layout

```
app/
  page.tsx                     redirect to the first instance
  i/[slug]/[section]/page.tsx  the playbook view
  i/[slug]/settings/page.tsx   event, instances, people, activity
  i/[slug]/search/page.tsx     full-text search across the template
components/
  Shell.tsx                    layout, sidebar, progress
  TopBar.tsx                   instance picker, search, edit toggle, role
  Blocks.tsx                   block renderers, checklist rows, inline editing
  LoginForm.tsx                magic link + password sign-in
middleware.ts                  session refresh + route protection
app/
  login/page.tsx               sign-in screen
  auth/callback/route.ts       magic-link exchange, creates app_user row
  auth/signout/route.ts        sign out
lib/
  db.ts                        connection + queries + types
  auth.ts                      dev and Supabase auth modes
  actions.ts                   every write, each role-gated
  sanitize.ts                  DOMPurify allowlists for editable fields
  supabase-browser.ts          client-side Supabase
  supabase-server.ts           server-side Supabase
db/
  001_schema.sql               tables, view, triggers
  002_rls.sql                  Row Level Security (production)
  003_auth_sync.sql            auth.users -> app_user trigger, admin bootstrap
  content.ts                   the v0.1 playbook as data
  seed.ts                      seeding script
scripts/
  migrate.mjs                  apply db/*.sql in order
  setup.mjs                    one-command production setup
```

## Security posture

- **Authentication** — Supabase Auth, invitation only (`shouldCreateUser: false`).
  Middleware calls `getUser()`, which revalidates against Supabase, rather than
  trusting a decoded session cookie.
- **Authorization** — checked twice: `requireEditor()` / `requireAdmin()` in every
  server action, and matching RLS policies in `002_rls.sql`.
- **New users default to `viewer`.** The auth trigger never grants a higher role;
  the first admin is set once from the SQL editor.
- **Input** — every editable field is sanitized on write with a tag allowlist
  (`lib/sanitize.ts`). Verified against script tags, `img onerror`, `svg onload`,
  `javascript:` hrefs, iframes, and inline styles.
