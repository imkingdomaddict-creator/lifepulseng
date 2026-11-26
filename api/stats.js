export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  // Admin password check
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (token !== process.env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...cors }
    });
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

  // Fetch all assessments (max 1000 for free tier)
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

  // Calculate averages per domain
  const averages = {};
  domains.forEach(d => {
    const valid = rows.filter(r => r[d] !== null).map(r => r[d]);
    averages[d] = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  });

  // Overall average
  const overallAvg = domains.length
    ? Math.round(domains.reduce((s, d) => s + averages[d], 0) / domains.length)
    : 0;

  // Monthly breakdown
  const monthly = {};
  rows.forEach(r => {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] || 0) + 1;
  });

  return new Response(JSON.stringify({
    total,
    averages,
    overallAvg,
    monthly,
  }), { headers: { 'Content-Type': 'application/json', ...cors } });
}
