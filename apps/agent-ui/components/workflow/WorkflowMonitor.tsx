'use client';

/**
 * WorkflowMonitor - ワークフロー実行状況をポーリングで監視・表示するコンポーネント
 *
 * 主要機能:
 * - ポーリングベースのシンプルなワークフロー監視（Mastra推奨方式）
 * - ワークフローの進行状況、ステップ実行状態の表示
 * - 完了・エラー状態の適切な表示
 * - セッション管理との連携
 */

import { useState, useEffect, useRef } from 'react';
import { watchWorkflowRun } from '@/lib/workflow-service';
import { useWorkflowState } from '@/components/WorkflowStateProvider';
import {
    WorkflowState,
    StepStatus,
    WorkflowWatchEvent,
    WorkflowSummary,
    WorkflowCompletionNotice,
    WorkflowErrorDetails,
    StepProgressSection,
    shouldExcludeStep,
    getStatusLabel,
} from '@/components/workflow';

interface WorkflowMonitorProps {
    runId: string;
    targetUrl?: string;
}

export default function WorkflowMonitor({ runId, targetUrl }: WorkflowMonitorProps) {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [workflowState, setWorkflowState] = useState<WorkflowState | null>({
        status: 'in_progress',
        steps: {},
    });
    const [, setCurrentStep] = useState<StepStatus | null>({
        id: '初期化',
        status: 'in_progress'
    });
    const [isWatching, setIsWatching] = useState<boolean>(false);

    // マウント状態を追跡するためのref
    const isFirstMount = useRef(true);
    const hasStoppedMonitoring = useRef(false);

    // グローバルワークフロー状態
    const { monitorWorkflow, stopMonitoring } = useWorkflowState();

    useEffect(() => {
        if (!runId) return;

        // グローバル状態にこのワークフローを登録（一度だけ）
        if (targetUrl && isFirstMount.current) {
            console.log(`WorkflowMonitor: 初回マウント - ${runId} を監視登録`);
            isFirstMount.current = false;
            monitorWorkflow(runId, targetUrl);
        }

        // 即座にUI表示するための初期状態
        setIsWatching(false);
        setError(null);

        // 監視関数を保持するための変数
        let unwatchFn: (() => void) | null = null;

        console.log(`WorkflowMonitor: runId ${runId} の監視を開始します`);

        // ワークフローの監視設定
        async function setupWatch() {
            try {
                // ワークフローイベントを受け取るコールバック
                const handleWatchEvent = (event: any) => {
                    console.log('WorkflowMonitor: イベント受信', event);

                    // 接続状態のイベントの場合
                    if (event.type === 'connection_status') {
                        if (event.status === 'connected') {
                            console.log('WorkflowMonitor: ポーリング監視開始');
                            setIsWatching(true);
                            setError(null); // 接続成功時はエラーをクリア
                        } else if (event.status === 'error') {
                            console.warn('WorkflowMonitor: ポーリングエラー');
                            setError(event.error || 'ワークフロー監視でエラーが発生しました');
                        }
                        return;
                    }

                    // エラーイベントの場合
                    if (event.type === 'error') {
                        console.error('WorkflowMonitor: エラーイベント受信:', event.message);
                        setError(event.message);
                        return;
                    }

                    // 通常のワークフローイベントの場合
                    if (event.payload) {
                        setIsWatching(true);

                        try {
                            // 型安全のためにイベントを整形
                            const watchEvent: WorkflowWatchEvent = {
                                payload: {
                                    currentStep: event.payload?.currentStep ? {
                                        id: event.payload.currentStep.id || '不明なステップ',
                                        status: event.payload.currentStep.status || 'in_progress',
                                        output: event.payload.currentStep.output,
                                        payload: event.payload.currentStep.payload
                                    } : undefined,
                                    workflowState: {
                                        status: event.payload?.workflowState?.status || 'in_progress',
                                        steps: event.payload?.workflowState?.steps || {},
                                        result: event.payload?.workflowState?.result,
                                        error: event.payload?.workflowState?.error,
                                        allStepsSuccess: event.payload?.workflowState?.allStepsSuccess || false,
                                        stepsStatus: event.payload?.workflowState?.stepsStatus || []
                                    }
                                },
                                eventTimestamp: event.eventTimestamp || new Date(),
                                runId: event.runId || runId
                            };


                            // ステップ更新イベントのみ記録（ワークフロー状態更新は除外）
                            // また、inputステップは除外
                            // さらに、allStepsSuccessがtrueの場合はイベントを記録しない
                            if (watchEvent.payload.currentStep &&
                                !shouldExcludeStep(watchEvent.payload.currentStep.id) &&
                                !watchEvent.payload.workflowState.allStepsSuccess) {
                            }

                            // ワークフローの状態を更新
                            if (watchEvent.payload.workflowState) {
                                const newWorkflowState = watchEvent.payload.workflowState;

                                // 詳細デバッグログ
                                console.log('WorkflowMonitor: ワークフロー状態更新:', {
                                    status: newWorkflowState.status,
                                    stepCount: newWorkflowState.steps ? Object.keys(newWorkflowState.steps).length : 0,
                                    hasSteps: !!newWorkflowState.steps,
                                    steps: newWorkflowState.steps ? Object.keys(newWorkflowState.steps) : [],
                                    error: newWorkflowState.error,
                                    allStepsSuccess: newWorkflowState.allStepsSuccess, // ここでallStepsSuccessを確認
                                    hasStepsStatus: !!newWorkflowState.stepsStatus,
                                    stepsStatusLength: newWorkflowState.stepsStatus?.length || 0,
                                    stepsStatusContent: JSON.stringify(newWorkflowState.stepsStatus),
                                    timestamp: new Date().toISOString()
                                });

                                // newWorkflowStateが常に有効であることを確認
                                // workflow-service.tsで既にデフォルト値が提供されている

                                // steps フィールドが存在しない場合は初期化
                                if (!newWorkflowState.steps) {
                                    newWorkflowState.steps = {};
                                }

                                // 受信した状態を設定
                                setWorkflowState(newWorkflowState);

                                console.log(`WorkflowMonitor: 状態を更新しました:`, {
                                    status: newWorkflowState.status,
                                    timestamp: new Date().toISOString()
                                });

                                // ワークフローが完了または失敗した場合、またはすべてのステップが成功した場合の処理
                                if (newWorkflowState.status === 'success' || newWorkflowState.status === 'failed' || newWorkflowState.allStepsSuccess) {
                                    console.log(`WorkflowMonitor: ワークフロー ${runId} が終了しました (${newWorkflowState.status}), allStepsSuccess: ${newWorkflowState.allStepsSuccess}`);

                                    // セッションストレージからactiveRunIdを削除
                                    if (typeof window !== 'undefined') {
                                        sessionStorage.removeItem('workflow-active-run-id');
                                    }

                                    // 2秒遅延させてUIの更新を確認してからクリア（完了状態表示のため）
                                    // 既に停止処理が実行されていなければ実行
                                    if (!hasStoppedMonitoring.current) {
                                        hasStoppedMonitoring.current = true;
                                        setTimeout(() => {
                                            console.log(`WorkflowMonitor: 完了により監視を停止 - ${runId}`);
                                            stopMonitoring();
                                        }, 2000);
                                    }
                                }
                            }

                            // 現在のステップを更新（inputステップは除外）
                            if (watchEvent.payload.currentStep &&
                                typeof watchEvent.payload.currentStep === 'object' &&
                                watchEvent.payload.currentStep.id &&
                                !shouldExcludeStep(watchEvent.payload.currentStep.id)) {

                                const currentStepData = watchEvent.payload.currentStep;

                                console.log(`WorkflowMonitor: 現在のステップ更新:`, {
                                    id: currentStepData.id,
                                    status: currentStepData.status,
                                    timestamp: new Date().toISOString()
                                });

                                setCurrentStep({
                                    id: currentStepData.id,
                                    status: currentStepData.status,
                                    output: currentStepData.output,
                                    payload: currentStepData.payload
                                });
                            } else {
                                // 有効なステップデータがない場合はデフォルト値を使用
                                if (watchEvent.payload.workflowState &&
                                    watchEvent.payload.workflowState.status === 'running') {

                                    console.log(`WorkflowMonitor: デフォルトステップを設定:`, {
                                        timestamp: new Date().toISOString()
                                    });

                                    setCurrentStep({
                                        id: '処理中',
                                        status: 'in_progress',
                                        output: {},
                                        payload: {},
                                    });
                                }
                            }
                        } catch (err) {
                            console.error('WorkflowMonitor: イベント処理エラー', err);
                        }
                    }
                };

                // ワークフロー監視サービスを使用
                unwatchFn = watchWorkflowRun(runId, handleWatchEvent);
            } catch (err) {
                console.error('WorkflowMonitor: 監視エラー:', err);
                setError(err instanceof Error ? err.message : 'ワークフローの監視中にエラーが発生しました');
            }
        }

        // 監視設定を実行
        setupWatch();

        // クリーンアップ関数
        return () => {
            console.log(`WorkflowMonitor: ${runId} の監視をキャンセルします`);
            if (unwatchFn) {
                unwatchFn();
            }
        };
    }, [runId, monitorWorkflow, targetUrl]);

    // ローディング中の表示を改善 - より具体的な状態表示
    if (isLoading || (workflowState === null && !isWatching)) {
        return (
            <div className="my-4 rounded-lg border border-neutral-200 bg-white p-5 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
                <p className="font-medium">ワークフロー情報を取得中です。</p>
                <p className="mt-2 font-mono text-xs">実行ID: {runId}</p>
                <p className="mt-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">初回の状態取得には数秒かかることがあります。</p>
            </div>
        );
    }

    // エラーの表示
    if (error) {
        return (
            <div className="my-4 rounded-lg border border-red-400 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200">
                <p className="font-medium">エラーが発生しました。</p>
                <p className="mt-2 break-words text-xs">{error}</p>
                <p className="mt-2 text-xs">ワークフローID: {runId}</p>
            </div>
        );
    }

    const statusLabel = getStatusLabel(workflowState?.allStepsSuccess || false);

    return (
        <div className="my-4 rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
            <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">ワークフロー実行状況</h3>

            <WorkflowSummary
                runId={runId}
                statusLabel={statusLabel}
                workflowState={workflowState}
                isWatching={isWatching}
            />

            <WorkflowCompletionNotice workflowState={workflowState} />

            <WorkflowErrorDetails workflowState={workflowState} />

            <StepProgressSection stepsStatus={workflowState?.stepsStatus} />
        </div>
    );
}
