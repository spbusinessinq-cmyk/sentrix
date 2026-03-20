/**
 * EdgeOne Node Function — /api/healthz
 * Returns platform and readiness diagnostics.
 */

export async function onRequest(context) {
  const env = context.env ?? {};

  const hasGeminiKey = !!(
    env.GEMINI_API_KEY ||
    env.AI_INTEGRATIONS_GEMINI_API_KEY
  );
  const hasBraveKey = !!env.BRAVE_SEARCH_API_KEY;

  console.log(
    `[Sentrix] /api/healthz — geminiKey=${hasGeminiKey} braveKey=${hasBraveKey}`,
  );

  return new Response(
    JSON.stringify({
      status: 'ok',
      platform: 'edgeone-pages',
      environment: env.NODE_ENV ?? 'production',
      analysisMode: true,
      sageReady: hasGeminiKey,
      hasGeminiKey,
      hasBraveKey,
      searchReady: true,
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
