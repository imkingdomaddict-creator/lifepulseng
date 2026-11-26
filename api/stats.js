export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  // Password check
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (token !== process.env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  const kv_url = process.env.KV_REST_API_URL;
  const kv_token = process.env.KV_REST_API_TOKEN;

  if (!kv_url || !kv_token) {
    return new Response(JSON.stringify({ error: 'KV not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  async function kv(cmd) {
    const res = await fetch(`${kv_url}/${cmd.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${kv_token}` }
    });
    const json = await res.json();
    return json.result;
  }

  const domains = ['mental', 'financial', 'spiritual', 'relational', 'social', 'physical'];

  // Fetch all stats in parallel
  const [total, ...domainData] = await Promise.all([
    kv(['GET', 'total:assessments']),
    ...domains.flatMap(d => [
      kv(['GET', `avg:${d}:sum`]),
      kv(['GET', `avg:${d}:count`])
    ])
  ]);

  // Build domain averages
  const averages = {};
  domains.forEach((d, i) => {
    const sum = parseFloat(domainData[i * 2]) || 0;
    const count = parseInt(domainData[i * 2 + 1]) || 0;
    averages[d] = count > 0 ? Math.round(sum / count) : 0;
  });

  // Get recent 100 entries for monthly breakdown
  const recent = await kv(['LRANGE', 'recent:entries', '0', '99']);
  const entries = (recent || []).map(e => { try { return JSON.parse(e); } catch { return null; } }).filter(Boolean);

  // Monthly counts
  const monthly = {};
  entries.forEach(e => {
    const d = new Date(e.ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] || 0) + 1;
  });

  return new Response(JSON.stringify({
    total: parseInt(total) || 0,
    averages,
    monthly,
    recentCount: entries.length
  }), { headers: { 'Content-Type': 'application/json', ...cors } });
}
