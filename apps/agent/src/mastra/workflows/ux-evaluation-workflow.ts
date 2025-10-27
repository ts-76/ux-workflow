import { createStep, createWorkflow } from '@mastra/core';
import { z } from 'zod';
import {
    uxEvaluationWorkflowSchema
} from './schemas/ux-evaluation.schemas';
import { setupStep } from './steps/setup-step';
import { siteNavigationStep } from './steps/site-navigation-step';
import { createAllPersonasStep } from './steps/create-all-personas-step';
import { personaJourneyEvalWorkflow } from './subflow/persona-journey-evaluation-flow';


// ワークフローの定義
// Mastraベストプラクティス: エラーハンドリング対応サブフローを使用
export const uxEvaluationWorkflow = createWorkflow({
    id: "ux-evaluation-workflow",
    description: "UX評価ワークフロー - ペルソナベースの包括的UX評価。セットアップ、サイト回遊、ペルソナ作成、ユーザージャーニーマップ作成、UX評価の一連のプロセスを自動化します。（エラーハンドリング対応）",
    inputSchema: uxEvaluationWorkflowSchema,
    outputSchema: z.array(z.object({
        journey: z.string(),
        evaluationResult: z.object({
            evaluationResult: z.string()
        })
    }))
})
    .then(createStep({
        id: "check-exevution",
        description: "実行中のワークフローの確認",
        inputSchema: uxEvaluationWorkflowSchema,
        outputSchema: uxEvaluationWorkflowSchema,
        execute: async ({ inputData, runId, bail }) => {
            const timestamp = new Date().toISOString();
            // 初回実行時にタイムスタンプをグローバルに保存
            if (!(global as any).executionInfo) {
                (global as any).executionInfo = {
                    runId,
                    timestamp
                };
            }

            // 前回実行から3minutes経っていない場合には早期終了（bail使用）
            if (timestamp !== (global as any).executionInfo.timestamp && (global as any).executionInfo.runId === runId) {
                console.log('前回実行から3minutes経っていません - bail()で正常終了');
                return bail({
                    message: '前回実行から3minutes経っていません - 実行をスキップしました',
                    skipped: true,
                    timestamp: timestamp,
                    ...inputData
                });
            }

            // 前回実行から3minutes経っていて、実行中のワークフローが異なる場合には実行情報を更新
            const currentTimestamp = new Date(timestamp).getTime();
            const previousTimestamp = new Date((global as any).executionInfo.timestamp).getTime();
            if (currentTimestamp - previousTimestamp > 3 * 60 * 1000 && (global as any).executionInfo.runId !== runId) {
                (global as any).executionInfo = {
                    runId,
                    timestamp
                };
            }

            return {
                ...inputData
            };
        }
    }))
    .then(setupStep)            // ステップ1: 評価の初期設定
    .then(siteNavigationStep)   // ステップ2: サイト回遊
    .then(createAllPersonasStep)// ステップ3: 一括でペルソナを作成
    .map(({ inputData, getStepResult, getInitData }) => {
        const initData = getInitData();
        const { siteNavigation } = getStepResult(siteNavigationStep);
        const subflowData = Promise.resolve(inputData.personas.map(persona => ({ persona, siteNavigation, initData })));
        return subflowData;
    })
    .foreach(personaJourneyEvalWorkflow, { concurrency: 2 }) // 各ペルソナごとにジャーニー作成とUX評価を実行
    .commit();