import { StepStatusInfo } from './types';
import { StepProgressHeader } from './StepProgressHeader';
import { StepPayloadDetails } from './StepPayloadDetails';

interface StepProgressItemProps {
    step: StepStatusInfo;
    index: number;
    stepStatus: string;
}

export function StepProgressItem({ step, index, stepStatus }: StepProgressItemProps) {
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
