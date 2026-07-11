// La Shoe de Peugh — global visitor counter (Cloudflare Worker + KV)
// ---------------------------------------------------------------------------
// Stores ONE shared count in a KV namespace and returns it to every visitor, so
// the footer counter is a real worldwide tally instead of a per-browser number.
//
// Endpoints (both respond with JSON: { "count": <number> }):
//   GET  /count  → current count, no change
//   POST /hit    → increment by 1, then return the new count
//
// The counter seeds to START_COUNT the first time it's read/incremented.
//
// Deploy: see README.md in this folder. Requires a KV namespace bound as VISITOR_KV.
// This Worker holds NO secrets, so its source is safe to keep in the public repo.

const START_COUNT = 1111; // starting baseline; change before first deploy if desired
const KEY = 'count';

// Only the store's own pages may read/increment the counter.
const ALLOWED_ORIGINS = [
  'https://lashoedepeugh.com',
  'https://www.lashoedepeugh.com',
  'http://localhost:5173', // local dev
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  };
}

async function readCount(env) {
  const n = parseInt(await env.VISITOR_KV.get(KEY), 10);
  return Number.isFinite(n) ? n : START_COUNT;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });

    try {
      // Increment on a real new-visitor hit.
      if (request.method === 'POST' && url.pathname === '/hit') {
        // Note: KV read-modify-write isn't atomic, so under heavy simultaneous
        // traffic an occasional increment may be lost. That's fine for a
        // decorative visitor counter on a small store.
        const next = (await readCount(env)) + 1;
        await env.VISITOR_KV.put(KEY, String(next));
        return json({ count: next });
      }
      // Everything else just reads the current total.
      return json({ count: await readCount(env) });
    } catch (err) {
      return json({ error: 'counter unavailable' }, 500);
    }
  },
};
