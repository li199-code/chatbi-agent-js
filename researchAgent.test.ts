import { createAgent } from "./utils";
import { ChatDeepSeek } from "@langchain/deepseek";
import { chatbiAnalyzeTool, chatbiAskTool } from "./tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { Runnable } from "@langchain/core/runnables";
import { AgentState, runAgentNode } from "./utils";

const tools = [chatbiAnalyzeTool, chatbiAskTool];
// This runs tools in the graph
const toolNode = new ToolNode<typeof AgentState.State>(tools);

const llm = new ChatDeepSeek({
    model: "deepseek-chat"
});

const researchAgent = await createAgent({
  llm,
  tools: [chatbiAnalyzeTool],
  systemMessage: "你是一个根据给出的数据，提取趋势的助手。"
});

async function researchNode(
  state: typeof AgentState.State,
  config?: RunnableConfig,
) {
  return runAgentNode({
    state: state,
    agent: researchAgent,
    name: "Researcher",
    config,
  });
}

const researchResults = await researchNode({
  messages: [new HumanMessage("2023年第一季度的销售额和利润是多少？")],
  sender: "User",
});

console.log(researchResults);
console.log(await toolNode.invoke(researchResults));

