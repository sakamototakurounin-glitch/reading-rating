export function jsonResponse(response, status, data) {
  response
    .status(status)
    .setHeader('Content-Type', 'application/json; charset=utf-8')
    .setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    .setHeader('CDN-Cache-Control', 'no-store')
    .setHeader('Vercel-CDN-Cache-Control', 'no-store')
    .send(JSON.stringify(data));
}

export function parseRequest(request) {
  if (typeof request.body === 'string') return JSON.parse(request.body || '{}');
  return request.body || {};
}

export async function structuredCompletion({ system, user, schema, model='gpt-4.1-mini' }) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method:'POST',
    headers:{ Authorization:`Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type':'application/json' },
    body:JSON.stringify({ model, instructions:system, input:user, text:{ format:{ type:'json_schema', name:'result', strict:true, schema } } }),
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload?.error?.message || `OpenAI request failed: ${response.status}`);
  }
  const payload = await response.json();
  const outputText = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((content) => content.type === 'output_text')?.text;
  if (!outputText) throw new Error('OpenAI response did not contain output text');
  return JSON.parse(outputText);
}
