import { StepResult, StepStatus, WorkflowStatus } from '../schemas/ux-evaluation.schemas';

/**
 * ステップの実行状態を追跡するヘルパー関数
 */
export class StepTracker {
    private stepResults: Map<string, StepResult> = new Map();
    private workflowStatus: WorkflowStatus;

    constructor(workflowId: string, runId: string) {
        this.workflowStatus = {
            workflowId,
            runId,
            status: 'running',
            completedSteps: []
        };
    }

    /**
     * ステップの開始を記録
     */
    startStep(stepId: string): void {
        const stepResult: StepResult = {
            stepId,
            status: 'running',
            timestamp: new Date().toISOString()
        };
        this.stepResults.set(stepId, stepResult);
        this.workflowStatus.currentStep = stepId;
        console.log(`🚀 ステップ「${stepId}」を開始しました`);
    }

    /**
     * ステップの成功を記録
     */
    completeStep(stepId: string, output?: any, duration?: number): void {
        const stepResult = this.stepResults.get(stepId);
        if (stepResult) {
            stepResult.status = 'success';
            stepResult.duration = duration;
            stepResult.output = output;
            this.workflowStatus.completedSteps.push(stepResult);
            console.log(`✅ ステップ「${stepId}」が成功しました`);
        }
    }

    /**
     * ステップの失敗を記録
     */
    failStep(stepId: string, error: Error, duration?: number): void {
        const stepResult = this.stepResults.get(stepId);
        if (stepResult) {
            stepResult.status = 'failed';
            stepResult.error = error.message;
            stepResult.duration = duration;
            this.workflowStatus.completedSteps.push(stepResult);
            this.workflowStatus.failedStep = stepId;
            this.workflowStatus.errorMessage = error.message;
            console.error(`❌ ステップ「${stepId}」が失敗しました: ${error.message}`);
        }
    }

    /**
     * ステップをスキップ
     */
    skipStep(stepId: string, reason: string): void {
        const stepResult: StepResult = {
            stepId,
            status: 'skipped',
            timestamp: new Date().toISOString(),
            error: reason
        };
        this.stepResults.set(stepId, stepResult);
        this.workflowStatus.completedSteps.push(stepResult);
        console.log(`⏭️ ステップ「${stepId}」をスキップしました: ${reason}`);
    }

    /**
     * ワークフローの完了を記録
     */
    completeWorkflow(): void {
        this.workflowStatus.status = 'success';
        this.workflowStatus.currentStep = undefined;
        console.log(`🎉 ワークフロー「${this.workflowStatus.workflowId}」が完了しました`);
    }

    /**
     * ワークフローの失敗を記録
     */
    failWorkflow(error: string): void {
        this.workflowStatus.status = 'failed';
        this.workflowStatus.errorMessage = error;
        console.error(`💥 ワークフロー「${this.workflowStatus.workflowId}」が失敗しました: ${error}`);
    }

    /**
     * ワークフローの強制終了を記録
     */
    terminateWorkflow(reason: string): void {
        this.workflowStatus.status = 'terminated';
        this.workflowStatus.errorMessage = reason;
        console.log(`🛑 ワークフロー「${this.workflowStatus.workflowId}」を終了しました: ${reason}`);
    }

    /**
     * 現在のワークフロー状態を取得
     */
    getWorkflowStatus(): WorkflowStatus {
        return { ...this.workflowStatus };
    }

    /**
     * 特定のステップの結果を取得
     */
    getStepResult(stepId: string): StepResult | undefined {
        return this.stepResults.get(stepId);
    }

    /**
     * 失敗したステップがあるかチェック
     */
    hasFailedStep(): boolean {
        // ワークフロー自体が失敗状態か、失敗したステップがある場合にtrueを返す
        return this.workflowStatus.status === 'failed' || this.workflowStatus.failedStep !== undefined;
    }

    /**
     * 継続すべきかどうかを判定
     */
    shouldContinue(): boolean {
        // ワークフローが実行中で、かつ失敗したステップがない場合のみtrueを返す
        return this.workflowStatus.status === 'running' && !this.hasFailedStep();
    }

    /**
     * 実行の詳細なサマリーを取得
     */
    getSummary(): string {
        const total = this.workflowStatus.completedSteps.length;
        const successful = this.workflowStatus.completedSteps.filter(s => s.status === 'success').length;
        const failed = this.workflowStatus.completedSteps.filter(s => s.status === 'failed').length;
        const skipped = this.workflowStatus.completedSteps.filter(s => s.status === 'skipped').length;

        return `ワークフロー実行結果: 総ステップ数: ${total}, 成功: ${successful}, 失敗: ${failed}, スキップ: ${skipped}`;
    }
}

/**
 * ステップ実行を監視するラッパー関数
 */
export async function executeStepWithMonitoring<T>(
    stepId: string,
    tracker: StepTracker,
    stepFunction: () => Promise<T>
): Promise<T> {
    const startTime = Date.now();

    try {
        tracker.startStep(stepId);
        const result = await stepFunction();
        const duration = Date.now() - startTime;
        tracker.completeStep(stepId, result, duration);
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        tracker.failStep(stepId, error as Error, duration);
        throw error;
    }
}

/**
 * 早期終了を実装するためのエラークラス
 */
export class WorkflowTerminationError extends Error {
    constructor(message: string, public stepId: string) {
        super(message);
        this.name = 'WorkflowTerminationError';
    }
}

/**
 * ステップの実行前にチェックを行うガード関数
 */
export function checkStepPreConditions(tracker: StepTracker, stepId: string): void {
    if (!tracker.shouldContinue()) {
        const reason = `前のステップでエラーが発生したため、ステップ「${stepId}」の実行を中断します`;
        tracker.skipStep(stepId, reason);
        throw new WorkflowTerminationError(reason, stepId);
    }
}

