import { Agent } from '@mastra/core';
import { bedrock } from '../models';
import { mcp } from '../mcp/client';
import { tools } from '../tools';

export const tinyAgent = new Agent({
  name: 'tinyAgent',
  description: 'ユーザーの要件の実行をサポートする最小命令のエージェント',
  model: bedrock('us.anthropic.claude-sonnet-4-20250514-v1:0'),
  instructions: `
    ユーザーの要件を適切に理解し、実行してください。
  `,
  tools: {
    ...await mcp.getTools(),
    ...tools
  }
})