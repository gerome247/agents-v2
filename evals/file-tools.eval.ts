import { evaluate } from "@lmnr-ai/lmnr";
import dataset from "./data/file-tools.json" with { type: "json" };

import { singleTurnExecutorWithMocks } from "./executors.ts";
import type { EvalData } from "./types.ts";
import { toolSelectionScore } from "./evaluators.ts";

const executor = async (data: EvalData) => {
  return await singleTurnExecutorWithMocks(data);
};

evaluate({
  data: dataset as any,
  executor,
  evaluators: {
    selectionScore: async (output: any, target: any) => {
      return toolSelectionScore(output, target);
    },
  },
  groupName: "file-tools-selection",
})