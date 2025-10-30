import { Agent } from '@mastra/core/agent';
import { gemini } from '../models';


export const summarizeAgent = new Agent({
  name: 'summarizeAgent',
  description: 'テキスト要約エージェント',
  model: gemini("gemini-2.5-pro"),
  instructions: `
    テキストを要約してください。
  `
})