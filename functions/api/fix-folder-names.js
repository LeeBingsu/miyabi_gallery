export const onRequest = async ({ env, request }) => {
  const dryRun = (new URL(request.url)).searchParams.get('dryRun') === '1' || request.method === 'GET';
  const r2 = env.GALLERY_BUCKET;

  const prefix = '';
  const toMigrate = [];
  let cursor;

  // List all objects (paged)
  do {
    const res = await r2.list({ prefix, delimiter: undefined, cursor });
    cursor = res.cursor;
    for (const obj of res.objects) {
      const key = obj.key;
      if (/%2F/i.test(key)) {
        // Replace encoded slash with real slash for path normalization
        const normalized = key.replace(/%2F/gi, '/');
        // Avoid leading or duplicate slashes
        const safe = normalized.replace(/\/+/, '/').replace(/^\//, '');
        if (safe !== key) {
          toMigrate.push({ from: key, to: safe, size: obj.size });
        }
      }
    }
  } while (cursor);

  if (dryRun) {
    return new Response(JSON.stringify({ dryRun: true, count: toMigrate.length, items: toMigrate.slice(0, 1000) }), { headers: { 'Content-Type': 'application/json' }});
  }

  const results = [];
  for (const item of toMigrate) {
    try {
      // If destination exists, add suffix to avoid collision
      let destKey = item.to;
      const head = await r2.head(destKey);
      if (head) {
        const parts = destKey.split('/');
        const last = parts.pop();
        const suffixed = `${last}-migrated`;
        destKey = [...parts, suffixed].join('/');
      }

      const obj = await r2.get(item.from);
      if (!obj) {
        results.push({ from: item.from, to: destKey, status: 'skipped-not-found' });
        continue;
      }

      const data = await obj.arrayBuffer();
      await r2.put(destKey, data, { httpMetadata: obj.httpMetadata, customMetadata: obj.customMetadata });
      await r2.delete(item.from);

      results.push({ from: item.from, to: destKey, status: 'migrated' });
    } catch (e) {
      results.push({ from: item.from, to: item.to, status: 'error', error: String(e) });
    }
  }

  return new Response(JSON.stringify({ dryRun: false, migrated: results.length, results }), { headers: { 'Content-Type': 'application/json' }});
};
