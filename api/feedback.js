export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://lifepulseng.vercel.app',
      'X-Title': 'LifePulse NG',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-r1-0528:free',
      max_tokens: 1200,
      stream: true,
      messages: body.messages,
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    // Check if rate limit exceeded
    if (upstream.status === 429) {
      return new Response(JSON.stringify({ error: 'rate_limit' }), {
        status: 429, headers: { 'Content-Type': 'application/json', ...cors }
      });
    }
    return new Response(JSON.stringify({ error: 'Upstream error', detail: err }), {
      status: upstream.status, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
