import { StepStatusInfo } from './types';
import { togglePayloadVisibility } from './utils';

interface StepProgressHeaderProps {
    step: StepStatusInfo;
    stepStatus: string;
    payloadId: string;
}

export function StepProgressHeader({ step, stepStatus, payloadId }: StepProgressHeaderProps) {
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
