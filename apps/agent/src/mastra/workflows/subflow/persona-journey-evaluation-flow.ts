import { createStep, createWorkflow } from '@mastra/core';
import { z } from 'zod';
import {
    subflowInputSchema,
    personaJourneyEvalWorkflowOutputSchema,
    journeySchema,
    evaluationResultSchema
} from '../schemas/ux-evaluation.schemas';
import { createJourneysStep } from '../steps/create-journeys-step';
import { evaluateUxStep } from '../steps/evaluate-ux-step';
import { StepTracker, WorkflowTerminationError } from '../utils/error-handler';

// エラーハンドリング対応のジャーニー作成ステップ
const errorHandledCreateJourneysStep = createStep({
    id: "error-handled-create-journey",
    description: "エラーハンドリング対応のユーザージャーニー作成",
    inputSchema: subflowInputSchema,
    outputSchema: journeySchema,
    execute: async ({ inputData, runtimeContext, runId, getInitData, bail }) => {
        const tracker = new StepTracker("persona-journey-eval-workflow", runId || 'unknown');
        runtimeContext?.set('stepTracker', tracker);

        console.log('🚀 ジャーニー作成ステップを監視実行します...');

        try {
            tracker.startStep('create-journey');

            // 元のcreateJourneysStepを実行
            const result = await createJourneysStep.execute({
                inputData,
                runtimeContext,
                runId,
                getInitData
            } as any);

            tracker.completeStep('create-journey', result);
            console.log('✅ ジャーニー作成が完了しました');

            return result;
        } catch (error) {
            const err = error as Error;
            tracker.failStep('create-journey', err);

            console.error(`❌ ジャーニー作成でエラーが発生しました: ${err.message}`);

            // Mastraのベストプラクティス: bail()を使用してワークフローを正常終了
            return bail({
                journey: '',
                error: `ジャーニー作成が失敗しました: ${err.message}`
            });
        }
    }
});

// エラーハンドリング対応のUX評価ステップ
const errorHandledEvaluateUxStep = createStep({
    id: "error-handled-evaluate-ux",
    description: "エラーハンドリング対応のUX評価",
    inputSchema: journeySchema,
    outputSchema: evaluationResultSchema,
    execute: async ({ inputData, runtimeContext, getInitData, bail }) => {
        const tracker = runtimeContext?.get('stepTracker') as any;

        // 前ステップの状態確認
        if (tracker) {
            const failedStep = tracker.getWorkflowStatus().failedStep;
            if (failedStep) {
                const errorMessage = `前ステップ「${failedStep}」が失敗したため、UX評価をスキップします`;
                console.log(`⏭️ ${errorMessage}`);
                tracker.skipStep('evaluate-ux', errorMessage);

                // Mastraのベストプラクティス: bail()を使用してワークフローを正常終了
                return bail({
                    result: {},
                    error: errorMessage
                });
            }
        }

        console.log('🔍 UX評価ステップを監視実行します...');

        try {
            tracker?.startStep('evaluate-ux');

            // 元のevaluateUxStepを実行
            const result = await evaluateUxStep.execute({
                inputData,
                runtimeContext,
                getInitData
            } as any);

            tracker?.completeStep('evaluate-ux', result);
            console.log('✅ UX評価が完了しました');

            return result;
        } catch (error) {
            const err = error as Error;
            tracker?.failStep('evaluate-ux', err);

            console.error(`❌ UX評価でエラーが発生しました: ${err.message}`);

            // Mastraのベストプラクティス: bail()を使用してワークフローを正常終了
            return bail({
                result: {},
                error: `UX評価が失敗しました: ${err.message}`
            });
        }
    }
});

// 最終結果をコミットするステップ（エラーハンドリング対応）
const errorHandledCommitStep = createStep({
    id: "error-handled-commit-journey-evaluation",
    description: "エラーハンドリング対応のユーザージャーニー作成とUX評価の結果をコミット",
    inputSchema: evaluationResultSchema,
    outputSchema: personaJourneyEvalWorkflowOutputSchema,
    execute: async ({ inputData, runtimeContext, bail }) => {
        const tracker = runtimeContext?.get('stepTracker') as any;

        // 前ステップの状態確認
        if (tracker) {
            const failedStep = tracker.getWorkflowStatus().failedStep;
            if (failedStep) {
                const errorMessage = `前ステップ「${failedStep}」が失敗したため、結果コミットをスキップします`;
                console.log(`⏭️ ${errorMessage}`);
                tracker.skipStep('commit-journey-evaluation', errorMessage);

                // Mastraのベストプラクティス: bail()を使用してワークフローを正常終了
                return bail({
                    journey: '',
                    evaluationResult: {},
                    error: errorMessage
                });
            }
        }

        console.log('💾 結果コミットステップを監視実行します...');

        try {
            tracker?.startStep('commit-journey-evaluation');

            // ジャーニーの結果を取得
            const journeyResult = tracker?.getStepResult('create-journey');
            const journey = journeyResult?.output?.journey || '';

            const result = {
                journey,
                evaluationResult: inputData
            };

            tracker?.completeStep('commit-journey-evaluation', result);
            tracker?.completeWorkflow();

            console.log('🎉 ワークフロー完了');
            console.log(tracker?.getSummary());

            return result;
        } catch (error) {
            const err = error as Error;
            tracker?.failStep('commit-journey-evaluation', err);
            tracker?.failWorkflow(err.message);

            console.error(`❌ 結果コミットでエラーが発生しました: ${err.message}`);

            // Mastraのベストプラクティス: bail()を使用してワークフローを正常終了
            return bail({
                journey: '',
                evaluationResult: {},
                error: `結果コミットが失敗しました: ${err.message}`
            });
        }
    },
});

// 1人のペルソナに対するジャーニー作成とUX評価を行うサブフロー
// Mastraベストプラクティス: ステップ間でのエラーハンドリングとステータスチェック
export const personaJourneyEvalWorkflow = createWorkflow({
    id: "persona-journey-eval-workflow",
    description: "1人のペルソナに対するユーザージャーニー作成とUX評価を行うサブフロー（エラーハンドリング対応）",
    inputSchema: subflowInputSchema,
    outputSchema: personaJourneyEvalWorkflowOutputSchema,
    retryConfig: {
        attempts: 0
    }
})
    .then(errorHandledCreateJourneysStep)     // ステップ1: エラーハンドリング付きユーザージャーニーの作成
    .then(errorHandledEvaluateUxStep)        // ステップ2: エラーハンドリング付きUX評価
    .then(errorHandledCommitStep)
    .commit();