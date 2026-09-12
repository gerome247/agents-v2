import { generateText, stepCountIs, tool, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import { z }  from "zod";

import type {
  EvalData,
  SingleTurnResult,
  MultiTurnEvalData,
  MultiTurnResult,
} from "./types.ts";
import { writeFile } from "fs/promises";
import { buildMessages } from "./utils.ts";

const TOOL_DEFINITIONS: any = {
  readFile:  {
    description: 'Reads the contents of a file at the given path.',
    parameters: z.object({
      path: z.string().describe('The path of the file to read.'),
    }),

  },
  writeFile: {
    description: 'Writes content to a file at the given path.',
    parameters: z.object({
      path: z.string().describe('The path of the file to write.'),
      content: z.string().describe('The content to write to the file.'),
    }),
  },
  listFiles: {
    description: 'Lists the files in a directory.',
    parameters: z.object({
      path: z.string().describe('The path of the directory to list.'),
    }),
  },
  deleteFile: {
    description: 'Deletes a file at the given path.',
    parameters: z.object({
      path: z.string().describe('The path of the file to delete.'),
    }),
  },
  runCommand: {
    description: 'Runs a command in the terminal.',
    parameters: z.object({
      command: z.string().describe('The command to run.'),
    }),
  },
}

export const singleTurnExecutorWithMocks = async (evalData: EvalData) => {
  const messages = buildMessages(evalData);
  const tools: ToolSet = {};
  for (const toolName of evalData.tools) {
    const def = TOOL_DEFINITIONS[toolName];
    if (def) {
      tools[toolName] = tool({ description: def.description, inputSchema: def.parameters });
    }
  }
 const { toolCalls } = await generateText({
    model: openai(evalData.config?.model || "gpt-5-mini"),
    messages,
    tools,
    stopWhen: stepCountIs(1),
    temperature: evalData.config?.temperature ?? undefined,
    providerOptions: {
      openai: {
        reasoningEffort: "high",
      }
    }
  });

  const calls = toolCalls.map((tc) => ({
    toolName: tc.toolName,
    args: 'args' in tc ? tc.args : {},
  }));

  const toolNames = toolCalls.map((tc) => tc.toolName);

    return {
      toolCalls,
      toolNames,
      selectedAny: toolNames.length > 0,
    };

  }