/**
 * EdgeOne Node Function — /api/healthz
 * Returns platform and readiness diagnostics.
 */

export async function onRequest(context) {
  const env = context.env ?? {};

  const sageReady = !!(
    env.GEMINI_API_KEY ||
    env.AI_INTEGRATIONS_GEMINI_API_KEY ||
    env.AI_INTEGRATIONS_GEMINI_BASE_URL
  );

  return new Response(
    JSON.stringify({
      status: 'ok',
      platform: 'edgeone-pages',
      environment: env.NODE_ENV ?? 'production',
      searchReady: true,
      sageReady,
      timestamp: new Date().toISOString(),
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
