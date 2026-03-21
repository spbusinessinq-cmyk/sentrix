export async function onRequest() {
  return new Response(
    JSON.stringify({
      ok: true,
      source: 'edgeone-cloud-function',
      timestamp: new Date().toISOString(),
      version: 'sentrix-canary-1',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    }
  );
}
