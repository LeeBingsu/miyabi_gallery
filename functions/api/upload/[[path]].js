// functions/api/upload/[[path]].js
export async function onRequestPut(context) {
    const { request, env, params } = context;
    
    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt) {
        return new Response('Unauthorized', { status: 401 });
    }
    
    try {
        // params.path = ["folder", "...", "filename.ext"]
        const key = params.path.join('/');
        
        // Store object
        await env.GALLERY_BUCKET.put(key, request.body, {
            httpMetadata: {
                contentType: request.headers.get('Content-Type') || 'application/octet-stream'
            }
        });
        
        // Fire-and-forget: normalize any wrongly-encoded keys (no UI needed)
        // We call the same function logic as /api/fix-folder-names but inline for speed and to avoid a second HTTP hop.
        context.waitUntil((async () => {
            try {
                const r2 = env.GALLERY_BUCKET;
                let cursor;
                const prefix = '';
                do {
                    const res = await r2.list({ prefix, cursor });
                    cursor = res.truncated ? res.cursor : undefined;
                    for (const obj of res.objects) {
                        const k = obj.key;
                        if (/%2F/i.test(k)) {
                            const normalized = k.replace(/%2F/gi, '/').replace(/\/+/, '/').replace(/^\//, '');
                            if (normalized !== k) {
                                const got = await r2.get(k);
                                if (got) {
                                    const data = await got.arrayBuffer();
                                    await r2.put(normalized, data, { httpMetadata: got.httpMetadata, customMetadata: got.customMetadata });
                                    await r2.delete(k);
                                }
                            }
                        }
                    }
                } while (cursor);
            } catch (e) {
                // Swallow errors to not affect the upload response
                console.log('Auto-fix folder names error:', e.message);
            }
        })());
        
        return new Response(JSON.stringify({ success: true, key }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
