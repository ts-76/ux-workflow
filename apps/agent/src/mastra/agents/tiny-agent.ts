import { Agent } from '@mastra/core/agent';
import { gemini } from '../models';
import { mcp } from '../mcp/client';
import { tools } from '../tools';

export const tinyAgent = new Agent({
  name: 'tinyAgent',
  description: 'ユーザーの要件の実行をサポートする最小命令のエージェント',
  model: gemini("gemini-2.5-pro"),
  instructions: `
    ユーザーの要件を適切に理解し、実行してください。
  `,
  tools: {
    ...await mcp.getTools(),
    ...tools
  }
})