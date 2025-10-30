export function EmptyStepNotice() {
    return (
        <div className="ml-12 rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
            <svg className="mx-auto mb-3 h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="font-medium text-gray-600 dark:text-gray-300">まだステップ情報はありません</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ワークフローが開始されると、ここに進行状況が表示されます</p>
        </div>
    );
}
