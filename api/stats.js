export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  // Read body if POST
  let body = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {}

  // Get password from body OR header OR query param
  const authHeader = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const bodyPassword = (body.password || '').trim();
  const url = new URL(req.url);
  const queryPassword = (url.searchParams.get('p') || '').trim();

  const submitted = bodyPassword || authHeader || queryPassword;
  const stored = (process.env.ADMIN_PASSWORD || '').trim();

  // Debug: return what we received (REMOVE AFTER FIXING)
  if (submitted === 'debug') {
    return new Response(JSON.stringify({
      debug: true,
      submitted,
      storedLength: stored.length,
      storedFirst3: stored.slice(0, 3),
      match: submitted === stored
    }), { headers: { 'Content-Type': 'application/json', ...cors } });
  }

  if (!stored || submitted !== stored) {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      hint: 'submitted=' + submitted + ' storedLength=' + stored.length
    }), { status: 401, headers: { 'Content-Type': 'application/json', ...cors } });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/assessments?select=*&order=created_at.desc&limit=1000`,
    { headers }
  );

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: 'Supabase error', detail: err }), {
      status: res.status, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  const rows = await res.json();
  const total = rows.length;
  const domains = ['mental', 'financial', 'spiritual', 'relational', 'social', 'physical'];

  const averages = {};
  domains.forEach(d => {
    const valid = rows.filter(r => r[d] !== null).map(r => r[d]);
    averages[d] = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  });

  const overallAvg = Math.round(domains.reduce((s, d) => s + averages[d], 0) / domains.length);

  const monthly = {};
  rows.forEach(r => {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] || 0) + 1;
  });

  return new Response(JSON.stringify({ total, averages, overallAvg, monthly }),
    { headers: { 'Content-Type': 'application/json', ...cors } });
}
