import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { logger } from "../lib/logger";

const sageRouter = Router();

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

function buildResultsContext(
  results: Array<{ title: string; domain: string; snippet: string; score?: number; confidence?: string }>
): string {
  if (!results || results.length === 0) return "No search results provided — answer from your knowledge and note this in Intelligence.";

  const top = results.slice(0, 10);
  return top
    .map((r, i) => {
      const tier = r.score != null
        ? (r.score >= 80 ? "[HIGH SIGNAL]" : r.score >= 60 ? "[MED SIGNAL]" : "[LOW SIGNAL]")
        : "";
      return `[Result ${i + 1}] ${r.domain} ${tier}\nTitle: ${r.title}\nSnippet: ${r.snippet}`;
    })
    .join("\n\n");
}

sageRouter.post("/sage/query", async (req, res) => {
  logger.info(
    { env: process.env.NODE_ENV, ip: req.ip },
    "[Sentrix] /api/sage/query hit",
  );

  const { query, results, context, messages, userMessage } = req.body as {
    query?: string;
    results?: Array<{ title: string; domain: string; snippet: string; score?: number; confidence?: string }>;
    context?: string;
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
    userMessage?: string;
  };

  if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
    res.status(400).json({ error: "userMessage is required" });
    return;
  }

  const resultsContext = buildResultsContext(results ?? []);
  const intelligenceSummary = context ? `\n\nINTELLIGENCE BRIEF:\n${context}` : "";
  const searchQuery = query ? `\n\nORIGINAL SEARCH QUERY: "${query}"` : "";

  const groundingBlock = `${searchQuery}\n\nSEARCH RESULTS AVAILABLE:\n${resultsContext}${intelligenceSummary}`;

  const priorMessages = messages ?? [];

  type GeminiContent = {
    role: "user" | "model";
    parts: Array<{ text: string }>;
  };

  const contents: GeminiContent[] = [];

  if (priorMessages.length === 0) {
    contents.push({
      role: "user",
      parts: [{ text: `${groundingBlock}\n\n---\n\nUser question: ${userMessage.trim()}` }],
    });
  } else {
    const [firstMsg, ...restMsgs] = priorMessages;
    contents.push({
      role: "user" as const,
      parts: [{ text: `${groundingBlock}\n\n---\n\nUser question: ${firstMsg.content}` }],
    });

    for (const msg of restMsgs) {
      contents.push({
        role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: msg.content }],
      });
    }

    contents.push({
      role: "user" as const,
      parts: [{ text: userMessage.trim() }],
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      config: {
        maxOutputTokens: 8192,
        systemInstruction: SYSTEM_PROMPT,
      },
      contents,
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    logger.info({ query, userMessage: userMessage.slice(0, 80) }, "Sage query completed");
  } catch (err) {
    logger.error({ err }, "Sage query failed");
    res.write(`data: ${JSON.stringify({ error: "Sage analysis failed — please try again" })}\n\n`);
    res.end();
  }
});

export default sageRouter;
