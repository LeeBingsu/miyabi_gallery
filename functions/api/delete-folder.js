// 폴더 삭제
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
        const { folderPath } = await request.json();
        
        // List all objects in the folder
        const listResponse = await env.GALLERY_BUCKET.list({ prefix: folderPath + '/' });
        
        // Delete all objects in the folder
        for (const object of listResponse.objects) {
            await env.GALLERY_BUCKET.delete(object.key);
        }
        
        // Also delete the placeholder file
        await env.GALLERY_BUCKET.delete(`${folderPath}/.placeholder`);
        
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