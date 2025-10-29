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
import { useWorkflowState } from './WorkflowStateProvider';

interface WorkflowMonitorProps {
    runId: string;
    targetUrl?: string;
}

interface StepStatus {
    id: string;
    status: string;
    output?: Record<string, any>;
    payload?: Record<string, any>;
}

interface StepStatusInfo {
    stepId: string;
    status: string;
    payload?: Record<string, any> | null;
}

interface WorkflowState {
    status: string;
    steps: Record<string, {
        status: string;
        output?: Record<string, any>;
        payload?: Record<string, any>;
    }>;
    result?: Record<string, any>;
    error?: string;
    allStepsSuccess?: boolean;
    stepsStatus?: StepStatusInfo[];
}

interface WorkflowWatchEvent {
    payload: {
        currentStep?: {
            id: string;
            status: string;
            output?: Record<string, any>;
            payload?: Record<string, any>;
        };
        workflowState: WorkflowState;
    };
    eventTimestamp: Date;
    runId: string;
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

    // inputステップを除外する関数
    const shouldExcludeStep = (stepId: string): boolean => {
        return stepId === 'input' || stepId.toLowerCase().includes('input');
    };

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

    // ステータスに応じた日本語表示を返す関数
    const getStatusLabel = (allStepsSuccess: boolean): string => {
        switch (allStepsSuccess) {
            case true: return '完了';
            case false: return '実行中';
            default: return '不明';
        }
    };

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

interface WorkflowSummaryProps {
    runId: string;
    statusLabel: string;
    workflowState: WorkflowState | null;
    isWatching: boolean;
}

function WorkflowSummary({ runId, statusLabel, workflowState, isWatching }: WorkflowSummaryProps) {
    return (
        <div className="mt-4">
            <div className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
                <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">実行ID</p>
                    <p className="font-mono text-sm text-neutral-700 dark:text-neutral-200">{runId}</p>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">ステータス</p>
                    <span className="rounded px-2 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        {statusLabel}
                    </span>
                </div>
            </div>

            {!isWatching && workflowState === null && (
                <div className="mt-3 rounded border border-yellow-400 bg-yellow-50 px-4 py-3 text-xs text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200">
                    Mastraサーバーからの応答がありません。サーバーの起動状態を確認してください。
                </div>
            )}

            {(workflowState as any)?.allStepsSuccess && !workflowState?.status && (
                <div className="mt-3 rounded border border-green-400 bg-green-50 px-4 py-3 text-xs text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200">
                    すべてのステップが正常に完了しました。
                </div>
            )}
        </div>
    );
}

interface WorkflowNoticeProps {
    workflowState: WorkflowState | null;
}

function WorkflowCompletionNotice({ workflowState }: WorkflowNoticeProps) {
    if (!workflowState || (workflowState.status !== 'success' && workflowState.status !== 'failed')) {
        return null;
    }

    return (
        <div className="mt-4 rounded border border-neutral-200 bg-white p-4 text-xs leading-relaxed text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
            <p className="font-medium">{workflowState.status === 'success' ? 'ワークフローが正常に完了しました' : 'ワークフローでエラーが発生しました'}</p>
            {workflowState.status === 'success' && (
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">評価結果が生成され、保存されました。</p>
            )}
        </div>
    );
}

function WorkflowErrorDetails({ workflowState }: WorkflowNoticeProps) {
    if (!(workflowState?.status === 'failed' && workflowState?.error)) {
        return null;
    }

    return (
        <div className="mb-6 mt-4 rounded border border-red-400 bg-red-50 p-4 text-xs text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200">
            <p className="font-medium">エラー詳細</p>
            <p className="mt-2 leading-relaxed">{workflowState.error}</p>
        </div>
    );
}

interface StepProgressSectionProps {
    stepsStatus?: StepStatusInfo[];
}

function StepProgressSection({ stepsStatus }: StepProgressSectionProps) {
    return (
        <div className="mt-6">
            <h4 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">ステップの進行状況</h4>

            <div className="relative">
                <div className="absolute left-[18px] top-6 bottom-6 w-px bg-neutral-300 dark:bg-neutral-700" />

                <div className="space-y-4">
                    {stepsStatus ? renderStepItems(stepsStatus) : <EmptyStepNotice />}
                </div>
            </div>
        </div>
    );
}

function renderStepItems(stepsStatus: StepStatusInfo[]) {
    const successSteps = stepsStatus.filter((s) => s.status === 'success');
    const currentStepIndex = successSteps.length < stepsStatus.length ? successSteps.length : -1;

    return stepsStatus.map((step, index) => {
        let stepStatus = step.status || 'unchecked';
        if (index === currentStepIndex) {
            stepStatus = 'in_progress';
        }

        return (
            <StepProgressItem
                key={step.stepId}
                step={step}
                index={index}
                stepStatus={stepStatus}
            />
        );
    });
}

interface StepProgressItemProps {
    step: StepStatusInfo;
    index: number;
    stepStatus: string;
}

function StepProgressItem({ step, index, stepStatus }: StepProgressItemProps) {
    const payloadId = `step-output-${step.stepId}`;

    return (
        <div className="relative">
            <div
                className={`ml-12 rounded-md border border-neutral-200 bg-white p-4 text-sm
                    ${stepStatus === 'success'
                        ? 'border-l-2 border-l-green-500 dark:border-l-green-400'
                        : stepStatus === 'in_progress'
                            ? 'border-l-2 border-l-neutral-500 dark:border-l-neutral-400'
                            : 'border-l border-l-neutral-300 dark:border-l-neutral-700'
                    }
                `}
            >
                <div className="absolute left-0 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 bg-white text-xs text-neutral-500 dark:border-neutral-600 dark:bg-neutral-800">
                    {index + 1}
                </div>

                <StepProgressHeader step={step} stepStatus={stepStatus} payloadId={payloadId} />

                {step.payload && (
                    <StepPayloadDetails payloadId={payloadId} payload={step.payload} />
                )}
            </div>
        </div>
    );
}

interface StepProgressHeaderProps {
    step: StepStatusInfo;
    stepStatus: string;
    payloadId: string;
}

function StepProgressHeader({ step, stepStatus, payloadId }: StepProgressHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h5
                    className={`font-medium text-base
                        ${stepStatus === 'unchecked'
                            ? 'text-gray-500 dark:text-gray-400'
                            : stepStatus === 'in_progress'
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-green-700 dark:text-green-400'
                        }`}
                >
                    {step.stepId}
                </h5>
                <span
                    className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium
                        ${stepStatus === 'success'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : stepStatus === 'in_progress'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                >
                    {stepStatus === 'success' ? '完了' : stepStatus === 'in_progress' ? '実行中' : '未実行'}
                </span>
            </div>

            {step.payload && (
                <button
                    onClick={() => togglePayloadVisibility(payloadId)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all
                        ${stepStatus === 'success'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                            : stepStatus === 'in_progress'
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                        }
                    `}
                >
                    詳細表示
                </button>
            )}
        </div>
    );
}

function StepPayloadDetails({ payloadId, payload }: { payloadId: string; payload: object }) {
    return (
        <div
            id={payloadId}
            style={{ display: 'none' }}
            className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700"
        >
            <div className="overflow-hidden rounded-md bg-gray-50 p-3 dark:bg-gray-900/50">
                <p className="mb-2 flex items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                    <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ステップ実行データ
                </p>
                <pre className="whitespace-pre-wrap rounded border border-gray-200 bg-white p-2 text-xs shadow-inner dark:border-gray-700 dark:bg-gray-800">
                    {JSON.stringify(payload, null, 2)}
                </pre>
            </div>
        </div>
    );
}

function EmptyStepNotice() {
    return (
        <div className="ml-12 rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
            <svg className="mx-auto mb-3 h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="font-medium text-gray-600 dark:text-gray-300">まだステップ情報はありません</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ワークフローが開始されると、ここに進行状況が表示されます</p>
        </div>
    );
}

function togglePayloadVisibility(elementId: string) {
    const element = typeof window !== 'undefined' ? document.getElementById(elementId) : null;
    if (!element) return;

    element.style.display = element.style.display === 'none' ? 'block' : 'none';
}
