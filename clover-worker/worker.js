// ─────────────────────────────────────────────────────────────────────────
// La Shoe de Peugh — Clover Hosted Checkout (Cloudflare Worker)
// Creates a Clover Hosted Checkout session and returns the redirect URL (href).
//
// The Clover PRIVATE token lives ONLY here, as a Cloudflare Secret — never in
// the website code, never in git, never in chat.
//
// Env vars (Cloudflare → your Worker → Settings → Variables and Secrets):
//   CLOVER_PRIVATE_TOKEN   (Secret)     — your Hosted Checkout private token
//   CLOVER_MERCHANT_ID     (Plaintext)  — MAKV9YRR51SX1
//   CLOVER_ENV             (Plaintext)  — "sandbox" while testing, "production" to go live
//   ALLOWED_ORIGIN         (Plaintext)  — https://lashoedepeugh.com
// ─────────────────────────────────────────────────────────────────────────

// ── Pricing (all amounts in CENTS) ──
const PRODUCT = {
  name: 'La Shoe de Peugh — Shoe & Foot Deodorizing Spray',
  priceCents: 1499, // $14.99 per bottle
};
const MAX_QTY = 12;
// Shipping tiers — flat amount PER ORDER, in cents (drops as cart grows):
//   1 bottle    → $5.95
//   2 bottles   → $3.95
//   3–4 bottles → $1.95
//   5+ bottles  → FREE
function shippingCentsFor(qty) {
  if (qty >= 5) return 0;    // free shipping
  if (qty >= 3) return 195;  // $1.95 flat
  if (qty === 2) return 395; // $3.95 flat
  return 595;                // $5.95 for a single
}
// Sales tax: currently NONE. To add a flat tax to every order, set TAX_RATE_MICRO
// (Clover format: 10% = 1000000, so 6% = 600000). Leave 0 for no tax line.
const TAX_RATE_MICRO = 0;

const ENDPOINTS = {
  sandbox: 'https://apisandbox.dev.clover.com/invoicingcheckoutservice/v1/checkouts',
  production: 'https://api.clover.com/invoicingcheckoutservice/v1/checkouts',
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || 'https://lashoedepeugh.com';
    const allowList = [allowed, allowed.replace('://', '://www.')];
    const reqOrigin = request.headers.get('Origin') || '';
    const origin = allowList.includes(reqOrigin) ? reqOrigin : allowed;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }

    // ── How many bottles? ──
    let body;
    try { body = await request.json(); } catch { body = {}; }
    let qty = parseInt(body.quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    if (qty > MAX_QTY) qty = MAX_QTY;

    // ── Shipping by quantity tier (see shippingCentsFor above) ──
    const shippingCents = shippingCentsFor(qty);

    const bottleLine = { name: PRODUCT.name, price: PRODUCT.priceCents, unitQty: qty };
    const shipLine = {
      name: `Shipping (USA — ${qty} bottle${qty > 1 ? 's' : ''})`,
      price: shippingCents,
      unitQty: 1,
    };
    if (TAX_RATE_MICRO > 0) {
      const tax = [{ name: 'Sales Tax', rate: TAX_RATE_MICRO }];
      bottleLine.taxRates = tax;
      shipLine.taxRates = tax;
    }

    const payload = {
        customer: {},
        redirectUrls: {
            success: 'https://lashoedepeugh.com/thank-you.html',
            failure: 'https://lashoedepeugh.com/payment-failed.html',
        },
        shoppingCart: { lineItems: [bottleLine, shipLine] },
    };

    const endpoint = ENDPOINTS[(env.CLOVER_ENV || 'sandbox').toLowerCase()] || ENDPOINTS.sandbox;

    let cloverRes, data;
    try {
      cloverRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.CLOVER_PRIVATE_TOKEN}`,
          'X-Clover-Merchant-Id': env.CLOVER_MERCHANT_ID,
        },
        body: JSON.stringify(payload),
      });
      data = await cloverRes.json().catch(() => ({}));
    } catch {
      return json({ error: 'Could not reach the payment provider. Please try again.' }, 502, origin);
    }

    if (!cloverRes.ok || !data.href) {
      // Never leak the token or Clover internals to the browser.
      return json({ error: 'Checkout could not be created. Please try again.' }, 502, origin);
    }

    return json({ href: data.href }, 200, origin);
  },
};
