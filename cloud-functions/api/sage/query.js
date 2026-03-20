/**
 * EdgeOne Node Function — /api/sage/query
 * Streams Gemini 2.5 Flash analysis as Server-Sent Events.
 * Supports: URL article fetching, input type detection, article mode analysis.
 */

// ── Input type detection ──────────────────────────────────────────────────────

function detectInputType(msg) {
  const trimmed = msg.trim();
  if (/^https?:\/\/[^\s]{4,}/.test(trimmed)) return 'url';
  if (trimmed.length > 300) return 'article';
  return 'question';
}

// ── Article extraction ────────────────────────────────────────────────────────

function parseHtml(html, url) {
  const domain = (() => {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch { return url.slice(0, 40); }
  })();

  const titleMatch =
    html.match(/property="og:title"\s+content="([^"]{3,200})"/i) ||
    html.match(/content="([^"]{3,200})"\s+property="og:title"/i) ||
    html.match(/<title[^>]*>([^<]{3,200})<\/title>/i) ||
    html.match(/<h1[^>]*>([^<]{3,150})<\/h1>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g, '&') : domain;

  const authorMatch =
    html.match(/property="article:author"\s+content="([^"]{2,80})"/i) ||
    html.match(/name="author"\s+content="([^"]{2,80})"/i) ||
    html.match(/rel="author"[^>]*>([^<]{2,60})</i);
  const author = authorMatch ? authorMatch[1].trim() : undefined;

  const dateMatch =
    html.match(/property="article:published_time"\s+content="([^"]{8,})"/i) ||
    html.match(/property="og:article:published_time"\s+content="([^"]{8,})"/i) ||
    html.match(/datetime="([0-9]{4}-[0-9]{2}-[0-9]{2}[^"]{0,20})"/i);
  const date = dateMatch ? dateMatch[1].slice(0, 10) : undefined;

  const content = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]{1,8};/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 9000);

  return { title, domain, author, date, content, success: true };
}

async function fetchArticle(url) {
  const domain = (() => {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch { return url.slice(0, 40); }
  })();

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SentrixAnalysis/1.0; +https://sentrix.io)',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return {
        title: domain, domain,
        content: `Content could not be fully retrieved. Analysis based on available data. HTTP ${res.status}.`,
        success: false, error: `HTTP ${res.status}`,
      };
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('html')) {
      return {
        title: domain, domain,
        content: `Non-HTML content (${contentType}) at ${url}. Analysis based on available data.`,
        success: false, error: 'non-html',
      };
    }

    const html = await res.text();
    return parseHtml(html, url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      title: domain, domain,
      content: `Content could not be fully retrieved. Analysis based on available data. (${msg.slice(0, 120)})`,
      success: false, error: msg,
    };
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are SAGE — Sentrix's Signal & Truth Filter. You analyze information and return structured intelligence.

Your job: help the user understand before they believe or act.
You are an intelligence system, not a chatbot. Be direct, precise, and operator-grade.

━━━━━━━━━━━━━━━━━━━━━━━
CORE FORMAT (ALL RESPONSES)
━━━━━━━━━━━━━━━━━━━━━━━

## ANSWER
Direct conclusion first. Complete explanation. What is true, what is supported, what the user needs to know.
- For claims or headlines: what is being asserted, whether it holds up, and what the real picture is
- For questions: answer fully and clearly
- For URLs or articles: summarize the core content and assess its substance
- For controversial or political content: present the factual landscape without advocacy
Never hedge. Never redirect with "you can search for this." Give the best answer possible from available evidence.
If content could not be retrieved, analyze based on what is available and note it once.

## SIGNAL
HIGH / MEDIUM / LOW — then explain what drives this level (source quality, evidence density, corroboration).
Example: "HIGH — multiple independent primary sources corroborate the core claim."

## AGREEMENT
CONSENSUS / MIXED / CONFLICT / UNKNOWN — then explain what sources agree or disagree on.
Example: "MIXED — scientific consensus supports the mechanism, but efficacy claims vary by study."

## RISK
SAFE / CAUTION / DANGER — then explain any manipulation patterns, trust signals, or sourcing weaknesses.
Example: "CAUTION — primary source is a press release without independent verification."

## WHAT MATTERS
Bullet list (3–6 items):
- Key verified facts
- Important context the user needs
- Entities or actors involved
- Timeline or scale if relevant

## WHAT TO QUESTION
Bullet list (3–5 items):
- Missing information or evidence gaps
- Possible bias or framing choices
- Weak or unverified claims
- Contradictions between sources
- What a skeptical reader would ask

## SOURCES
Include only if search results genuinely support the answer.
Format: • domain.com — what this source specifically contributes
Max 5 entries. Omit entirely if no results add value.

━━━━━━━━━━━━━━━━━━━━━━━
ARTICLE / URL MODE EXTENSION
━━━━━━━━━━━━━━━━━━━━━━━

When the input is a URL or a pasted article, ALSO include ALL of these sections AFTER the core sections above:

## ARTICLE
- Title:
- Outlet:
- Date:
- Author:

## SUMMARY
What the article is actually saying in 2–4 sentences. Neutral, factual.

## CORE CLAIMS
Bullet list of the actual claims made:
- Factual claims (verifiable assertions)
- Quoted claims (attributed to a source)
- Statistical claims (numbers, percentages)
- Implied claims (framing-driven)
Separate clearly: mark each as [FACT] [QUOTED] [STAT] [IMPLIED]

## VERDICT
One of: WELL SUPPORTED / PARTIALLY SUPPORTED / WEAKLY SUPPORTED / UNCLEAR / HIGH RISK
Follow with a one-sentence explanation.

## WHAT HOLDS UP
Bullet list of credible, verifiable parts of the article.

