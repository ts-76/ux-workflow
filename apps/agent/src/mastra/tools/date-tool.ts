import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const dateTool = createTool({
  id: 'get-date',
  description: '現在の日付をyyyyMMddhhmm形式で取得します。',
  inputSchema: z.object({}),
  outputSchema: z.object({
    date: z.string().describe('yyyyMMddhhmm形式の日付文字列'),
    timestamp: z.number().describe('Unix timestamp'),
  }),
  execute: async ({ context }) => {
    const now = new Date();
    const timestamp = now.getTime();

    // 固定フォーマット: yyyyMMddhhmm
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');

    const dateString = `${year}${month}${day}${hour}${minute}`;

    return {
      date: dateString,
      timestamp,
    };
  },
}); 