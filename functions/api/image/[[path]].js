// GET /api/image/QuickShare/photo.jpg
export async function onRequestGet(context) {
    const { request, env, params } = context;
    
    // Cloudflare Access JWT 확인 (필요시 주석 처리)
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
    
    // 완전한 MIME Type 매핑 함수
    function getContentTypeFromExtension(key) {
        const ext = key.split('.').pop().toLowerCase();
        
        const mimeTypes = {
            // 이미지
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff',
            'tif': 'image/tiff',
            'ico': 'image/vnd.microsoft.icon',
            'heic': 'image/heic',
            'heif': 'image/heif',
            'avif': 'image/avif',
            
            // 동영상
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            'ogv': 'video/ogg',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'wmv': 'video/x-ms-wmv',
            'flv': 'video/x-flv',
            'mkv': 'video/x-matroska',
            '3gp': 'video/3gpp',
            'm4v': 'video/x-m4v',
            
            // 텍스트
            'txt': 'text/plain',
            'md': 'text/markdown',
            'html': 'text/html',
            'htm': 'text/html',
            'css': 'text/css',
            'js': 'text/javascript',
            'json': 'application/json',
            'xml': 'application/xml',
            'csv': 'text/csv',
            'log': 'text/plain',
            'rtf': 'application/rtf',
            
            // 오디오
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'flac': 'audio/flac',
            'm4a': 'audio/mp4',
            
            // 아카이브
            'zip': 'application/zip',
            'rar': 'application/vnd.rar',
            '7z': 'application/x-7z-compressed',
            'tar': 'application/x-tar',
            'gz': 'application/gzip',
            
            // 문서
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        };
        
        return mimeTypes[ext] || 'application/octet-stream';
    }
    
    try {
        // URL 디코딩 추가 (한글 파일명 지원)
        const decodedPath = params.path.map(part => decodeURIComponent(part));
        const key = decodedPath.join('/');
        
        console.log('Decoded key:', key); // 디버깅용
        
        // R2에서 파일 가져오기
        const object = await env.GALLERY_BUCKET.get(key);
        
        if (!object) {
            console.log('File not found:', key); // 디버깅용
            return new Response('File not found', { 
                status: 404,
                headers: { 'Content-Type': 'text/plain' }
            });
        }
        
        // 올바른 Content-Type 설정
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
