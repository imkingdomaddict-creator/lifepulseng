export const config = { runtime: 'edge' };

export default async function handler(req) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({
      status: 'NO OPENROUTER API KEY FOUND'
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://lifepulseng.vercel.app',
        'X-Title': 'LifePulse NG',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
        max_tokens: 50,
        stream: false,
        messages: [{ role: 'user', content: 'Say hello in 5 words.' }],
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify({
      status: res.ok ? 'OPENROUTER WORKING' : 'OPENROUTER ERROR',
      httpStatus: res.status,
      keyFirst6: apiKey.slice(0, 6),
      response: data
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({
      status: 'FETCH ERROR',
      error: err.message
    }), { headers: { 'Content-Type': 'application/json' } });
  }
}
