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
        // 다양한 디코딩 방법 시도
        let key;
        
        // 원본 path 배열을 문자열로 결합
        const originalKey = params.path.join('/');
        
        // 방법 1: 기본 디코딩
        try {
            key = params.path.map(part => decodeURIComponent(part)).join('/');
        } catch (e) {
            // 방법 2: 이미 디코딩되어 있을 수 있음
            key = originalKey;
        }
        
        console.log('Trying to fetch file:');
        console.log('- Original key:', originalKey);
        console.log('- Decoded key:', key);
        console.log('- Environment bucket name:', env.GALLERY_BUCKET ? 'Available' : 'Missing');
        
        // R2에서 파일 가져오기 - 먼저 디코딩된 키로 시도
        let object = await env.GALLERY_BUCKET.get(key);
        
        // 실패 시 원본 키로 시도
        if (!object) {
            console.log('Decoded key failed, trying original key');
            object = await env.GALLERY_BUCKET.get(originalKey);
            key = originalKey; // 성공한 키로 업데이트
        }
        
        // 여전히 실패 시 URL 인코딩된 버전 시도
        if (!object) {
            console.log('Original key failed, trying URL encoded versions');
            const encodedKey = params.path.map(part => encodeURIComponent(decodeURIComponent(part))).join('/');
            object = await env.GALLERY_BUCKET.get(encodedKey);
            if (object) {
                key = encodedKey;
            }
        }
        
        // 모든 방법이 실패한 경우 버킷 내용 확인 (디버깅용)
        if (!object) {
            console.log('All key variations failed. Listing bucket contents with similar prefix...');
            const pathParts = key.split('/');
            const prefix = pathParts.slice(0, -1).join('/') + (pathParts.length > 1 ? '/' : '');
            
            try {
                const listing = await env.GALLERY_BUCKET.list({ prefix: prefix, limit: 10 });
                console.log('Bucket contents for prefix "' + prefix + '":');
                listing.objects.forEach(obj => {
                    console.log('  - ' + obj.key + ' (size: ' + obj.size + ')');
                });
            } catch (listError) {
                console.log('Failed to list bucket contents:', listError.message);
            }
            
            return new Response(JSON.stringify({
                error: 'File not found',
                requestedKey: key,
                originalKey: originalKey,
                bucketAvailable: !!env.GALLERY_BUCKET,
                searchedPaths: [
                    key,
                    originalKey,
                    params.path.map(part => encodeURIComponent(decodeURIComponent(part))).join('/')
                ]
            }, null, 2), { 
                status: 404,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        console.log('File found successfully with key:', key);
        
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
        return new Response(JSON.stringify({
            error: 'Server error',
            message: error.message,
            stack: error.stack,
            bucketAvailable: !!env.GALLERY_BUCKET
        }, null, 2), { 
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}