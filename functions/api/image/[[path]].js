// 이미지 조회 (예: /api/image/folder/photo.jpg)
export async function onRequestGet(context) {
    const { request, env, params } = context;
    
    // JWT 확인
    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt) {
        return new Response('Unauthorized', { status: 401 });
    }
    
    try {
        // params.path = ["folder", "photo.jpg"]
        const key = params.path.join('/');
        const object = await env.GALLERY_BUCKET.get(key);
        
        if (!object) {
            return new Response('Not found', { status: 404 });
        }
        
        return new Response(object.body, {
            headers: {
                'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000'
            }
        });
    } catch (error) {
        return new Response(error.message, { status: 500 });
    }
}
