// 저장공간 확인
export async function onRequestGet(context) {
    const { request, env } = context;
    
    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    try {
        let totalSize = 0;
        let fileCount = 0;
        let cursor = undefined;
        
        do {
            const listed = await env.GALLERY_BUCKET.list({ cursor });
            
            for (const obj of listed.objects) {
                if (!obj.key.endsWith('.placeholder')) {
                    totalSize += obj.size;
                    fileCount++;
                }
            }
            
            cursor = listed.truncated ? listed.cursor : undefined;
        } while (cursor);
        
        return new Response(JSON.stringify({
            totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            totalSizeGB: (totalSize / 1024 / 1024 / 1024).toFixed(2),
            fileCount
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
