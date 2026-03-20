import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { logger } from "../lib/logger";

const sageRouter = Router();

// ── Input type detection ──────────────────────────────────────────────────────

type InputType = "url" | "article" | "question";

function detectInputType(msg: string): InputType {
  const trimmed = msg.trim();
  if (/^https?:\/\/[^\s]{4,}/.test(trimmed)) return "url";
  if (trimmed.length > 300) return "article";
  return "question";
}

// ── Article extraction from HTML ──────────────────────────────────────────────

interface ArticleData {
  title: string;
  domain: string;
  author?: string;
  date?: string;
  content: string;
  success: boolean;
  error?: string;
}

function parseHtml(html: string, url: string): ArticleData {
  const domain = (() => {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch { return url.slice(0, 40); }
  })();

  const titleMatch =
    html.match(/property="og:title"\s+content="([^"]{3,200})"/i) ||
    html.match(/content="([^"]{3,200})"\s+property="og:title"/i) ||
    html.match(/<title[^>]*>([^<]{3,200})<\/title>/i) ||
    html.match(/<h1[^>]*>([^<]{3,150})<\/h1>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g, "&") : domain;

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
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, " ")
    .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]{1,8};/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 9000);

  return { title, domain, author, date, content, success: true };
}

async function fetchArticle(url: string): Promise<ArticleData> {
  const domain = (() => {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch { return url.slice(0, 40); }
  })();

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SentrixAnalysis/1.0; +https://sentrix.io)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return {
        title: domain,
        domain,
        content: `Content could not be fully retrieved. Analysis based on available data. HTTP ${res.status} from ${url}`,
        success: false,
        error: `HTTP ${res.status}`,
      };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      return {
        title: domain,
        domain,
        content: `Non-HTML content (${contentType}) at ${url}. Analysis based on available data.`,
        success: false,
        error: "non-html",
      };
    }

    const html = await res.text();
    return parseHtml(html, url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      title: domain,
      domain,
      content: `Content could not be fully retrieved. Analysis based on available data. (${msg.slice(0, 120)})`,
      success: false,
      error: msg,
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

// ── Results context builder ───────────────────────────────────────────────────

function buildResultsContext(
  results: Array<{ title: string; domain: string; snippet: string; score?: number }>
): string {
  if (!results || results.length === 0)
    return "No search results provided — answer from knowledge and note this.";
  return results
    .slice(0, 10)
    .map((r, i) => {
      const tier =
        r.score != null
          ? r.score >= 80
            ? "[HIGH SIGNAL]"
            : r.score >= 60
            ? "[MED SIGNAL]"
            : "[LOW SIGNAL]"
          : "";
      return `[Result ${i + 1}] ${r.domain} ${tier}\nTitle: ${r.title}\nSnippet: ${r.snippet}`;
    })
    .join("\n\n");
}

// ── Route ─────────────────────────────────────────────────────────────────────

sageRouter.post("/sage/query", async (req, res) => {
  const { query, results, context, messages, userMessage } = req.body as {
    query?: string;
    results?: Array<{ title: string; domain: string; snippet: string; score?: number }>;
    context?: string;
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
    userMessage?: string;
  };

  if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
    res.status(400).json({ error: "userMessage is required" });
    return;
  }

  const inputType = detectInputType(userMessage);
  const isArticleMode = inputType === "url" || inputType === "article";

  logger.info(
    { inputType, url: inputType === "url" ? userMessage.trim().slice(0, 120) : undefined },
    `[Sentrix] /api/sage/query — type=${inputType}`,
  );

  // ── Fetch article if URL ────────────────────────────────────────────────────
  let articleBlock = "";
  let articleFetched = false;

  if (inputType === "url") {
    const article = await fetchArticle(userMessage.trim());
    articleFetched = article.success;
    logger.info(
      { success: article.success, domain: article.domain, error: article.error },
      `[Sentrix] Article fetch — success=${article.success}`,
    );

    if (article.success) {
      articleBlock =
        `\n\nARTICLE CONTENT EXTRACTED:\n` +
        `URL: ${userMessage.trim()}\n` +
        `Title: ${article.title}\n` +
        `Domain: ${article.domain}\n` +
        (article.author ? `Author: ${article.author}\n` : "") +
        (article.date ? `Date: ${article.date}\n` : "") +
        `\n--- ARTICLE TEXT ---\n${article.content}\n--- END ARTICLE ---`;
    } else {
      articleBlock =
        `\n\nARTICLE FETCH NOTE: Content could not be fully retrieved from ${userMessage.trim()}. ` +
        `Reason: ${article.error ?? "unknown"}. Analyze based on available data and note this once.`;
    }
  }

  // ── Build grounding block ───────────────────────────────────────────────────
  const resultsContext = buildResultsContext(results ?? []);
  const intelligenceSummary = context ? `\n\nINTELLIGENCE BRIEF:\n${context}` : "";
  const searchQuery = query ? `\n\nORIGINAL QUERY: "${query}"` : "";
  const modeNote = isArticleMode
    ? "\n\nMODE: Article/URL analysis — use the full Article Mode Extension format."
    : "";

  const groundingBlock =
    `${searchQuery}${modeNote}` +
    `\n\nSEARCH RESULTS:\n${resultsContext}` +
    `${intelligenceSummary}` +
    `${articleBlock}`;

  // ── Build conversation contents ─────────────────────────────────────────────
  type GeminiContent = { role: "user" | "model"; parts: Array<{ text: string }> };
  const contents: GeminiContent[] = [];
  const priorMessages = messages ?? [];

  if (priorMessages.length === 0) {
    contents.push({
      role: "user",
      parts: [{ text: `${groundingBlock}\n\n---\n\nUser input: ${userMessage.trim()}` }],
    });
  } else {
    const [firstMsg, ...restMsgs] = priorMessages;
    contents.push({
      role: "user",
      parts: [{ text: `${groundingBlock}\n\n---\n\nUser input: ${firstMsg.content}` }],
    });
    for (const msg of restMsgs) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }
    contents.push({ role: "user", parts: [{ text: userMessage.trim() }] });
  }

  // ── Stream response ─────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  let geminiUsed = false;
  let fallbackUsed = false;

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      config: { maxOutputTokens: 8192, systemInstruction: SYSTEM_PROMPT },
      contents,
    });

    geminiUsed = true;
    let hasOutput = false;

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        hasOutput = true;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    if (!hasOutput) {
      fallbackUsed = true;
      res.write(`data: ${JSON.stringify({ content: limitedMode(userMessage) })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    logger.info(
      { inputType, geminiUsed, fallbackUsed, articleFetched },
      "[Sentrix] Sage query completed",
    );
  } catch (err) {
    fallbackUsed = true;
    logger.error({ err, inputType, geminiUsed }, "[Sentrix] Sage query failed");
    res.write(`data: ${JSON.stringify({ content: limitedMode(userMessage) })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});

function limitedMode(userMessage: string): string {
  const q = (userMessage || "this input").trim().slice(0, 120);
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
    `- The Gemini API integration is not responding`,
    `- Manual analysis is required for this input`,
    ``,
    `## WHAT TO QUESTION`,
    `- Is the API integration configured correctly in Settings?`,
    `- Has the Gemini API key been set in the environment?`,
    `- Is the key a valid Google AI Studio key with access to gemini-2.5-flash?`,
  ].join("\n");
}

export default sageRouter;
