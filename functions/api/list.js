// 갤러리 목록 조회
export async function onRequestGet(context) {
    const { request, env } = context;
    
    // Cloudflare Access JWT 확인
    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    try {
        const url = new URL(request.url);
        const path = url.searchParams.get('path') || '';
        const prefix = path ? `${path}/` : '';
        
        let cursor = undefined;
        const images = [];
        
        do {
            const listed = await env.GALLERY_BUCKET.list({
                prefix: prefix,
                cursor: cursor
            });
            
            for (const obj of listed.objects) {
                if (obj.key.endsWith('.placeholder')) continue;
                
                const relativePath = obj.key.substring(prefix.length);
                if (!relativePath.includes('/')) {
                    images.push({
                        key: obj.key,
                        size: obj.size,
                        uploaded: obj.uploaded
                    });
                }
            }
            
            cursor = listed.truncated ? listed.cursor : undefined;
        } while (cursor);
        
        return new Response(JSON.stringify(images), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
