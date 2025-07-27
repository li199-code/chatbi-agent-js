// test-chatbiAsk.ts
import { chatbiAskTool, chatbiAnalyzeTool } from './tools.ts';
import * as dotenv from 'dotenv';
dotenv.config(); // 加载 .env 环境变量

async function testTool(tool, params) {
  const result = await tool.invoke(params);

  console.log(JSON.stringify(result, null, 2));
}

testTool(chatbiAnalyzeTool, {
    query: "今年一季度女装销售额同比",
}).catch(console.error);