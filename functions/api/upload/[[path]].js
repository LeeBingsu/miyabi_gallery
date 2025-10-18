// functions/api/upload/[[path]].js
export async function onRequestPut(context) {
    const { request, env, params } = context;
    
    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt) {
        return new Response('Unauthorized', { status: 401 });
    }
    
    try {
        // params.path = ["QuickShare", "filename.jpg"]
        const key = params.path.join('/');
        
        await env.GALLERY_BUCKET.put(key, request.body, {
            httpMetadata: {
                contentType: request.headers.get('Content-Type') || 'application/octet-stream'
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
