// 파일 삭제 - 동적 경로 지원
export async function onRequestDelete(context) {
    const { request, env, params } = context;
    
    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    try {
        // URL에서 파일 경로 추출
        const filePath = params.path.join('/');
        
        // 파일 삭제
        await env.GALLERY_BUCKET.delete(filePath);
        
        // 비디오 파일인 경우 섬네일도 삭제
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
        const isVideo = videoExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
        
        if (isVideo) {
            const thumbnailPath = `.thumbnails/${filePath}.jpg`;
            try {
                await env.GALLERY_BUCKET.delete(thumbnailPath);
            } catch (e) {
                // 섬네일 삭제 실패는 무시
                console.log('Failed to delete thumbnail:', e.message);
            }
        }
        
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}