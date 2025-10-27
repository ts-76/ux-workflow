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
    status: "success" | "unchecked" | "in_progress";
    payload: object | null;
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
        status: "in_progress",
        steps: {},
    });
    const [currentStep, setCurrentStep] = useState<StepStatus | null>({
        id: "初期化",
        status: "in_progress"
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
                    console.log("WorkflowMonitor: イベント受信", event);

                    // 接続状態のイベントの場合
                    if (event.type === 'connection_status') {
                        if (event.status === 'connected') {
                            console.log("WorkflowMonitor: ポーリング監視開始");
                            setIsWatching(true);
                            setError(null); // 接続成功時はエラーをクリア
                        } else if (event.status === 'error') {
                            console.warn("WorkflowMonitor: ポーリングエラー");
                            setError(event.error || 'ワークフロー監視でエラーが発生しました');
                        }
                        return;
                    }

                    // エラーイベントの場合
                    if (event.type === 'error') {
                        console.error("WorkflowMonitor: エラーイベント受信:", event.message);
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
                                        id: event.payload.currentStep.id || "不明なステップ",
                                        status: event.payload.currentStep.status || "in_progress",
                                        output: event.payload.currentStep.output,
                                        payload: event.payload.currentStep.payload
                                    } : undefined,
                                    workflowState: {
                                        status: event.payload?.workflowState?.status || "in_progress",
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
                                console.log("WorkflowMonitor: ワークフロー状態更新:", {
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
                                        id: "処理中",
                                        status: "in_progress",
                                        output: {},
                                        payload: {}
                                    });
                                }
                            }
                        } catch (err) {
                            console.error("WorkflowMonitor: イベント処理エラー", err);
                        }
                    }
                };

                // ワークフロー監視サービスを使用
                unwatchFn = watchWorkflowRun(runId, handleWatchEvent);
            } catch (err) {
                console.error("WorkflowMonitor: 監視エラー:", err);
                setError(err instanceof Error ? err.message : "ワークフローの監視中にエラーが発生しました");
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

    // ステータスに応じた色を返す関数
    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'success': return 'text-green-500';
            case 'failed': return 'text-red-500';
            case 'suspended': return 'text-yellow-500';
            case 'skipped': return 'text-blue-600';
            case 'in_progress': return 'text-blue-500';
            case 'running': return 'text-blue-500';  // 追加: running状態
            case 'pending': return 'text-gray-400';
            case 'waiting': return 'text-gray-400';
            default: return 'text-gray-500';
        }
    };

    // ステータスに応じた背景色を返す関数
    const getStatusBgColor = (status: string): string => {
        switch (status) {
            case 'success': return 'bg-green-500';
            case 'failed': return 'bg-red-500';
            case 'suspended': return 'bg-yellow-500';
            case 'skipped': return 'bg-blue-400';
            case 'in_progress': return 'bg-blue-500';
            case 'running': return 'bg-blue-500';  // 追加: running状態
            case 'pending': return 'bg-gray-300';
            case 'waiting': return 'bg-gray-300';
            default: return 'bg-gray-400';
        }
    };

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
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 my-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100 border-b pb-3 border-gray-200 dark:border-gray-700">
                    ワークフロー実行状況
                </h3>

                <div className="flex items-center justify-center p-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-3"></div>
                    <div>
                        <p className="font-medium">ワークフロー情報を取得中...</p>
                        <p className="text-sm text-gray-500 mt-1">実行ID: <span className="font-mono">{runId}</span></p>
                    </div>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 mt-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p>🔄 ポーリング監視でステータスを確認しています</p>
                    <p className="text-xs mt-1">初回の状態取得には数秒かかることがあります</p>
                </div>
            </div>
        );
    }

    // エラーの表示
    if (error) {
        return (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
                <p className="font-bold">エラー</p>
                <p>{error}</p>
                <div className="mt-3 bg-white p-3 rounded border border-red-200">
                    <p className="text-sm font-medium">ワークフローID: {runId}</p>
                    <p className="text-xs mt-1">サーバーに接続できない可能性があります。</p>
                </div>
            </div>
        );
    }

    // 通常の表示
    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 my-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100 border-b pb-3 border-gray-200 dark:border-gray-700 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ワークフロー実行状況
            </h3>

            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            実行ID: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400">{runId}</span>
                        </p>
                        <div className="mt-2 flex items-center">
                            <p className="font-medium text-gray-700 dark:text-gray-300">ステータス:</p>
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-sm font-medium ${workflowState?.allStepsSuccess
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}>
                                {getStatusLabel(workflowState?.allStepsSuccess || false)}
                            </span>
                        </div>
                    </div>

                    {workflowState?.allStepsSuccess && (
                        <div className="hidden sm:block">
                            <svg className="w-12 h-12 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    )}
                </div>

                {!isWatching && workflowState === null && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-start">
                            <svg className="w-5 h-5 mr-3 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                                <p className="font-medium text-yellow-800 dark:text-yellow-300">Mastraサーバーからの応答がありません</p>
                                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">サーバーが起動していることを確認してください。ポーリング監視でステータスを確認します。</p>
                            </div>
                        </div>
                    </div>
                )}

                {workflowState && (workflowState.status === 'success' || workflowState.status === 'failed') && (
                    <div className={`mt-4 p-4 rounded-lg ${workflowState.status === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900'}`}>
                        <div className="flex items-center">
                            {workflowState.status === 'success' ? (
                                <svg className="w-6 h-6 mr-3 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6 mr-3 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            <p className={`font-medium ${workflowState.status === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                                {workflowState.status === 'success' ? 'ワークフローが正常に完了しました' : 'ワークフローでエラーが発生しました'}
                            </p>
                        </div>
                        {workflowState.status === 'success' && (
                            <p className="text-sm text-green-700 dark:text-green-400 mt-2 ml-9">評価結果が生成され、保存されました。</p>
                        )}
                    </div>
                )}

                {/* すべてのステップが完了している場合の表示 */}
                {(workflowState as any)?.allStepsSuccess && !workflowState?.status && (
                    <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900">
                        <div className="flex items-center">
                            <svg className="w-6 h-6 mr-3 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="font-medium text-green-800 dark:text-green-300">
                                すべてのステップが正常に完了しました
                            </p>
                        </div>
                    </div>
                )}
            </div>
            {/* ステップリストは実行詳細セクションに統合されたため削除 */}

            {/* エラーの表示 */}
            {workflowState?.status === 'failed' && workflowState?.error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <h4 className="font-medium mb-3 text-red-800 dark:text-red-300 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        エラー詳細
                    </h4>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-inner border border-red-100 dark:border-red-900">
                        <p className="text-sm text-red-700 dark:text-red-300">{workflowState.error}</p>
                    </div>
                </div>
            )}

            <div className="mt-6">
                <h4 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    ワークフロー実行状況
                </h4>

                <div className="relative">
                    {/* 垂直のプログレスライン */}
                    <div className="absolute left-[18px] top-6 bottom-6 w-[2px] bg-gray-200 dark:bg-gray-700"></div>

                    <div className="space-y-4">
                        {(() => {
                            if (workflowState?.stepsStatus) {
                                // 実行中のステップを特定
                                const successSteps = workflowState.stepsStatus.filter(s => s.status === 'success');
                                const currentStepIndex = successSteps.length < workflowState.stepsStatus.length ? successSteps.length : -1;

                                return workflowState?.stepsStatus.map((step, index) => {
                                    // successの次のステップは実行中とみなす
                                    let stepStatus = step.status || 'unchecked';
                                    if (index === currentStepIndex) {
                                        stepStatus = 'in_progress';
                                    }

                                    return (
                                        <div key={step.stepId} className="relative">
                                            <div className={`
                                                ml-12 p-4 rounded-lg shadow-sm transition-all duration-200
                                                ${stepStatus === 'success'
                                                    ? 'bg-green-50 border-l-4 border-l-green-500 dark:bg-green-900/20 dark:border-l-green-600'
                                                    : stepStatus === 'in_progress'
                                                        ? 'bg-blue-50 border-l-4 border-l-blue-500 dark:bg-blue-900/20 dark:border-l-blue-600'
                                                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                                                }
                                            `}>
                                                {/* アイコン (絶対配置で垂直線の上に表示) */}
                                                <div className={`
                                                    absolute left-0 top-4 w-9 h-9 rounded-full flex items-center justify-center border-2
                                                    ${stepStatus === 'success'
                                                        ? 'bg-green-100 border-green-500 text-green-600 dark:bg-green-900/30 dark:border-green-600'
                                                        : stepStatus === 'in_progress'
                                                            ? 'bg-blue-100 border-blue-500 text-blue-600 dark:bg-blue-900/30 dark:border-blue-600'
                                                            : 'bg-white border-gray-300 text-gray-400 dark:bg-gray-800 dark:border-gray-600'
                                                    }
                                                `}>
                                                    {stepStatus === 'success' ? (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : stepStatus === 'in_progress' ? (
                                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                                                    )}
                                                </div>

                                                {/* コンテンツ */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h5 className={`font-medium text-base
                                                            ${stepStatus === 'unchecked' ? 'text-gray-500 dark:text-gray-400' :
                                                                stepStatus === 'in_progress' ? 'text-blue-700 dark:text-blue-400' : 'text-green-700 dark:text-green-400'
                                                            }`}>
                                                            {step.stepId}
                                                        </h5>
                                                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-medium
                                                            ${stepStatus === 'success'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                                : stepStatus === 'in_progress'
                                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse'
                                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                            }`}>
                                                            {stepStatus === 'success' ? '完了' :
                                                                stepStatus === 'in_progress' ? '実行中' : '未実行'}
                                                        </span>
                                                    </div>

                                                    {(step.payload) && (
                                                        <button
                                                            onClick={() => {
                                                                const element = document.getElementById(`step-output-${step.stepId}`);
                                                                if (element) {
                                                                    element.style.display = element.style.display === 'none' ? 'block' : 'none';
                                                                }
                                                            }}
                                                            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all
                                                                ${stepStatus === 'success' ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' :
                                                                    stepStatus === 'in_progress' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                        'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                                                                }
                                                            `}
                                                        >
                                                            詳細表示
                                                        </button>
                                                    )}
                                                </div>

                                                {/* 詳細データ */}
                                                {(step.payload) && (
                                                    <div
                                                        id={`step-output-${step.stepId}`}
                                                        style={{ display: 'none' }}
                                                        className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
                                                    >
                                                        <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
                                                            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center">
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                ステップ実行データ
                                                            </p>
                                                            <pre className="text-xs overflow-x-auto bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 shadow-inner whitespace-pre-wrap">
                                                                {JSON.stringify(step.payload, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                });
                            } else {
                                return (
                                    <div className="ml-12 p-6 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                        <svg className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-gray-600 dark:text-gray-300 font-medium">
                                            まだステップ情報はありません
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            ワークフローが開始されると、ここに進行状況が表示されます
                                        </p>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}