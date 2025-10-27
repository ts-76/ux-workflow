/**
 * 指定されたrunIdのワークフロー実行状態を取得
 * セッション管理も含めて、確実な状態取得を行う
 */
export async function getWorkflowRunStatus(runId: string) {
    try {
        console.log(`WorkflowService: ${runId} の実行状態を取得します`);

        // APIエンドポイント経由で状態を取得
        const response = await fetch(`/api/workflow-status/${runId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();
        console.log(`WorkflowService: ${runId} の実行状態取得成功:`, result);

        return {
            data: result,
            success: true,
            error: null
        };
    } catch (error) {
        console.error(`WorkflowService: ${runId} の実行状態取得エラー:`, error);
        return {
            data: null,
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

// ポーリング間隔（ミリ秒）
const POLLING_INTERVAL = 3000;

/**
 * ポーリングベースでワークフローの監視を設定（Mastra推奨のシンプルな方法）
 * 
 * @param runId - 監視するワークフローの実行ID
 * @param onEvent - ワークフローイベントを受信した際のコールバック関数
 * @returns 監視を停止するための関数
 */
// アクティブなポーリングを追跡するための静的マップ
// キー: runId, 値: intervalId
const activePollings = new Map<string, NodeJS.Timeout>();

export function watchWorkflowRun(runId: string, onEvent: (event: any) => void): () => void {
    let isWatchActive = true;
    let pollingIntervalId: NodeJS.Timeout | null = null;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;

    // 既に同じrunIdでポーリングが実行されている場合は停止
    if (activePollings.has(runId)) {
        const existingInterval = activePollings.get(runId);
        if (existingInterval) {
            console.log(`WorkflowService: ${runId} の既存ポーリングを検出・停止します`);
            clearInterval(existingInterval);
            activePollings.delete(runId);
        }
    }

    console.log(`WorkflowService: ${runId} のポーリング監視を開始します`);

    // 初期状態を通知
    onEvent({
        type: 'connection_status',
        status: 'connected',
        eventTimestamp: new Date(),
        runId: runId
    });

    // 即時に初回データを取得（ページ読み込み時に待機なしでデータを表示するため）
    (async () => {
        try {
            const status = await getWorkflowRunStatus(runId);

            if (status.success && status.data && isWatchActive) {
                console.log(`WorkflowService: ${runId} 初期データ取得成功:`, {
                    allStepsSuccess: status.data.allStepsSuccess,
                    stepsStatusLength: status.data.stepsStatus?.length || 0,
                    timestamp: new Date().toISOString()
                });

                // workflowStateのデフォルト値
                const defaultWorkflowState = {
                    status: 'running',
                    steps: {},
                    error: null,
                    allStepsSuccess: status.data.allStepsSuccess || false,
                    stepsStatus: status.data.stepsStatus || []
                };

                // ワークフロー状態を構築
                const workflowState = {
                    ...defaultWorkflowState,
                    allStepsSuccess: status.data.allStepsSuccess || false,
                    stepsStatus: status.data.stepsStatus || []
                };

                // 初期データをイベント通知
                onEvent({
                    payload: {
                        workflowState: workflowState,
                        currentStep: status.data.currentStep || {
                            id: "準備中",
                            status: "in_progress",
                            output: null
                        }
                    },
                    eventTimestamp: new Date(),
                    runId: runId,
                    source: 'initial'
                });
            }
        } catch (error) {
            console.error(`WorkflowService: ${runId} 初期データ取得エラー:`, error);
        }
    })();

    // ポーリングベースの監視を開始
    pollingIntervalId = setInterval(async () => {
        if (!isWatchActive) return;

        try {
            const status = await getWorkflowRunStatus(runId);

            if (status.success && status.data && isWatchActive) {
                // 成功時はエラーカウンタをリセット
                consecutiveErrors = 0;

                // APIからのレスポンスを詳細にログ
                console.log(`WorkflowService: ${runId} ポーリング成功:`, {
                    allStepsSuccess: status.data.allStepsSuccess,
                    stepsStatusLength: status.data.stepsStatus?.length || 0,
                    timestamp: new Date().toISOString()
                });

                // workflowStateのデフォルト値
                const defaultWorkflowState = {
                    status: 'running',
                    steps: {},
                    error: null,
                    allStepsSuccess: status.data.allStepsSuccess || false,
                    stepsStatus: status.data.stepsStatus || []
                };

                // ワークフローがすべて完了している場合、ポーリングを停止
                if (status.data.allStepsSuccess) {
                    console.log(`WorkflowService: ${runId} すべてのステップが完了したためポーリングを停止します`);
                    isWatchActive = false;

                    if (pollingIntervalId) {
                        clearInterval(pollingIntervalId);
                    }

                    onEvent({
                        payload: {
                            workflowState: {
                                ...defaultWorkflowState,
                                allStepsSuccess: true,
                                stepsStatus: status.data.stepsStatus || []
                            },
                            currentStep: null
                        },
                        eventTimestamp: new Date(),
                        runId: runId,
                        source: 'final'
                    });

                    return;
                }

                // APIからのレスポンスを詳細に分析
                const hasValidWorkflowState = status.data.workflowState &&
                    typeof status.data.workflowState === 'object';

                // currentStepのデフォルト値（APIから返された値がない場合）
                const defaultCurrentStep = status.data.currentStep || {
                    id: "準備中",
                    status: "in_progress",
                    output: null
                };

                // ポーリングイベントを詳細にログ
                console.log(`WorkflowService: ${runId} イベント生成:`, {
                    allStepsSuccess: status.data.allStepsSuccess,
                    stepsStatusLength: status.data.stepsStatus?.length || 0,
                    timestamp: new Date().toISOString()
                });

                // ワークフロー状態を構築
                const workflowState = {
                    ...defaultWorkflowState,
                    allStepsSuccess: status.data.allStepsSuccess || false,
                    stepsStatus: status.data.stepsStatus || []
                };

                // イベント通知（常に有効なデータを含む）
                onEvent({
                    payload: {
                        workflowState: workflowState,
                        currentStep: defaultCurrentStep
                    },
                    eventTimestamp: new Date(),
                    runId: runId,
                    source: 'polling'
                });
            } else {
                consecutiveErrors++;
                console.warn(`WorkflowService: ${runId} ポーリング失敗 (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})`, {
                    success: status.success,
                    hasData: !!status.data,
                    error: status.error
                });
            }
        } catch (pollError) {
            consecutiveErrors++;
            console.error(`WorkflowService: ${runId} ポーリングエラー (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, pollError);

            // 連続エラーが上限を超えた場合は監視を停止
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.error(`WorkflowService: ${runId} 連続エラーが上限に達したため監視を停止します`);
                onEvent({
                    type: 'error',
                    message: 'ワークフローの監視で連続エラーが発生したため、監視を停止しました。',
                    eventTimestamp: new Date(),
                    runId: runId
                });
                isWatchActive = false;
            }
        }
    }, POLLING_INTERVAL);

    // 新しいポーリングをマップに登録
    if (pollingIntervalId) {
        activePollings.set(runId, pollingIntervalId);
    }

    // 監視解除関数を返す
    return () => {
        console.log(`WorkflowService: ${runId} の監視を解除します`);
        isWatchActive = false;

        if (pollingIntervalId) {
            clearInterval(pollingIntervalId);
            // マップからも削除
            activePollings.delete(runId);
        }
    };
}

