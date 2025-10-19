// DEBUG endpoint to help diagnose R2 bucket issues
export async function onRequestGet(context) {
    const { request, env } = context;
    
    // Cloudflare Access JWT 확인
    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    try {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            environment: {
                bucketAvailable: !!env.GALLERY_BUCKET,
                bucketType: typeof env.GALLERY_BUCKET,
                envKeys: Object.keys(env || {})
            },
            request: {
                url: request.url,
                method: request.method,
                hasJWT: !!jwt,
                userAgent: request.headers.get('User-Agent'),
                origin: request.headers.get('Origin'),
                referer: request.headers.get('Referer')
            }
        };
        
        // R2 버킷 연결 테스트
        if (env.GALLERY_BUCKET) {
            try {
                console.log('Testing R2 bucket connection...');
                const listResult = await env.GALLERY_BUCKET.list({ limit: 5 });
                debugInfo.bucket = {
                    connectionSuccess: true,
                    objectCount: listResult.objects.length,
                    truncated: listResult.truncated,
                    sampleObjects: listResult.objects.map(obj => ({
                        key: obj.key,
                        size: obj.size,
                        uploaded: obj.uploaded
                    }))
                };
                console.log('R2 bucket test successful, found', listResult.objects.length, 'objects');
            } catch (bucketError) {
                debugInfo.bucket = {
                    connectionSuccess: false,
                    error: bucketError.message,
                    stack: bucketError.stack
                };
                console.error('R2 bucket test failed:', bucketError);
            }
        } else {
            debugInfo.bucket = {
                connectionSuccess: false,
                error: 'GALLERY_BUCKET environment variable not available'
            };
        }
        
        return new Response(JSON.stringify(debugInfo, null, 2), {
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
        
    } catch (error) {
        console.error('Debug endpoint error:', error);
        return new Response(JSON.stringify({
            error: 'Debug endpoint failed',
            message: error.message,
            stack: error.stack
        }, null, 2), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}