// 폴더/파일 이름 변경
export async function onRequestPut(context) {
    const { request, env } = context;

    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { oldKey, newKey } = await request.json();

        // 파일 복사 후 삭제
        const object = await env.GALLERY_BUCKET.get(oldKey);
        if (object) {
            await env.GALLERY_BUCKET.put(newKey, object.body, {
                httpMetadata: object.httpMetadata
            });
            await env.GALLERY_BUCKET.delete(oldKey);
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

// POST 메서드도 지원 (폴더 이름 변경용)
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
        const { oldPath, newPath } = await request.json();
        
        // 폴더 내 모든 파일 이동
        const listResponse = await env.GALLERY_BUCKET.list({ prefix: oldPath + '/' });
        
        for (const object of listResponse.objects) {
            const oldKey = object.key;
            const newKey = oldKey.replace(oldPath, newPath);
            
            const fileObject = await env.GALLERY_BUCKET.get(oldKey);
            if (fileObject) {
                await env.GALLERY_BUCKET.put(newKey, fileObject.body, {
                    httpMetadata: fileObject.httpMetadata
                });
                await env.GALLERY_BUCKET.delete(oldKey);
            }
        }
        
        // placeholder 파일도 이동
        const placeholder = await env.GALLERY_BUCKET.get(`${oldPath}/.placeholder`);
        if (placeholder) {
            await env.GALLERY_BUCKET.put(`${newPath}/.placeholder`, '');
            await env.GALLERY_BUCKET.delete(`${oldPath}/.placeholder`);
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