// ワークフローの状態を示す型定義
export interface WorkflowStatusResult {
    runId: string;
    status: string;
    isActive: boolean;
    allStepsSuccess?: boolean; // すべてのステップが完了したかどうか
}

/**
 * 複数のワークフロー実行ID一覧から、実行中のワークフローを探す
 * 実行中のワークフローが見つからない場合は、最新のワークフローを返す
 * 
 * @param runIds - 検索対象のワークフロー実行ID一覧
 * @returns ワークフローの状態情報（runId, status, isActive）またはnull
 */
export async function findActiveWorkflow(runIds: string[]): Promise<WorkflowStatusResult | null> {
    if (!runIds || runIds.length === 0) return null;

    console.log(`WorkflowService: ${runIds.length}件のワークフローから実行中のものを検索`);

    try {
        // 並列でワークフロー状態を確認
        const results = await Promise.all(
            runIds.map(async (runId) => {
                try {
                    const result = await getWorkflowRunStatus(runId);
                    // ワークフローの状態を取得
                    const status = result.data?.status || 'unknown';
                    return {
                        runId,
                        status: status,
                        isActive: status === 'in_progress' || status === 'suspended'
                    };
                } catch {
                    return { runId, status: 'error', isActive: false };
                }
            })
        );

        // 実行中のワークフローを検索
        const activeWorkflow = results.find(result => result.isActive);

        if (activeWorkflow) {
            console.log(`WorkflowService: 実行中のワークフロー ${activeWorkflow.runId} を発見`);
            return activeWorkflow;
        } else {
            console.log(`WorkflowService: 実行中のワークフローはありません。最新のものを返します。`);
            // 実行中のワークフローがなければ最新のものを返す（実行中フラグはfalse）
            return results[0] ? { ...results[0], isActive: false } : null;
        }
    } catch (error) {
        console.error('WorkflowService: ワークフロー検索エラー:', error);
        return null;
    }
} 