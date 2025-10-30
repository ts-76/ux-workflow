import { WorkflowState } from './types';

interface WorkflowSummaryProps {
    runId: string;
    statusLabel: string;
    workflowState: WorkflowState | null;
    isWatching: boolean;
}

export function WorkflowSummary({ runId, statusLabel, workflowState, isWatching }: WorkflowSummaryProps) {
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
