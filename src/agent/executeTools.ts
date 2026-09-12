import { tools } from "./tools";
export type ToolName = keyof typeof tools;
export const executeTool = async (name: string, args: any) => {
  const tool = tools[name as ToolName];
  if (!tool) {
    return `Unknown tool, this does not exist. Please check the tool name and try again.`;
  }
  const execute = tool.execute;
  if (!execute) {
    return `This tool does not have an execute function. Please check the tool implementation.`;
  }
  const result = await execute(args, {
    toolCallId: "",
    messages: [],
  });

  return String(result);
}