export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

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

  const record = {
    mental:     scores.mental     ?? null,
    financial:  scores.financial  ?? null,
    spiritual:  scores.spiritual  ?? null,
    relational: scores.relational ?? null,
    social:     scores.social     ?? null,
    physical:   scores.physical   ?? null,
    overall:    scores.overall    ?? null,
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/assessments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(record),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: 'Supabase error', detail: err }), {
      status: res.status, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}
