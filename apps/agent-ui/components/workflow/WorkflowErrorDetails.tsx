import { WorkflowState } from './types';

interface WorkflowNoticeProps {
    workflowState: WorkflowState | null;
}

export function WorkflowErrorDetails({ workflowState }: WorkflowNoticeProps) {
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
