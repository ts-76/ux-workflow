interface StepPayloadDetailsProps {
    payloadId: string;
    payload: object;
}

export function StepPayloadDetails({ payloadId, payload }: StepPayloadDetailsProps) {
    return (
        <div
            id={payloadId}
            style={{ display: 'none' }}
            className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700"
        >
            <div className="overflow-hidden rounded-md bg-gray-50 p-3 dark:bg-gray-900/50">
                <p className="mb-2 flex items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                    <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ステップ実行データ
                </p>
                <pre className="whitespace-pre-wrap rounded border border-gray-200 bg-white p-2 text-xs shadow-inner dark:border-gray-700 dark:bg-gray-800">
                    {JSON.stringify(payload, null, 2)}
                </pre>
            </div>
        </div>
    );
}
