export const config = { runtime: 'edge' };

export default async function handler(req) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ 
      status: 'NO API KEY FOUND',
      env: Object.keys(process.env).filter(k => !k.includes('SECRET'))
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // Test Groq directly
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 50,
        stream: false,
        messages: [{ role: 'user', content: 'Say hello in 5 words.' }],
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify({
      status: res.ok ? 'GROQ WORKING' : 'GROQ ERROR',
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
