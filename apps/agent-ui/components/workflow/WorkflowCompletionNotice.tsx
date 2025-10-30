import { WorkflowState } from './types';

interface WorkflowNoticeProps {
    workflowState: WorkflowState | null;
}

export function WorkflowCompletionNotice({ workflowState }: WorkflowNoticeProps) {
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
