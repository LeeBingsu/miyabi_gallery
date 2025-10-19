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
