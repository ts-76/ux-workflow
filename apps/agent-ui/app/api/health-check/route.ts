import { NextRequest, NextResponse } from 'next/server';
import { mastraClient } from "@/lib/mastra-client";

// Mastraサーバーのヘルスチェック
export async function GET(request: NextRequest) {
    try {
        // MastraクライアントSDKを使用してワークフロー一覧を取得
        const workflows = await mastraClient.getWorkflows();

        // uxEvaluationWorkflowが利用可能かどうか確認
        if (workflows && workflows.uxEvaluationWorkflow) {
            return NextResponse.json({
                status: 'online',
                message: 'Mastraサーバーは正常に動作しています',
                workflows: Object.keys(workflows),
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('uxEvaluationWorkflowが見つかりません');
        }
    } catch (error) {
        console.error('Mastraサーバー接続エラー:', error);

        return NextResponse.json({
            status: 'offline',
            message: 'Mastraサーバーに接続できません',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        }, { status: 503 }); // Service Unavailable
    }
} 