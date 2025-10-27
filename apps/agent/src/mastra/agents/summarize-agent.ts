import { Agent } from '@mastra/core';
import { bedrock } from '../models';

export const summarizeAgent = new Agent({
  name: 'summarizeAgent',
  description: 'テキスト要約エージェント',
  model: bedrock('us.anthropic.claude-3-7-sonnet-20250219-v1:0'),
  instructions: `
    テキストを要約してください。
  `
})