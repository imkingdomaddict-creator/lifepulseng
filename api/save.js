export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const kv_url = process.env.KV_REST_API_URL;
  const kv_token = process.env.KV_REST_API_TOKEN;

  if (!kv_url || !kv_token) {
    return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', ...cors } });
  }

  let body;
  try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

  const { scores, timestamp } = body;
  if (!scores) return new Response('Missing scores', { status: 400 });

  const date = new Date(timestamp || Date.now());
  const monthKey = `month:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const totalKey = 'total:assessments';

  // Helper: call KV REST API
  async function kv(cmd) {
    const res = await fetch(`${kv_url}/${cmd.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${kv_token}` }
    });
    const json = await res.json();
    return json.result;
  }

  // Increment total count
  await kv(['INCR', totalKey]);

  // Increment monthly count
  await kv(['INCR', monthKey]);

  // Store domain scores as running sum + count for averages
  const domains = ['mental', 'financial', 'spiritual', 'relational', 'social', 'physical'];
  for (const d of domains) {
    if (scores[d] !== undefined) {
      await kv(['INCRBYFLOAT', `avg:${d}:sum`, scores[d]]);
      await kv(['INCR', `avg:${d}:count`]);
    }
  }

  // Store last 30 individual entries for trend (circular buffer via list)
  const entry = JSON.stringify({ scores, ts: date.toISOString() });
  await kv(['LPUSH', 'recent:entries', entry]);
  await kv(['LTRIM', 'recent:entries', '0', '99']); // keep last 100

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}
