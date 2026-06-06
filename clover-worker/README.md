# Clover Hosted Checkout — Cloudflare Worker

This tiny serverless function is what lets the static site take real Clover payments.
It holds the Clover **private** token (as a Cloudflare secret) and asks Clover to
create a Hosted Checkout session, then hands the site a URL to send the customer to.

## Deploy (dashboard, no command line)

1. **Create a free Cloudflare account:** https://dash.cloudflare.com/sign-up
2. Left sidebar → **Workers & Pages** → **Create** → **Create Worker**.
   - Name it `lashoedepeugh-checkout` → **Deploy** (accept the default hello-world).
3. Click **Edit code**, delete the sample, paste the entire contents of `worker.js`, **Deploy**.
4. Go to the Worker's **Settings → Variables and Secrets** and add:
   | Name | Type | Value |
   |------|------|-------|
   | `CLOVER_PRIVATE_TOKEN` | **Secret (Encrypt)** | *(paste your Clover Hosted Checkout private token — into Cloudflare only, never into chat)* |
   | `CLOVER_MERCHANT_ID` | Plaintext | `MAKV9YRR51SX1` |
   | `CLOVER_ENV` | Plaintext | `sandbox` *(switch to `production` after testing)* |
   | `ALLOWED_ORIGIN` | Plaintext | `https://lashoedepeugh.com` |
5. **Deploy** again so the variables take effect.
6. Copy the Worker's URL (looks like `https://lashoedepeugh-checkout.<your-subdomain>.workers.dev`)
   and send it over — it gets wired into the site's Buy button.

## Pricing (edit the constants at the top of worker.js)

- Bottle (volume discount, per bottle): **1 → $14.99 · 2–4 → $12.99 · 5–8 → $12.99 (+free ship) · 9+ → $11.59**
  (`unitPriceCentsFor()` — MUST stay in sync with `unitPriceFor()` in `src/App.jsx`)
- Shipping (flat per order): **1 → $5.95 · 2 → $3.95 · 3–4 → $1.95 · 5+ → FREE**
- Sales tax: **none** for now (`TAX_RATE_MICRO = 0`)

> ⚠️ When you change prices: update BOTH `worker.js` (charges the card) and `src/App.jsx`
> (what the customer sees), and **redeploy the Worker here** — the git push only updates the
> website, NOT this Worker. If they don't match, customers get charged a different amount than shown.

## Test before going live

- Keep `CLOVER_ENV = sandbox` first; run a sandbox purchase end-to-end.
- Then flip to `production`, do ONE real $14.99 buy, confirm it lands in your Clover
  dashboard, and refund it.
- Only announce after the production test passes.
