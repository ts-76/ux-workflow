/**
 * Workflow-related TypeScript types and interfaces
 */

export interface StepStatusInfo {
    stepId: string;
    status: string;
    payload?: Record<string, any> | null;
}

export interface WorkflowState {
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

export interface StepStatus {
    id: string;
    status: string;
    output?: Record<string, any>;
    payload?: Record<string, any>;
}

export interface WorkflowWatchEvent {
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
