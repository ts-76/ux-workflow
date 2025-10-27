import { MastraClient } from "@mastra/client-js";

// Mastraクライアントのシングルトンインスタンスを作成
// APIサーバーのURLを設定（ドキュメント通りに末尾スラッシュ付き）
export const mastraClient = new MastraClient({
    baseUrl: process.env.MASTRA_API_URL || "http://localhost:4111/",
});

// エージェントへのアクセスヘルパー関数
export function getAgent(agentId: string) {
    return mastraClient.getAgent(agentId);
}

// ワークフローへのアクセスヘルパー関数
export function getWorkflow(workflowId: string) {
    return mastraClient.getWorkflow(workflowId);
} 