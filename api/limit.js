export const config = { runtime: 'edge' };

const DAILY_LIMIT = 50;

function getWATDate() {
  // WAT = UTC+1, reset at 1am WAT = midnight UTC
  const now = new Date();
  const wat = new Date(now.getTime() + 60 * 60 * 1000); // UTC+1
  // Reset at 1am WAT = subtract 1 hour to get reset boundary
  const resetHour = 1;
  if (wat.getUTCHours() < resetHour) {
    wat.setUTCDate(wat.getUTCDate() - 1);
  }
  return wat.toISOString().slice(0, 10);
}

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ count: 0, limit: DAILY_LIMIT, blocked: false }), {
      headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  const today = getWATDate();
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/daily_usage?date=eq.${today}&select=count`,
    { headers }
  );

  let count = 0;
  if (res.ok) {
    const rows = await res.json();
    count = rows[0]?.count || 0;
  }

  return new Response(JSON.stringify({
    count,
    limit: DAILY_LIMIT,
    blocked: count >= DAILY_LIMIT,
    date: today,
  }), { headers: { 'Content-Type': 'application/json', ...cors } });
}
