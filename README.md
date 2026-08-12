# Arch Content Dashboard, deployable

Internal GTM / content dashboard for Arch. Static pages plus a couple of small
serverless functions, no framework, deploys straight to Vercel.

## What's in here

- `index.html`, `hub.html`, `dashboard.html`, `login.html` — the site.
- `api/state.js` — shared state (edits, approvals, feedback, the schedule),
  stored in Vercel KV so everyone who signs in sees the same data.
- `api/auth/*` — magic-link email sign-in.
- `api/admin-content.js` — a separate write path, protected by a static key
  instead of a browser session, for publishing drafted content (new posts,
  polls, articles, deep dives) straight to the live dashboard with no code
  push. This is how Claude adds content between deploys.
- `middleware.js` — gates `/`, `/index.html`, `/hub.html`, `/dashboard.html`,
  and `/api/state` behind a signed-in session. `/login.html`, `/api/auth/*`,
  and `/api/admin-content` stay open to that flow (or nothing can sign in,
  or content could never be published from outside a browser).
- `config/allowlist.js` — who's allowed to sign in. Anyone `@arch.network` is
  auto-allowed. Add anyone else to the `emails` array in that file.

## One-time setup

### 1. Push this to GitHub
From inside this folder:
```
git init
git add .
git commit -m "Initial commit, Arch content dashboard"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```
(Create the empty repo on GitHub first, don't initialize it with a README so
there's no merge conflict on first push.)

### 2. Import into Vercel
- vercel.com → **Add New → Project** → import the GitHub repo you just
  pushed. Framework preset: "Other". No build command needed, it's static +
  serverless functions, Vercel handles that automatically.
- Deploy. It'll fail on the first build/run until the env vars below are set,
  that's expected.

### 3. Connect Vercel KV (shared state storage)
- In the Vercel project → **Storage** tab → **Create Database** → **KV**
  (this is Upstash Redis under the hood).
- Connect it to this project. Vercel auto-injects the `KV_REST_API_URL` /
  `KV_REST_API_TOKEN` (etc.) env vars, no manual copy-pasting needed.

### 4. Set up Resend (magic-link emails)
- Create a free account at resend.com.
- Get an API key (Dashboard → API Keys).
- In Vercel → **Settings → Environment Variables**, add:
  - `RESEND_API_KEY` = the key from Resend
  - `MAGIC_LINK_FROM` = e.g. `Arch Dashboard <dashboard@arch.network>` (needs
    a domain verified in Resend; until you verify `arch.network` there,
    Resend's own `onboarding@resend.dev` sender works fine for testing)

### 5. Set the session secret
- In Vercel env vars, add `SESSION_SECRET` = any long random string (e.g.
  run `openssl rand -hex 32` locally and paste the output). This signs the
  sign-in cookie, keep it secret, don't commit it.

### 6. Set the admin key (lets Claude publish content without a deploy)
- In Vercel env vars, add `ADMIN_API_KEY` = another long random string
  (`openssl rand -hex 32` again, a different value than the session secret).
- Share this value with Claude in a Cowork session (paste it in chat, or
  store it somewhere Claude can read, never commit it to the repo). Claude
  uses it to call `POST /api/admin-content` and publish drafted content
  directly to the live site.

### 7. Redeploy
Once KV is connected and the four env vars (`RESEND_API_KEY`,
`MAGIC_LINK_FROM`, `SESSION_SECRET`, `ADMIN_API_KEY`) are set, trigger a
redeploy (Vercel does this automatically when you save env vars, or push an
empty commit).

### 8. Try it
- Visit your Vercel URL, you should land on `/login.html`.
- Enter an `@arch.network` address (or one you added to
  `config/allowlist.js`), check your inbox, click the link.
- You'll land on `/dashboard.html`, signed in. Edits, approvals, feedback,
  and the schedule now save to shared state, anyone else who signs in sees
  the same data.

## Managing who has access
Edit `emails` in `config/allowlist.js`, commit, push. Vercel redeploys
automatically and the new person can request a sign-in link within a
minute or two.

## How content gets published without a deploy
Everything on the dashboard is one of two things:

- **The seed content**, the posts/polls/articles/deep dives baked into
  `dashboard.html` when it was last deployed. Changing these requires
  editing the file and pushing, same as any other code change.
- **Custom content**, anything added after that, whether through the
  dashboard's own "+ New..." buttons or through `POST /api/admin-content`.
  This lives in Vercel KV and shows up live for everyone signed in, no
  deploy involved.

When Claude drafts a new batch of content in a session, it calls
`/api/admin-content` directly instead of editing the file, so it appears on
the live dashboard within seconds. Example request:

```
curl -X POST https://your-deployment.vercel.app/api/admin-content \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sf",
    "items": [
      { "bucket": "B", "pillar": "Pillar 2", "format": "Single", "status": "Draft", "preview": "Example post copy here." }
    ]
  }'
```

`type` is one of `sf` (shortform), `md` (deep dive), `lf` (blog/article), or
`pl` (poll). `items` matches the shape of entries already in the
corresponding array in `dashboard.html`, so Claude can see the schema by
reading the file. A `GET` to the same endpoint (with the same header)
returns a count of what's currently in each bucket, useful for a sanity
check after publishing.

Periodically, once a batch of custom content has been reviewed and
approved, it's worth folding the good ones into the seed arrays in
`dashboard.html` directly and pushing, so the "default" state of the site
reflects what's actually been kept, and the custom buckets don't grow
indefinitely. Not required, just tidier.

## Local development
`vercel dev` (after `npm install` and `vercel link`) runs this locally with
the same env vars pulled from your Vercel project. Plain `open dashboard.html`
in a browser still works too, it just falls back to that browser's local
storage only since there's no server to talk to `/api/state`.

## Notes
- Session cookies last 30 days. Sign out anytime via the "Sign out" link in
  the dashboard header.
- The magic-link request endpoint always returns success regardless of
  whether the email is allowed, so it can't be used to check who has access.
