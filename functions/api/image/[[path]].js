// GET /api/image/QuickShare/photo.jpg
export async function onRequestGet(context) {
    const { request, env, params } = context;
    
    // Cloudflare Access JWT 확인
    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt) {
        return new Response('Unauthorized', { 
            status: 401,
            headers: { 
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    try {
        // params.path = ["QuickShare", "photo.jpg"]
        const key = params.path.join('/');
        
        // R2에서 이미지 가져오기
        const object = await env.GALLERY_BUCKET.get(key);
        
        if (!object) {
            return new Response('Image not found', { 
                status: 404,
                headers: { 'Content-Type': 'text/plain' }
            });
        }
        
        // 이미지 반환
        return new Response(object.body, {
            status: 200,
            headers: {
                'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true'
            }
        });
        
    } catch (error) {
        console.error('Image load error:', error);
        return new Response(`Error: ${error.message}`, { 
            status: 500,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// OPTIONS 요청 처리 (CORS Preflight)
export async function onRequestOptions(context) {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Cf-Access-Jwt-Assertion',
            'Access-Control-Allow-Credentials': 'true'
        }
    });
}
