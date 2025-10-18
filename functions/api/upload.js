// 파일 업로드
export async function onRequestPost(context) {
    const { request, env } = context;
    
    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const path = formData.get('path') || '';
        
        const key = path ? `${path}/${file.name}` : file.name;
        
        await env.GALLERY_BUCKET.put(key, file.stream(), {
            httpMetadata: {
                contentType: file.type
            }
        });
        
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
