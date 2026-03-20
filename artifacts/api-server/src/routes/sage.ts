import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { logger } from "../lib/logger";

const sageRouter = Router();

const SYSTEM_PROMPT = `You are SAGE — a direct intelligence and answer system integrated into Sentrix.

YOUR PRIMARY JOB: Answer the user's question completely and clearly.

RESPONSE FORMAT — structure every response using EXACTLY these section headers:

## ANSWER
Write a complete, direct answer. This is the most important section.
- For procedural questions ("how to make bread"): provide full steps with ingredients, method, and tips
- For explanatory questions ("what is X"): define clearly, give context, explain significance
- For current events ("news about X"): summarize what is known from the results
- For analysis requests: provide structured analysis with clear conclusions
Be thorough. Use numbered lists for steps. Use bullet points for facts.
Never hedge by saying "I cannot answer" — give the best possible answer using your knowledge.

## SOURCES
List the search results that support your answer.
Format: • domain.com — what this source adds to the answer
Only include results that are actually relevant. Skip irrelevant ones.
If no results support the answer, omit this section entirely.

## INTELLIGENCE
1-2 sentences on signal quality: source agreement, coverage gaps, or confidence level.
Omit entirely if there is nothing notable to flag.

RULES:
- ## ANSWER must always be present and complete — never skip it
- Use search results to validate and enrich answers, not as a substitute for them
- Be direct, confident, and operator-grade — not cautious and hedging
- When results are weak, use your knowledge and note it in Intelligence
- Never fabricate specific URLs, quotes, or statistics not in the results`;

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
