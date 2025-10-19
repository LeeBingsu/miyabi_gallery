
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
        
        console.log('Listing files with prefix:', prefix);
        console.log('Bucket available:', !!env.GALLERY_BUCKET);
        
        let cursor = undefined;
        const images = [];
        let totalObjects = 0;
        
        do {
            const listed = await env.GALLERY_BUCKET.list({
                prefix: prefix,
                cursor: cursor
            });
            
            console.log(`Found ${listed.objects.length} objects in this batch`);
            
            for (const obj of listed.objects) {
                totalObjects++;
                console.log(`- Object: ${obj.key} (size: ${obj.size}, uploaded: ${obj.uploaded})`);
                
                if (obj.key.endsWith('.placeholder')) {
                    console.log('  Skipping placeholder file');
                    continue;
                }
                
                const relativePath = obj.key.substring(prefix.length);
                if (!relativePath.includes('/')) {
                    images.push({
                        key: obj.key,
                        size: obj.size,
                        uploaded: obj.uploaded,
                        lastModified: obj.uploaded // Add lastModified for sorting
                    });
                } else {
                    console.log(`  Skipping nested file: ${obj.key}`);
                }
            }
            
            cursor = listed.truncated ? listed.cursor : undefined;
        } while (cursor);
        
        console.log(`Total objects found: ${totalObjects}, Images to return: ${images.length}`);
        
        return new Response(JSON.stringify(images), {
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('List error:', error);
        return new Response(JSON.stringify({ 
            error: error.message,
            bucketAvailable: !!env.GALLERY_BUCKET,
            stack: error.stack
        }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}