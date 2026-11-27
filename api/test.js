export const config = { runtime: 'edge' };

export default async function handler(req) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({
      status: 'NO GEMINI API KEY FOUND'
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Say hello in 5 words.' }] }],
          generationConfig: { maxOutputTokens: 50 }
        }),
      }
    );

    const data = await res.json();
    return new Response(JSON.stringify({
      status: res.ok ? 'GEMINI WORKING' : 'GEMINI ERROR',
      httpStatus: res.status,
      keyFirst4: apiKey.slice(0, 4),
      response: data
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({
      status: 'FETCH ERROR',
      error: err.message
    }), { headers: { 'Content-Type': 'application/json' } });
  }
}
