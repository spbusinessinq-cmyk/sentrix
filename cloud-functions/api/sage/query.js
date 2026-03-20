/**
 * EdgeOne Node Function — /api/sage/query
 * Streams Gemini 2.5 Flash analysis as Server-Sent Events.
 * Credentials stay server-side only.
 * Fails gracefully into a structured limited-mode response.
 */

const SYSTEM_PROMPT = `You are SAGE — Sentrix's Signal & Truth Filter. You analyze information and return structured intelligence that helps users understand before they trust or act.

YOUR PRIMARY JOB: Explain what information actually means, how reliable it is, what matters, and what to question.

RESPONSE FORMAT — use EXACTLY these section headers, in this order:

## ANSWER
Complete, direct explanation of what this information actually means. What is true. What the user needs to know.
- For claims or headlines: explain what is being asserted, whether it is supported, and what the real picture is
- For questions: answer fully and clearly
- For URLs or articles: summarize the core content and assess its substance
- For controversial or political content: present the factual landscape without advocacy
Never redirect to links as a substitute for answering. Never hedge. Give the best answer possible.

## SIGNAL
One of: HIGH | MEDIUM | LOW
On the same line, briefly explain: what drives this signal level (source quality, evidence density, corroboration).
Example: "HIGH — multiple independent primary sources corroborate the core claim."

## AGREEMENT
One of: CONSENSUS | MIXED | CONFLICT
On the same line, briefly explain what sources agree or disagree on.
Example: "MIXED — scientific consensus supports the mechanism, but efficacy claims vary by study."

## RISK
One of: SAFE | CAUTION | DANGER
On the same line, briefly explain any manipulation patterns, trust signals, or sourcing weaknesses.
Example: "CAUTION — primary source is a press release without independent verification."

## WHAT MATTERS
Bullet list (3–6 items) of:
- Key verified facts
- Important context the user needs
- Entities or actors involved
- Timeline or scale if relevant

## WHAT TO QUESTION
Bullet list (3–5 items) of:
- Missing information or evidence gaps
- Possible bias or framing choices
- Weak or unverified claims
- Contradictions between sources
- What a skeptical reader would ask

## SOURCES
Only include if search results genuinely support the answer.
Format: • domain.com — what this source specifically contributes
Keep to 3–5 entries maximum. Omit entirely if no results add value.

RULES:
- ## ANSWER must always appear first and be complete — never skip it
- SIGNAL, AGREEMENT, RISK must each appear on a single line with the rating word first
- Never fabricate statistics, quotes, or URLs not in the search results
- Be direct, operator-grade, and specific — not vague or hedging
- The user should walk away informed, in control, and knowing what to question next`;

function buildResultsContext(results) {
  if (!results || results.length === 0) {
    return 'No search results provided — answer from your knowledge and note this.';
  }
  return results.slice(0, 10).map((r, i) => {
    const tier = r.score != null
      ? (r.score >= 80 ? '[HIGH SIGNAL]' : r.score >= 60 ? '[MED SIGNAL]' : '[LOW SIGNAL]')
      : '';
    return `[Result ${i + 1}] ${r.domain} ${tier}\nTitle: ${r.title}\nSnippet: ${r.snippet}`;
  }).join('\n\n');
}

function sseChunk(obj) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

function resolveGeminiKey(env) {
  return env?.GEMINI_API_KEY || env?.AI_INTEGRATIONS_GEMINI_API_KEY || null;
}

function resolveGeminiBase(env) {
  return env?.AI_INTEGRATIONS_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
}

