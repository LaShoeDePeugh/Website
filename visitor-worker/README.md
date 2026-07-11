# Visitor Counter Worker — deploy guide

This is the real, shared "X have visited" counter shown in the site footer. The count
lives in a Cloudflare **KV** store and is served by this Worker, so every visitor
worldwide sees the same number (unlike the old per-browser fake counter).

It holds **no secrets**, so unlike the Clover checkout token, nothing here is sensitive.

You deploy it once by hand in the Cloudflare dashboard (same as the checkout worker).

---

## One-time setup (≈5 minutes)

1. **Create the KV store**
   Cloudflare dashboard → **Storage & Databases → KV** → **Create a namespace**.
   Name it `lsdp-visitor-count`. (You don't need to add any keys — the Worker seeds
   itself to **1,111** on the first visit.)

2. **Create the Worker**
   **Workers & Pages → Create → Worker**. Name it **`lashoedepeugh-visitor`**
   (this gives it the URL `https://lashoedepeugh-visitor.lashoedepeugh.workers.dev`,
   which the site already points to). Click **Deploy**, then **Edit code**, delete the
   starter code, and paste in the contents of **`worker.js`** from this folder. Click
   **Deploy** again.

3. **Bind the KV store to the Worker**
   On the Worker → **Settings → Bindings → Add → KV namespace**:
   - **Variable name:** `VISITOR_KV`  ← must be exactly this
   - **KV namespace:** `lsdp-visitor-count`
   Save, then **Deploy** once more so the binding takes effect.

4. **Test it**
   Open `https://lashoedepeugh-visitor.lashoedepeugh.workers.dev/count` in your browser.
   You should see `{"count":1111}`. Refresh a few times — it stays 1111 (reading doesn't
   increment). The website calls `/hit` (which does increment) once per new visitor.

That's it. The footer counter on lashoedepeugh.com will now show the live shared total.

---

## Notes & knobs

- **Starting number:** it seeds to **1,111**. To start somewhere else, either change
  `START_COUNT` in `worker.js` *before* the first hit, or set the KV key `count` to any
  number manually (KV → the namespace → the `count` key).
- **If the site URL differs:** if you named the Worker something else, update
  `VISITOR_COUNTER_WORKER` at the top of `web/src/App.jsx` to match, then redeploy the
  site (`git push origin main`).
- **If the Worker is ever down:** the site safely shows the last number it saw (or hides
  the counter) — it will **never** show a fake number.
- **Free tier is plenty:** the Worker only writes to KV on a genuinely new visitor
  (each browser is counted once), so it stays well within Cloudflare's free limits.
- **Allowed origins:** the Worker only answers requests from lashoedepeugh.com,
  www.lashoedepeugh.com, and localhost:5173 (edit `ALLOWED_ORIGINS` in `worker.js` to change).
