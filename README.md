# Arch Content Dashboard, deployable

Internal GTM / content dashboard for Arch. Static pages plus a couple of small
serverless functions, no framework, deploys straight to Vercel.

## What's in here

- `index.html`, `hub.html`, `dashboard.html`, `login.html` — the site.
- `api/state.js` — shared state (edits, approvals, feedback, the schedule),
  stored in Vercel KV so everyone who signs in sees the same data.
- `api/auth/*` — magic-link email sign-in.
- `middleware.js` — gates `/`, `/index.html`, `/hub.html`, `/dashboard.html`,
  and `/api/state` behind a signed-in session. `/login.html` and
  `/api/auth/*` stay open (or nothing can sign in).
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

### 6. Redeploy
Once KV is connected and the three env vars (`RESEND_API_KEY`,
`MAGIC_LINK_FROM`, `SESSION_SECRET`) are set, trigger a redeploy (Vercel
does this automatically when you save env vars, or push an empty commit).

### 7. Try it
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
