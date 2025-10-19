// Compatibility route: /api/list/{path}
export async function onRequestGet(context) {
  const { request, params, env } = context;

  // Cloudflare Access
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const path = (params.path || '').replace(/^\/+|\/+$/g, '');
    const prefix = path ? `${path}/` : '';

    let cursor;
    const items = [];
    do {
      const listed = await env.GALLERY_BUCKET.list({ prefix, cursor });
      cursor = listed.truncated ? listed.cursor : undefined;
      for (const obj of listed.objects) {
        if (obj.key.endsWith('.placeholder')) continue;
        const relative = obj.key.substring(prefix.length);
        if (!relative.includes('/')) {
          items.push({ key: obj.key, size: obj.size, uploaded: obj.uploaded });
        }
      }
    } while (cursor);

    return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' }});
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
}
