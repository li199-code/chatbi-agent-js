import { createAgent } from "./utils";
import { ChatDeepSeek } from "@langchain/deepseek";
import { chatbiAnalyzeTool, chatbiAskTool, saveFile } from "./tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { Annotation } from "@langchain/langgraph";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { Runnable } from "@langchain/core/runnables";
import { AgentState, runAgentNode } from "./utils";
import { END, START, StateGraph } from "@langchain/langgraph";
import { scopeAgentPrompt, searchAgentPrompt, writerAgentPrompt } from "./prompts";

const tools = [chatbiAnalyzeTool, chatbiAskTool, saveFile];
// This runs tools in the graph
const toolNode = new ToolNode<typeof AgentState.State>(tools);

const llm = new ChatDeepSeek({
    model: "deepseek-reasoner"
});

const scopeAgent = await createAgent({
  llm,
  tools: [chatbiAnalyzeTool],
  systemMessage: scopeAgentPrompt
});

async function scopeNode(
  state: typeof AgentState.State,
  config?: RunnableConfig,
) {
  return runAgentNode({
    state: state,
    agent: scopeAgent,
    name: "Scope",
    config,
  });
}

const researchAgent = await createAgent({
  llm,
  tools: [chatbiAskTool],
  systemMessage: searchAgentPrompt
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

const writeAgent = await createAgent({
  llm,
  tools: [saveFile],
  systemMessage: writerAgentPrompt
});

async function writeNode(
  state: typeof AgentState.State,
  config?: RunnableConfig,
) {
  return runAgentNode({
    state: state,
    agent: writeAgent,
    name: "Writer",
    config,
  });
}

// Either agent can decide to end
function router(state: typeof AgentState.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
    // The previous agent is invoking a tool
    return "call_tool";
  }
  if (
    typeof lastMessage.content === "string" &&
    lastMessage.content.includes("FINAL ANSWER")
  ) {
    // Any agent decided the work is done
    return "end";
  }
  return "continue";
}

// 1. Create the graph
const workflow = new StateGraph(AgentState)
   // 2. Add the nodes; these will do the work
   .addNode("Scope", scopeNode)
  .addNode("Researcher", researchNode)
  .addNode("Writer", writeNode)
  .addNode("call_tool", toolNode);

workflow.addEdge(START, "Scope");

workflow.addConditionalEdges("Scope", router, {
  "call_tool": "call_tool",
  continue: "Researcher",
  end: END,
})


// Researcher 调用工具或流向 Writer
workflow.addConditionalEdges("Researcher", router, {
  call_tool: "call_tool", // 如果调用工具
  continue: "Writer",     // 如果想交接给 Writer
  end: "Writer",          // 也允许直接转给 Writer，Writer 处理完再 end
});

// Writer 调用工具或结束
workflow.addConditionalEdges("Writer", router, {
  call_tool: "call_tool",
  continue: END,
  // end: END,
});

// tool 调用完成后回到 sender
workflow.addConditionalEdges("call_tool", (state) => state.sender, {
  Scope: "Scope",
  Researcher: "Researcher",
  Writer: "Writer",
});




export const graph = workflow.compile();
export const flow = workflow







