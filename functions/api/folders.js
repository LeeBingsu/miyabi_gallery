// 폴더 목록 조회
export async function onRequestGet(context) {
    const { request, env } = context;

    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const url = new URL(request.url);
        const parentPath = url.searchParams.get('parent') || '';
        const prefix = parentPath ? `${parentPath}/` : '';

        const folders = new Set();
        let cursor = undefined;

        do {
            const listed = await env.GALLERY_BUCKET.list({
                prefix: prefix,
                cursor: cursor
            });

            for (const obj of listed.objects) {
                const relativePath = obj.key.substring(prefix.length);
                const parts = relativePath.split('/');

                if (parts.length > 1 && parts[0]) {
                    folders.add(parts[0]);
                }
            }

            cursor = listed.truncated ? listed.cursor : undefined;
        } while (cursor);

        return new Response(JSON.stringify(Array.from(folders).sort()), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
