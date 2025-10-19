export const onRequestDelete = async ({ params, env }) => {
  const r2 = env.R2 || env.R2_BUCKET || env.MY_BUCKET;
  if (!r2) return new Response(JSON.stringify({ error: 'R2 binding missing' }), { status: 500, headers: { 'Content-Type': 'application/json' }});

  const prefix = (params.path || '').replace(/^\/+|\/+$/g, '');
  if (!prefix) return new Response(JSON.stringify({ error: 'Folder path required' }), { status: 400, headers: { 'Content-Type': 'application/json' }});

  try {
    let cursor; let deleted = 0;
    do {
      const listed = await r2.list({ prefix, cursor });
      cursor = listed.cursor;
      for (const obj of listed.objects) {
        await r2.delete(obj.key);
        deleted++;
      }
    } while (cursor);

    return new Response(JSON.stringify({ deleted }), { status: 200, headers: { 'Content-Type': 'application/json' }});
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
};
