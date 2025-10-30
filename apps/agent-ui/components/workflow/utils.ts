/**
 * Utility functions for workflow components
 */

export function togglePayloadVisibility(elementId: string) {
    const element = typeof window !== 'undefined' ? document.getElementById(elementId) : null;
    if (!element) return;

    element.style.display = element.style.display === 'none' ? 'block' : 'none';
}

export function shouldExcludeStep(stepId: string): boolean {
    return stepId === 'input' || stepId.toLowerCase().includes('input');
}

export function getStatusLabel(allStepsSuccess: boolean): string {
    switch (allStepsSuccess) {
        case true: return '完了';
        case false: return '実行中';
        default: return '不明';
    }
}