## WHAT DOES NOT HOLD UP
Bullet list of weak, unverified, or misleading parts.

## WHAT TO VERIFY NEXT
Bullet list of 3–5 concrete next investigation steps the user should take.

━━━━━━━━━━━━━━━━━━━━━━━
RULES
━━━━━━━━━━━━━━━━━━━━━━━
- ## ANSWER must always appear first and be complete
- SIGNAL / AGREEMENT / RISK: rating word first, explanation on same line
- Never fabricate statistics, quotes, or URLs not provided
- Never say "I cannot access live URLs" — attempt analysis from available data and note limitations once
- Never say "I don't have access to" — instead, work with what is available
- Be direct, operator-grade, specific — not vague or hedging
- The user should walk away informed, in control, and knowing what to question next`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildResultsContext(results) {
  if (!results || results.length === 0)
    return 'No search results provided — answer from knowledge and note this.';
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
    `Analysis engine is running in limited mode. The input received was: "${q}"`,
    ``,
    `## SIGNAL`,
    `LOW — analysis engine unavailable; no AI assessment was performed.`,
    ``,
    `## AGREEMENT`,
    `UNKNOWN — cannot assess source agreement without the analysis engine.`,
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

// ── Handler ───────────────────────────────────────────────────────────────────

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
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try { body = await request.json(); }
  catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { query, results, context: intelligenceContext, messages, userMessage } = body;

  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    return new Response(JSON.stringify({ error: 'userMessage is required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const inputType = detectInputType(userMessage);
  const isArticleMode = inputType === 'url' || inputType === 'article';
  const apiKey = resolveGeminiKey(env ?? {});

  console.log(
    `[Sentrix] /api/sage/query — type=${inputType} geminiKey=${!!apiKey} query="${(userMessage || '').slice(0, 60)}"`,
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
    writer.write(encoder.encode(sseChunk({ content: limitedModeFallback(userMessage) })));
    writer.write(encoder.encode(sseChunk({ done: true })));
    writer.close();
    return new Response(readable, { headers: sseHeaders });
  }

  // ── Article fetch ───────────────────────────────────────────────────────────
  let articleBlock = '';
  if (inputType === 'url') {
    const article = await fetchArticle(userMessage.trim());
    console.log(`[Sentrix] Article fetch — success=${article.success} domain=${article.domain} error=${article.error ?? 'none'}`);

    if (article.success) {
      articleBlock =
        `\n\nARTICLE CONTENT EXTRACTED:\n` +
        `URL: ${userMessage.trim()}\n` +
        `Title: ${article.title}\n` +
        `Domain: ${article.domain}\n` +
        (article.author ? `Author: ${article.author}\n` : '') +
        (article.date ? `Date: ${article.date}\n` : '') +
        `\n--- ARTICLE TEXT ---\n${article.content}\n--- END ARTICLE ---`;
    } else {
      articleBlock =
        `\n\nARTICLE FETCH NOTE: Content could not be fully retrieved from ${userMessage.trim()}. ` +
        `Reason: ${article.error ?? 'unknown'}. Analyze based on available data and note this once.`;
    }
  }

  // ── Grounding block ─────────────────────────────────────────────────────────
  const resultsContext = buildResultsContext(results ?? []);
  const intelligenceSummary = intelligenceContext ? `\n\nINTELLIGENCE BRIEF:\n${intelligenceContext}` : '';
  const searchQuery = query ? `\n\nORIGINAL QUERY: "${query}"` : '';
  const modeNote = isArticleMode ? '\n\nMODE: Article/URL analysis — use the full Article Mode Extension format.' : '';

  const groundingBlock =
    `${searchQuery}${modeNote}` +
    `\n\nSEARCH RESULTS:\n${resultsContext}` +
    `${intelligenceSummary}` +
    `${articleBlock}`;

  // ── Conversation contents ───────────────────────────────────────────────────
  const priorMessages = messages ?? [];
  const contents = [];

  if (priorMessages.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: `${groundingBlock}\n\n---\n\nUser input: ${userMessage.trim()}` }],
    });
  } else {
    const [firstMsg, ...restMsgs] = priorMessages;
    contents.push({
      role: 'user',
      parts: [{ text: `${groundingBlock}\n\n---\n\nUser input: ${firstMsg.content}` }],
    });
    for (const msg of restMsgs) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
    contents.push({ role: 'user', parts: [{ text: userMessage.trim() }] });
  }

  // ── Stream from Gemini ──────────────────────────────────────────────────────
  const geminiBase = resolveGeminiBase(env ?? {});
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
    let geminiUsed = false;
    let fallbackUsed = false;

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
        fallbackUsed = true;
        writer.write(encoder.encode(sseChunk({ content: limitedModeFallback(userMessage) })));
        writer.write(encoder.encode(sseChunk({ done: true })));
        writer.close();
        return;
      }

      geminiUsed = true;
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
          } catch { /* skip malformed events */ }
        }
      }

      if (!hasOutput) {
        fallbackUsed = true;
        console.warn('[Sentrix] Gemini returned no text — emitting limited-mode fallback');
        writer.write(encoder.encode(sseChunk({ content: limitedModeFallback(userMessage) })));
      }

      writer.write(encoder.encode(sseChunk({ done: true })));
      writer.close();

      console.log(`[Sentrix] Sage completed — type=${inputType} gemini=${geminiUsed} fallback=${fallbackUsed} articleFetched=${inputType === 'url'}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[Sentrix] Sage stream error: ${msg}`);
      fallbackUsed = true;
      writer.write(encoder.encode(sseChunk({ content: limitedModeFallback(userMessage) })));
      writer.write(encoder.encode(sseChunk({ done: true })));
      writer.close();
    }
  })();

  return new Response(readable, { headers: sseHeaders });
}
