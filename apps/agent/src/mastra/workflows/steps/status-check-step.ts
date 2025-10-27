import { createStep } from '@mastra/core';
import { z } from 'zod';
import { stepExecutionContextSchema, StepExecutionContext } from '../schemas/ux-evaluation.schemas';
import { WorkflowTerminationError } from '../utils/error-handler';

// ステータスチェック後の出力スキーマ
const statusCheckOutputSchema = z.object({
    canContinue: z.boolean().describe('次のステップに進めるかどうか'),
    message: z.string().describe('ステータスメッセージ'),
    previousStepData: z.any().optional().describe('前のステップのデータ（成功時）')
});

/**
 * ステップ実行後の状態をチェックし、エラー時には早期終了を実行するステップ
 * 
 * Mastraのベストプラクティス：
 * - bail()を使用して正常な早期終了を実装
 * - Error()を使用してエラー時の終了を実装
 * - ステップ間でのデータ受け渡しにはruntimeContextを使用
 */
export const createStatusCheckStep = (stepName: string) => createStep({
    id: `status-check-${stepName}`,
    description: `${stepName}ステップの実行状態をチェック`,
    inputSchema: z.any(), // 前のステップの出力をそのまま受け取る
    outputSchema: statusCheckOutputSchema,
    execute: async ({ inputData, runtimeContext, bail }) => {
        console.log(`🔍 ${stepName}ステップの状態をチェックしています...`);

        try {
            // RuntimeContextからステップトラッカーを取得
            const tracker = runtimeContext?.get('stepTracker') as any;

            if (!tracker) {
                const errorMessage = 'ステップトラッカーがruntimeContextに見つかりませんでした';
                console.error(`❌ ${errorMessage}`);
                throw new Error(errorMessage);
            }

            // ワークフローの現在の状態を取得
            const workflowStatus = tracker.getWorkflowStatus();

            // 前のステップの結果を確認
            const previousStepResult = tracker.getStepResult(stepName);

            if (!previousStepResult) {
                const errorMessage = `前のステップ「${stepName}」の結果が見つかりませんでした`;
                console.error(`❌ ${errorMessage}`);
                throw new Error(errorMessage);
            }

            // ステップが失敗した場合の処理
            if (previousStepResult.status === 'failed') {
                const errorMessage = `ステップ「${stepName}」が失敗しました: ${previousStepResult.error}`;
                console.error(`❌ ${errorMessage}`);

                // エラーサマリーを表示
                console.log(tracker.getSummary());

                // Mastraのベストプラクティス: Error()を使用してワークフローを停止
                throw new WorkflowTerminationError(errorMessage, stepName);
            }

            // ステップがスキップされた場合の処理
            if (previousStepResult.status === 'skipped') {
                const message = `ステップ「${stepName}」がスキップされました。次のステップに進みます。`;
                console.log(`⏭️ ${message}`);

                return {
                    canContinue: true,
                    message,
                    previousStepData: null
                };
            }

            // ステップが成功した場合
            if (previousStepResult.status === 'success') {
                const message = `ステップ「${stepName}」が正常に完了しました。次のステップに進みます。`;
                console.log(`✅ ${message}`);

                return {
                    canContinue: true,
                    message,
                    previousStepData: inputData // 前のステップからのデータを渡す
                };
            }

            // その他の予期しない状態
            const errorMessage = `ステップ「${stepName}」が予期しない状態です: ${previousStepResult.status}`;
            console.error(`⚠️ ${errorMessage}`);
            throw new Error(errorMessage);

        } catch (error) {
            // エラーが発生した場合は詳細なログを出力
            const errorMessage = error instanceof WorkflowTerminationError
                ? error.message
                : `ステータスチェック中にエラーが発生しました: ${(error as Error).message}`;

            console.error(`❌ ${errorMessage}`);

            // Mastraのベストプラクティス: Error()を使用して早期終了
            throw error;
        }
    }
});

/**
 * 最終的なワークフロー完了チェックステップ
 */
export const createFinalStatusCheckStep = () => createStep({
    id: 'final-status-check',
    description: 'ワークフローの最終状態をチェックして結果をまとめる',
    inputSchema: z.any(),
    outputSchema: z.object({
        workflowCompleted: z.boolean(),
        summary: z.string(),
        results: z.any()
    }),
    execute: async ({ inputData, runtimeContext }) => {
        console.log('🏁 ワークフローの最終状態をチェックしています...');

        try {
            const tracker = runtimeContext?.get('stepTracker') as any;

            if (!tracker) {
                throw new Error('ステップトラッカーがruntimeContextに見つかりませんでした');
            }

            // ワークフローを完了状態にマーク
            tracker.completeWorkflow();

            // 実行サマリーを取得
            const summary = tracker.getSummary();
            const workflowStatus = tracker.getWorkflowStatus();

            console.log('🎉 ワークフロー完了');
            console.log(summary);

            return {
                workflowCompleted: true,
                summary,
                results: inputData
            };

        } catch (error) {
            const errorMessage = `最終ステータスチェック中にエラーが発生しました: ${(error as Error).message}`;
            console.error(`❌ ${errorMessage}`);
            throw new Error(errorMessage);
        }
    }
}); 