// 파일 삭제 - 복수 파일 지원
export async function onRequestDelete(context) {
    const { request, env } = context;
    
    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    try {
        const { keys } = await request.json();
        
        // 복수 파일 삭제
        for (const key of keys) {
            await env.GALLERY_BUCKET.delete(key);
            
            // 비디오 파일인 경우 섬네일도 삭제
            const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
            const isVideo = videoExtensions.some(ext => key.toLowerCase().endsWith(ext));
            
            if (isVideo) {
                const thumbnailPath = `.thumbnails/${key}.jpg`;
                try {
                    await env.GALLERY_BUCKET.delete(thumbnailPath);
                } catch (e) {
                    // 섬네일 삭제 실패는 무시
                    console.log('Failed to delete thumbnail:', e.message);
                }
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

// POST 메서드도 지원 (호환성)
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
        const { keys } = await request.json();
        
        for (const key of keys) {
            await env.GALLERY_BUCKET.delete(key);
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