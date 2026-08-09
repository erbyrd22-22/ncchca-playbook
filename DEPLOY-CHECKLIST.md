# Deploy checklist — NCCHCA Playbook

Everything is built and tested. These are the steps that need your accounts.
Roughly 20 minutes. Nothing here requires editing code.

---

## What I could not do, and why

Creating accounts and entering API keys, database passwords, or tokens are things
I don't do — that's your credentials in my hands, and it's the wrong shape for a
tool to be doing on your behalf. So the setup below is yours to run.

Two ways to shorten it:

**Option A — connect the MCP connectors (fastest).** Both Supabase and Railway have
official connectors that authenticate through OAuth, so I'd act inside your
already-authenticated session and never see a key.

- **Supabase** — already installed on your account, just toggled off for this chat.
  Enable it in this chat's connector settings.
- **Railway** — not installed. Add it from the connector directory on claude.ai.

Tell me when they're on and I'll do steps 1–3 and 5 directly.

**Option B — run it yourself** using the steps below.

---

## 1. Supabase project

1. supabase.com → **New project**. Pick a region near NC (`us-east-1`).
2. Save the database password it generates — you'll need it in step 2.
3. **Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Settings → Database → Connection string → Session mode**, copy it and
   substitute your password. This is your `DATABASE_URL` for step 2.

## 2. Schema + content (run once, from your machine)

```bash
unzip ncchca-playbook-app.zip && cd app
npm install

DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres" \
ADMIN_EMAIL="your@email.com" \
npm run setup
```

That applies the schema and RLS policies, seeds all 71 playbook items and the three
demo event instances, deletes the local demo users, and promotes you to admin.

Then in the Supabase **SQL editor**, run `db/003_auth_sync.sql`. It adds the trigger
that gives every future invited user an `app_user` row automatically, defaulting to
`viewer`.

> If `ADMIN_EMAIL` reports "not found", do step 3 first, then re-run just that line:
> `update app_user set role='admin' where email='your@email.com';`

## 3. Invite people

**Authentication → Users → Invite user.** They land as `viewer` automatically.
Promote in the SQL editor:

```sql
update app_user set role='editor' where email='lenora@ncchca.org';
update app_user set role='admin'  where email='karen@ncchca.org';
```

Roles: `viewer` reads · `editor` edits content and progress · `admin` also creates
event instances and manages people.

## 4. Railway

1. Push the `app` directory to a GitHub repo.
2. railway.app → **New Project → Deploy from GitHub repo**.
3. **Variables** — add these four:

   ```
   DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   AUTH_MODE=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://[REF].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

   **Port 6543, not 5432.** That's the transaction pooler. The direct port will
   exhaust Postgres connections the first time more than a few people use it.

4. `railway.json` already sets the build and start commands and a healthcheck on
   `/login`. No further build config needed.
5. **Settings → Networking → Generate Domain** (or add a custom one).

## 5. Close the loop

Back in Supabase → **Authentication → URL Configuration**:

- **Site URL** → your Railway domain
- **Redirect URLs** → add `https://your-domain/auth/callback`

Magic links will not work until this is done — that's the single most common
cause of "the link says invalid".

## 6. Verify

- Visit the domain → redirected to `/login`
- Request a sign-in link → email arrives → lands in the playbook
- Header shows your role badge as `admin`
- Check a box, reload — it persists
- Sign out → back to `/login`, and the playbook URL redirects you there

---

## Notes

**Email deliverability.** Supabase's built-in email is rate-limited and lands in
spam often enough to matter. For real staff use, set a custom SMTP provider under
Authentication → Emails (Resend, Postmark, SendGrid). Worth doing before you invite
the whole team.

**Cost.** Supabase free tier covers this comfortably. Railway is usage-based —
expect a few dollars a month at this scale.

**The one thing to remember about the data model.** Editing playbook content changes
the template for every event instance. Checking a box, assigning an owner, or setting
a due date only affects the instance you're in. If someone reports "my checkmarks
disappeared," they've almost certainly switched instances in the header dropdown.
