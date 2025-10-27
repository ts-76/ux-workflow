import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { mastraClient } from "@/lib/mastra-client";

// テンプレートタイプのマッピング
const TEMPLATE_FILES = {
    persona: 'public/templates/persona-creation-template.md',
    journey: 'public/templates/user-journey-template.md',
    evaluation: 'public/templates/ux-evaluation-template.md',
    projectInfo: 'public/templates/project-info.md'
};

// テンプレートを取得する
async function getTemplate(templateType: string): Promise<string> {
    if (!TEMPLATE_FILES[templateType as keyof typeof TEMPLATE_FILES]) {
        throw new Error(`不明なテンプレートタイプ: ${templateType}`);
    }

    try {
        const filePath = path.resolve(process.cwd(), TEMPLATE_FILES[templateType as keyof typeof TEMPLATE_FILES]);
        const content = await fs.readFile(filePath, 'utf-8');
        return content;
    } catch (error) {
        console.error(`テンプレート読み込みエラー (${templateType}):`, error);
        throw new Error(`テンプレートの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 UX評価ワークフローを開始します...');

        // リクエストボディの解析
        const body = await request.json();
        const { targetUrl, personaCount, useExistingPersonas, evaluationFocus, projectRoot } = body;

        console.log('📋 リクエスト詳細:', {
            targetUrl,
            personaCount,
            timestamp: new Date().toISOString()
        });

        // テンプレート内容を取得
        let templates = {};
        if (!body.templates) {
            try {
                templates = {
                    persona: await getTemplate('persona'),
                    journey: await getTemplate('journey'),
                    evaluation: await getTemplate('evaluation'),
                    projectInfo: await getTemplate('projectInfo')
                };
            } catch (error) {
                console.warn('テンプレート取得中にエラーが発生しました:', error);
                // エラーが発生してもワークフローは続行
            }
        } else {
            templates = body.templates;
        }

        console.log('⚙️ ワークフローを取得中...');
        const workflow = mastraClient.getWorkflow("uxEvaluationWorkflow");
        console.log('✅ ワークフロー取得成功');

        // ワークフロー実行インスタンスを作成（runIdは自動生成される）
        console.log('🔧 ワークフロー実行インスタンスを作成中...');
        const run = await workflow.createRun();
        console.log(`✅ ワークフロー実行インスタンス作成完了 - runId: ${run.runId}`);

        // Mastra Client JSのwatch方式でワークフロー監視を設定
        console.log(`👀 [${run.runId}] ワークフロー監視を設定中...`);
        workflow.watch({ runId: run.runId }, (event: any) => {
            console.log(`📊 [${run.runId}] ワークフロー更新:`, {
                eventTimestamp: event.eventTimestamp,
                runId: run.runId,
                stepId: event.payload?.currentStep?.id,
                status: event.payload?.currentStep?.status,
                workflowStatus: event.payload?.workflowState?.status,
                timestamp: new Date().toISOString()
            });
        });
        console.log(`✓ [${run.runId}] ワークフロー監視設定完了`);

        // ワークフローを非同期で開始（Promise ベースで簡潔に）
        console.log(`▶️ [${run.runId}] ワークフロー実行開始...`);

        // Mastra Client JSのstart方式で実行（結果は待たない）
        workflow.start({
            runId: run.runId,
            inputData: {
                targetUrl,
                projectRoot: projectRoot || '/tmp',
                useExistingPersonas: useExistingPersonas || false,
                personaCount: personaCount || 2,
                evaluationFocus: evaluationFocus || [],
                templates
            }
        }).then((result: any) => {
            console.log(`✅ [${run.runId}] ワークフロー実行完了:`, result.status);
        }).catch((error: any) => {
            console.error(`❌ [${run.runId}] ワークフロー実行エラー:`, error);
        });

        console.log(`✓ [${run.runId}] ワークフロー実行開始完了`);

        return NextResponse.json({
            success: true,
            message: 'ワークフローを開始しました',
            runId: run.runId, // 自動生成されたrunIdを返す
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ UX評価ワークフローでエラーが発生しました:', error);
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : '評価の実行中に問題が発生しました'
        }, { status: 500 });
    }
} 