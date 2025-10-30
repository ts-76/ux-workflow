import { StepStatusInfo } from './types';
import { StepProgressItem } from './StepProgressItem';
import { EmptyStepNotice } from './EmptyStepNotice';

interface StepProgressSectionProps {
    stepsStatus?: StepStatusInfo[];
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

export function StepProgressSection({ stepsStatus }: StepProgressSectionProps) {
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
