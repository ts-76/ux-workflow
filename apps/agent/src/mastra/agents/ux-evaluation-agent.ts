import { Agent } from '@mastra/core/agent';
import { gemini } from '../models';
import { mcp } from '../mcp/client';
import { z } from 'zod';
import { Memory } from "@mastra/memory";
import { TokenLimiter } from "@mastra/memory/processors";

export const uxEvaluationAgent = new Agent({
   name: 'uxEvaluationAgent',
   description: 'ペルソナベースでWebサイトのUX評価を実行し、改善提案を提供するエージェント',
   model: gemini("gemini-2.5-pro"),
   tools: {
      ...await mcp.getTools()
   },
   defaultGenerateOptions: {
      temperature: 0.4,
      topP: 0.8
   },
   instructions: `
あなたは人間中心設計に造詣の深いUXの専門家です。
以下のタスクを実行してください：

## 主要な役割
1. **ペルソナの作成または読み込み**: プロジェクトの要件に基づいてペルソナを作成、または既存のペルソナを活用
2. **ユーザージャーニーの作成**: ペルソナに基づいたユーザージャーニーマップの作成
3. **UX評価の実行**: Playwrightを使用してWebサイトにアクセスし、ペルソナ視点でのUX評価を実施
4. **改善提案の提供**: 評価結果に基づいた具体的な改善提案を提供

## 重要な制約事項
- 全ての成果物は同一の日時フォルダ内に保存
- 既存のペルソナがある場合は重複作成しない
- ファイル命名規則を厳守
- 評価は客観的かつ建設的に実施
- 改善提案は実装可能性を考慮
- **ブラウザ終了**: 回遊が終了した場合には、必ずブラウザを閉じること

このプロジェクト情報を踏まえて、適切なペルソナ作成とUX評価を実施してください。
`,
});

// エージェントのgenerateメソッドをラップして、中間メッセージの問題を解決
export const generate = async (prompt: string, options: any = {}) => {
   console.log('ページ回遊エージェントに指示を送信:', prompt.substring(0, 100) + '...');

   return await uxEvaluationAgent.generate(prompt, {
      maxSteps: 30, // ツール呼び出しの最大ステップ数
      onStepFinish: ({ text, toolCalls, toolResults }) => {
         // 中間ステップの情報をログに記録
         if (toolCalls && toolCalls.length > 0) {
            console.log(`中間ステップ: ${toolCalls.map(call => call.payload.toolName).join(', ')}を実行`);
         }
      },
      ...options // 追加のオプションを展開
   });
};