import { evaluate } from '@lmnr-ai/lmnr';
import type { MultiTurnEvalData } from './types';
import { multiTurnExecutorWithMocks } from './executors';

import dataset from './data/agent-multiturn.json' with { type: 'json' };
import { llmJudge } from './evaluators';

const executor = async (evalData: MultiTurnEvalData) => {
  return multiTurnExecutorWithMocks(evalData);
};

evaluate({
  data: dataset as any,
  executor,
  evaluators: {
    outputQuality: async (output: any, target:any) => {
      if (!target) return 1;
      return llmJudge(output, target);
    }
  },
  config: {
    projectApiKey: process.env.LAMINAR_API_KEY,
  },
  groupName: 'agent-multiturn',
})