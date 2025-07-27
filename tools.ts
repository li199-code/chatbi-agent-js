import fs from "fs";
import { z } from "zod";
import axios from "axios";
import { tool } from "@langchain/core/tools";
import dotenv from "dotenv";
dotenv.config();

export const chatbiAskTool = tool(
  async (input: {
    query: string;
  }) => {
    try {
      // 构建请求参数
      const requestBody = {
        ask: input.query,
        exec_logicform: true
      };

      const domain = process.env.CHATBI_DOMAIN
      const token = process.env.CHATBI_TOKEN

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await axios.post(`${domain}/api/v1/ask`, requestBody, {
        headers,
      });

      // 返回格式化的数据
      return {
        success: true,
        data: response.data.result,
        query: input.query,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("ChatBI Ask Tool Error:", error);
      
      return {
        success: false,
        error: error.message,
        query: input.query,
        timestamp: new Date().toISOString(),
      };
    }
  },
  {
    name: "chatbi_ask",
    description: `通过请求ChatBI取数接口获取问题的答案。
    
    参数说明：
    - query: 查询描述，说明需要获取什么数据
    
    返回格式：
    {
      "success": boolean,
      "data": any, // success为true时，data为数组，里面的每个元素代表一个数据项
      "query": string,
      "timestamp": string
    }`,
    schema: z.object({
      query: z.string().describe("查询描述，说明需要获取什么数据")
    }),
  }
);

export const chatbiAnalyzeTool = tool(
  async (input: {
    query: string;
  }) => {
    try {
      // 两步骤，先获取lf，然后归因

      // 构建请求参数
      const requestBody = {
        ask: input.query,
      };

      const domain = process.env.CHATBI_DOMAIN
      const token = process.env.CHATBI_TOKEN

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await axios.post(`${domain}/api/v1/ask`, requestBody, {
        headers,
      });

      const lf = Array.isArray(response.data?.logicform)? response.data.logicform[0] : response.data.logicform;


      const analyzeRet = await axios.post(`${domain}/api/v1/analyzer/analyze2`, { logicform: lf }, {
        headers,
      })

      const { drilldown, total, impactFactorProperties } = analyzeRet.data;

      // drilldown做一些处理
      // 取前五个
      const top5dimensions = drilldown.slice(0, 5);
      const normalizedDrilldown = top5dimensions.map(item => {
        const { dimension, dimensionProperty, negative, positive, result } = item;
        
        return {
          dimension,
          negative: negative.slice(0, 20),
          positive: positive.slice(0, 20),
        };
      });


      return {
        success: true,
        data: {
          drilldown:normalizedDrilldown,
          total,
          impactFactorProperties
        },
        query: input.query,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error("ChatBI Analyze Tool Error:", error);

      
      return {
        success: false,
        error: error.message,
        query: input.query,
        timestamp: new Date().toISOString(),
      };
    }
  },
  {
    name: "chatbi_analyze",
    description: `通过请求ChatBI归因接口获取对问题结果造成影响的维度或指标及其影响程度数据。
    
    参数说明：
    - query: 查询描述，说明要询问的问题。
    
    返回格式：
    {
      "success": boolean,
      "data": any, // success为true时，data的drilldown表示影响的维度及其影响程度，total表示问题结果，impactFactorProperties表示影响的指标
      "query": string,
      "timestamp": string
    }`,
    schema: z.object({
      query: z.string().describe("查询描述，说明需要获取什么数据")
    }),
  }
);

export const saveFile = tool(
  async (input: {
    fileName: string;
    content: string;
  }) => {
    try {
      fs.writeFileSync(input.fileName, input.content);
      return "保存成功"
    } catch (error) {
      return "保存失败"
    }
  },
  {
    name: "save_report_file",
    description: `保存文件在当前文件夹下，参数为文件名，返回值为保存成功与否`,
    schema: z.object({
      fileName: z.string().describe("文件名"),
      content: z.string().describe("文件内容")
    }),
  }
)