function limitedModeFallback(userMessage) {
  const q = (userMessage || 'this input').trim().slice(0, 120);
  return [
    `## ANSWER`,
    `Analysis engine is running in limited mode — the Gemini API key is not configured for this deployment. The input received was: "${q}"`,
    ``,
    `## SIGNAL`,
    `LOW — analysis engine unavailable; no AI assessment was performed.`,
    ``,
    `## AGREEMENT`,
    `MIXED — cannot assess source agreement without the analysis engine.`,
    ``,
    `## RISK`,
    `CAUTION — verify claims independently; automated analysis is not available in this mode.`,
    ``,
    `## WHAT MATTERS`,
    `- Sentrix is operating in limited mode`,
    `- The GEMINI_API_KEY environment variable is not set in this deployment`,
    `- Configure the API key in your EdgeOne environment variables to enable full analysis`,
    ``,
    `## WHAT TO QUESTION`,
    `- Has the GEMINI_API_KEY been set in the EdgeOne Pages dashboard?`,
    `- Is the key a valid Google AI Studio API key?`,
    `- Does the key have access to the gemini-2.5-flash model?`,
  ].join('\n');
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { query, results, context: intelligenceContext, messages, userMessage } = body;

  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    return new Response(JSON.stringify({ error: 'userMessage is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = resolveGeminiKey(env ?? {});
  const hasBraveKey = !!(env?.BRAVE_SEARCH_API_KEY);

  console.log(
    `[Sentrix] /api/sage/query — geminiKey=${!!apiKey} braveKey=${hasBraveKey} fallback=${!apiKey} query="${(userMessage || '').slice(0, 60)}"`,
  );

  const sseHeaders = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  };

  if (!apiKey) {
    console.warn('[Sentrix] GEMINI_API_KEY not set — returning limited-mode fallback');
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const fallback = limitedModeFallback(userMessage);
    writer.write(encoder.encode(sseChunk({ content: fallback })));
    writer.write(encoder.encode(sseChunk({ done: true })));
    writer.close();
    return new Response(readable, { headers: sseHeaders });
  }

  const geminiBase = resolveGeminiBase(env ?? {});
  const resultsContext = buildResultsContext(results ?? []);
  const intelligenceSummary = intelligenceContext ? `\n\nINTELLIGENCE BRIEF:\n${intelligenceContext}` : '';
  const searchQuery = query ? `\n\nORIGINAL SEARCH QUERY: "${query}"` : '';
  const groundingBlock = `${searchQuery}\n\nSEARCH RESULTS AVAILABLE:\n${resultsContext}${intelligenceSummary}`;

  const priorMessages = messages ?? [];
  const contents = [];

  if (priorMessages.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: `${groundingBlock}\n\n---\n\nUser question: ${userMessage.trim()}` }],
    });
  } else {
    const [firstMsg, ...restMsgs] = priorMessages;
    contents.push({
      role: 'user',
      parts: [{ text: `${groundingBlock}\n\n---\n\nUser question: ${firstMsg.content}` }],
    });
    for (const msg of restMsgs) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: userMessage.trim() }],
    });
  }

  const geminiPayload = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { maxOutputTokens: 8192 },
  };

  const geminiUrl = `${geminiBase}/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    try {
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
        signal: AbortSignal.timeout(90000),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text().catch(() => String(geminiRes.status));
        console.error(`[Sentrix] Gemini API error ${geminiRes.status}: ${errText.slice(0, 300)}`);
        const fallback = limitedModeFallback(userMessage);
        writer.write(encoder.encode(sseChunk({ content: fallback })));
        writer.write(encoder.encode(sseChunk({ done: true })));
        writer.close();
        return;
      }

      const reader = geminiRes.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let hasOutput = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const raw = trimmed.slice(5).trim();
          if (!raw || raw === '[DONE]') continue;

          try {
            const evt = JSON.parse(raw);
            const text = evt?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              hasOutput = true;
              writer.write(encoder.encode(sseChunk({ content: text })));
            }
          } catch {
            // skip malformed SSE events
          }
        }
      }

      if (!hasOutput) {
        console.warn('[Sentrix] Gemini returned no text — emitting limited-mode fallback');
        writer.write(encoder.encode(sseChunk({ content: limitedModeFallback(userMessage) })));
      }

      writer.write(encoder.encode(sseChunk({ done: true })));
      writer.close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[Sentrix] Sage stream error: ${msg}`);
      const fallback = limitedModeFallback(userMessage);
      writer.write(encoder.encode(sseChunk({ content: fallback })));
      writer.write(encoder.encode(sseChunk({ done: true })));
      writer.close();
    }
  })();

  return new Response(readable, { headers: sseHeaders });
}
