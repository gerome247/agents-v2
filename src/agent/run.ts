import "dotenv/config";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { generateText, streamText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { Laminar, getTracer } from "@lmnr-ai/lmnr";

import { tools } from "./tools/index.ts";
import { SYSTEM_PROMPT } from "./system/prompt.ts";

import type { AgentCallbacks, ToolCallInfo } from "../types.ts";
import { filterCompatibleMessages } from "./system/filterMessages.ts";
import { executeTool } from "./executeTool.ts";

Laminar.initialize({
  projectApiKey: process.env.LAMINAR_API_KEY,
});

const MODEL_NAME = "gpt-5-mini";

export async function runAgent(
  userMessage: string,
  conversationHistory: ModelMessage[],
  callbacks: AgentCallbacks,
): Promise<ModelMessage[]> {
  const workingHistory = filterCompatibleMessages(conversationHistory);

  const messages: ModelMessage[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    ...workingHistory,
    { role: "user", content: userMessage }
  ];

  let fullResponse = "";

  while (true) {
    const result = streamText({
      model: openai(MODEL_NAME),
      messages,
      tools,
      experimental_telemetry: {
        isEnabled: true,
        tracer: getTracer(),
      },
    });

    const toolCalls: ToolCallInfo[] = [];
    let currentText = "";
    let streamError: Error | null = null;

    try {
      for await (const chunk of result.fullStream) {
        if (chunk.type === 'text-delta') {
          currentText += chunk.text;
          callbacks.onToken(chunk.text);
        };
        if (chunk.type === 'tool-call') {
          const input = 'input' in chunk ? chunk.input : {};
          toolCalls.push({
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            args: input as any,
          });
          // shows the spinner
          callbacks.onToolCallStart(chunk.toolName, input);
        }
      }
    } catch (e) {
      streamError = e as Error;
      if(!currentText && !streamError.message.includes("No output generated")) {
        throw streamError;
      }
    }
    fullResponse += currentText;
    if(streamError && !currentText) {
      fullResponse = `Sorry about that. There was an error while generating the response: ${streamError.message}`;
      callbacks.onToken(fullResponse);
      break;
    }
    const finishReason = await result.finishReason;

    if (finishReason !== 'tool-calls' || toolCalls.length === 0) {
      const responseMessages = await result.response;
      messages.push(...responseMessages.messages);
      break;
    }
    const responseMessages = await result.response;
    messages.push(...responseMessages.messages);

    for (const tc of toolCalls) {
      const result = await executeTool(tc.toolName, tc.args);
      callbacks.onToolCallEnd(tc.toolName, result);

      messages.push({
        role: "tool",
        content: [ {
          type: "tool-result",
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          output: { type: "text", value: result},
        }]
      })
    }
  }

  callbacks.onComplete(fullResponse);
  return messages;
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
