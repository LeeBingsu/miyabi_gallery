// 폴더/파일 이름 변경 (파일 단위 + 폴더 prefix 단위 모두 지원)
export async function onRequestPut(context) {
  const { request, env } = context;

  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { oldKey, newKey, isFolder } = await request.json();
    const r2 = env.GALLERY_BUCKET;

    if (!oldKey || !newKey) {
      return new Response(JSON.stringify({ error: 'oldKey and newKey are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 파일 단건 rename (copy+delete)
    if (!isFolder) {
      const object = await r2.get(oldKey);
      if (!object) {
        return new Response(JSON.stringify({ error: 'Source not found' }), { status: 404, headers: { 'Content-Type': 'application/json' }});
      }
      await r2.put(newKey, object.body, { httpMetadata: object.httpMetadata, customMetadata: object.customMetadata });
      await r2.delete(oldKey);
      return new Response(JSON.stringify({ success: true, moved: 1 }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 폴더(prefix) 단위 rename: prefix 아래 모든 객체 이동
    let cursor; let moved = 0;
    const prefix = oldKey.replace(/^\/+|\/+$/g, '');
    const targetPrefix = newKey.replace(/^\/+|\/+$/g, '');

    do {
      const listed = await r2.list({ prefix, cursor });
      cursor = listed.cursor;
      for (const obj of listed.objects) {
        const suffix = obj.key.slice(prefix.length).replace(/^\/+/, '');
        const dest = `${targetPrefix}/${suffix}`.replace(/\/+/, '/');
        const srcObj = await r2.get(obj.key);
        if (srcObj) {
          await r2.put(dest, srcObj.body, { httpMetadata: srcObj.httpMetadata, customMetadata: srcObj.customMetadata });
          await r2.delete(obj.key);
          moved++;
        }
      }
    } while (cursor);

    return new Response(JSON.stringify({ success: true, moved }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
