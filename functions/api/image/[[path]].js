// GET /api/image/QuickShare/photo.jpg
export async function onRequestGet(context) {
    const { request, env, params } = context;
    
    // JWT 확인 (필요시 주석 처리)
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
    
    // 파일 확장자로 Content-Type 추론
    function getContentTypeFromExtension(key) {
        const ext = key.split('.').pop().toLowerCase();
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff',
            'ico': 'image/x-icon',
            'heic': 'image/heic',
            'heif': 'image/heif',
            // 비디오 형식
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            // 텍스트 형식
            'txt': 'text/plain'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    
    try {
        const key = params.path.join('/');
        
        // R2에서 파일 가져오기
        const object = await env.GALLERY_BUCKET.get(key);
        
        if (!object) {
            return new Response('File not found', { 
                status: 404,
                headers: { 'Content-Type': 'text/plain' }
            });
        }
        
        // 올바른 Content-Type으로 반환
        const contentType = object.httpMetadata?.contentType || getContentTypeFromExtension(key);
        
        return new Response(object.body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true'
            }
        });
        
    } catch (error) {
        console.error('File load error:', error);
        return new Response(`Error: ${error.message}`, { 
            status: 500,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}
