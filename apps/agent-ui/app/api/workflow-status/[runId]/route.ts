import { NextRequest, NextResponse } from 'next/server';
import { mastraClient } from "@/lib/mastra-client";

/**
 * ワークフロー状態取得API
 * 
 * 指定されたrunIdのワークフロー実行状態を取得する
 * 特徴:
 * - Mastra Client JSのrunExecutionResultを使用
 * - 実行状態が取得できない場合はデフォルト状態を返す
 * - エラー時も適切なレスポンスを返す
 */

/**
 * ワークフローの実行結果を取得する関数
 * @throws Error ワークフロー取得に失敗した場合
 */
async function getWorkflowExecutionResult(runId: string) {
    // ワークフローインスタンスを取得
    const workflow = mastraClient.getWorkflow("uxEvaluationWorkflow");
    const details = await workflow.details();
    // @ts-ignore
    const steps = details.stepGraph.map((step) => step.step.id);

    if (!workflow) {
        console.warn(`⚠️ [${runId}] ワークフロー 'uxEvaluationWorkflow' が見つかりません`);
        throw new Error(`ワークフロー 'uxEvaluationWorkflow' が見つかりません`);
    }

    // 実行状態を取得（タイムアウト対策）
    const result = await workflow.runExecutionResult(runId);
    const runnningSteps = Object.keys(result.steps).filter((step) => step !== 'input');

    const stepsStatus: {
        stepId: string;
        status: "success" | "unchecked";
        payload: object | null;
    }[] = steps.map((step) => {
        if (runnningSteps.includes(step)) {
            return {
                stepId: step,
                status: "success",
                payload: result.steps[step].payload || null
            }
        }
        return {
            stepId: step,
            status: "unchecked",
            payload: null
        }
    })

    const allStepsSuccess = stepsStatus.every((step) => step.status === "success");

    const response = {
        stepsStatus,
        allStepsSuccess
    }

    return response;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ runId: string }> }
) {
    try {
        const { runId } = await params;

        if (!runId) {
            return NextResponse.json({
                success: false,
                message: 'runIdが指定されていません'
            }, { status: 400 });
        }

        try {
            // ワークフロー実行結果を取得
            const response = await getWorkflowExecutionResult(runId);

            return NextResponse.json(response);
        } catch (executionError) {
            return NextResponse.json({
                success: false,
                message: executionError instanceof Error ? executionError.message : 'ワークフロー状態の取得に失敗しました'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('❌ ワークフロー状態取得エラー:', error);
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : 'ワークフロー状態の取得に失敗しました'
        }, { status: 500 });
    }
}