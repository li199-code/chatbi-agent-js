import { graph, flow } from "./graph";
import { HumanMessage } from "@langchain/core/messages";
import fs from "fs";

const streamResults = await graph.stream(
  {
    messages: [
      new HumanMessage({
        content: "先去查一下2023年第一季度的销售额和利润，并生成一篇文章",
      }),
    ],
  },
  { recursionLimit: 150 },
);

const prettifyOutput = (output: Record<string, any>) => {
  const keys = Object.keys(output);
  const firstItem = output[keys[0]];

  if ("messages" in firstItem && Array.isArray(firstItem.messages)) {
    const lastMessage = firstItem.messages[firstItem.messages.length - 1];
    console.dir({
      type: lastMessage._getType(),
      content: lastMessage.content,
      tool_calls: lastMessage.tool_calls,
    }, { depth: null });
  }

  if ("sender" in firstItem) {
    console.log({
      sender: firstItem.sender,
    })
  }
}

for await (const output of await streamResults) {
  if (!output?.__end__) {
    prettifyOutput(output);
    console.log("----");
  }
}

const graphc = graph.getGraph();
const mermaid = await graphc.drawMermaid();
fs.writeFileSync("graph.mmd", mermaid);
console.log("已保存为 graph.mmd，支持 Mermaid 渲染");
