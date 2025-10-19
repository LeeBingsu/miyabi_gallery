export const onRequestDelete = async ({ params, env }) => {
  const r2 = env.R2 || env.R2_BUCKET || env.MY_BUCKET;
  if (!r2) return new Response(JSON.stringify({ error: 'R2 binding missing' }), { status: 500, headers: { 'Content-Type': 'application/json' }});

  const key = (params.key || '').replace(/^\/+/, '');
  if (!key) return new Response(JSON.stringify({ error: 'Key required' }), { status: 400, headers: { 'Content-Type': 'application/json' }});

  try {
    await r2.delete(key);
    return new Response(null, { status: 204 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
};
