import "dotenv/config";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { generateText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { Laminar, getTracer } from "@lmnr-ai/lmnr";

import { tools } from "./tools/index.ts";
import { SYSTEM_PROMPT } from "./system/prompt.ts";

import type { AgentCallbacks } from "../types.ts";

Laminar.initialize();

const MODEL_NAME = "gpt-5-mini";

export async function runAgent(
  userMessage: string,
  conversationHistory: ModelMessage[],
  callbacks: AgentCallbacks,
): Promise<any> {
  // Filter and check if we need to compact the conversation history before starting
  const { text } = await generateText({
    model: openai(MODEL_NAME),
    prompt: userMessage,
    system: SYSTEM_PROMPT,
    tools,
    experimental_telemetry: {
      isEnabled: true,
      tracer: getTracer(),
    },
  });

  console.log(text);
}

const isDirectRun =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  await runAgent("What is the current time right now?", [], {
    onToken() {},
    onToolCallStart() {},
    onToolCallEnd() {},
    onComplete() {},
    onToolApproval: async () => true,
  });
  await Laminar.flush();

  console.log("Agent run completed.");
}
