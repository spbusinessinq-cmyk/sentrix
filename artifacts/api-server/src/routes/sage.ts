import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { logger } from "../lib/logger";

const sageRouter = Router();

const SYSTEM_PROMPT = `You are SAGE — a tactical intelligence analyst embedded in Sentrix, a private security-focused search engine.

Your role: analyze the provided search results and help the user understand what matters, where to focus, and what to be cautious about.

STRICT GROUNDING RULES — you must follow these exactly:
- You MUST ONLY reference information explicitly present in the provided search results
- Do NOT invent facts, statistics, dates, names, or claims not present in the results
- Do NOT speculate beyond what the results contain
- If you cannot answer from the available results, say clearly: "Based on the available results, I cannot confirm this"
- Never fabricate quotes, links, or source details

RESPONSE STYLE:
- Concise and analytical — no fluff, no filler
- Direct and grounded — every claim tied to result content
- Tactical — help the user see what actually matters and why
- Flag uncertainty honestly when the results are insufficient

You are not a general chatbot. You are a grounded analyst operating strictly on the data in front of you.`;

function buildResultsContext(
  results: Array<{ title: string; domain: string; snippet: string; score?: number; confidence?: string }>
): string {
  if (!results || results.length === 0) return "No search results provided.";

  const top = results.slice(0, 10);
  return top
    .map((r, i) => {
      const tier = r.score != null ? (r.score >= 80 ? "[HIGH SIGNAL]" : r.score >= 60 ? "[MED SIGNAL]" : "[LOW SIGNAL]") : "";
      return `[Result ${i + 1}] ${r.domain} ${tier}\nTitle: ${r.title}\nSnippet: ${r.snippet}`;
    })
    .join("\n\n");
}

sageRouter.post("/sage/query", async (req, res) => {
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
  const searchQuery = query ? `\n\nSEARCH QUERY: "${query}"` : "";

  const groundingBlock = `${searchQuery}\n\nSEARCH RESULTS:\n${resultsContext}${intelligenceSummary}`;

  // Build conversation contents for Gemini
  // First message is always the grounding context + first user message
  const priorMessages = messages ?? [];

  type GeminiContent = {
    role: "user" | "model";
    parts: Array<{ text: string }>;
  };

  const contents: GeminiContent[] = [];

  if (priorMessages.length === 0) {
    // First turn — inject grounding context with the user message
    contents.push({
      role: "user",
      parts: [{ text: `${groundingBlock}\n\n---\n\nUser question: ${userMessage.trim()}` }],
    });
  } else {
    // Subsequent turns — first message carries grounding, then conversation history, then new message
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

    // Add current user message
    contents.push({
      role: "user" as const,
      parts: [{ text: userMessage.trim() }],
    });
  }

  // SSE headers
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
