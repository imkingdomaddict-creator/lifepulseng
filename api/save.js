export const config = { runtime: 'edge' };

const DAILY_LIMIT = 50;

function getWATDate() {
  const now = new Date();
  const wat = new Date(now.getTime() + 60 * 60 * 1000);
  const resetHour = 1;
  if (wat.getUTCHours() < resetHour) {
    wat.setUTCDate(wat.getUTCDate() - 1);
  }
  return wat.toISOString().slice(0, 10);
}

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { scores } = body;
  if (!scores) return new Response('Missing scores', { status: 400 });

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };

  const today = getWATDate();

  // Check current count first
  const checkRes = await fetch(
    `${supabaseUrl}/rest/v1/daily_usage?date=eq.${today}&select=count`,
    { headers }
  );
  let currentCount = 0;
  if (checkRes.ok) {
    const rows = await checkRes.json();
    currentCount = rows[0]?.count || 0;
  }

  if (currentCount >= DAILY_LIMIT) {
    return new Response(JSON.stringify({ error: 'daily_limit_reached' }), {
      status: 429, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  // Save assessment scores
  await fetch(`${supabaseUrl}/rest/v1/assessments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      mental: scores.mental ?? null,
      financial: scores.financial ?? null,
      spiritual: scores.spiritual ?? null,
      relational: scores.relational ?? null,
      social: scores.social ?? null,
      physical: scores.physical ?? null,
      overall: scores.overall ?? null,
    }),
  });

  // Upsert daily counter
  await fetch(`${supabaseUrl}/rest/v1/daily_usage`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ date: today, count: currentCount + 1 }),
  });

  return new Response(JSON.stringify({ ok: true, count: currentCount + 1, limit: DAILY_LIMIT }), {
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}
