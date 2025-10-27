'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import axios from 'axios';
import WorkflowMonitor from './WorkflowMonitor';
import { useWorkflowState } from './WorkflowStateProvider';

type UxEvaluationInput = {
    targetUrl: string;
    projectRoot?: string;
    useExistingPersonas?: boolean;
    personaCount?: number;
    evaluationFocus?: string[];
    templates?: {
        persona?: string;
        journey?: string;
        evaluation?: string;
    };
};

type ApiResponse = {
    success: boolean;
    message: string;
    runId?: string;
    timestamp?: string;
};

export default function UxEvaluationForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ requestId: string, targetUrl: string } | null>(null);
    const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const [lastCompletedRunId, setLastCompletedRunId] = useState<string | null>(null);

    // 無限ループを防ぐためのref
    const lastActiveRunIdRef = useRef<string | null>(null);
    const resultRef = useRef<{ requestId: string, targetUrl: string } | null>(null);

    // グローバルワークフロー状態
    const { activeRunId, runHistory, monitorWorkflow } = useWorkflowState();

    // resultが変更されたらrefも更新
    useEffect(() => {
        resultRef.current = result;
    }, [result]);

    // activeRunIdの変更を監視
    useEffect(() => {
        // activeRunIdが新しく設定された場合
        if (activeRunId && activeRunId !== lastActiveRunIdRef.current) {
            lastActiveRunIdRef.current = activeRunId;
            const entry = runHistory.find(e => e.runId === activeRunId);
            if (entry) {
                // 結果表示用のデータを設定
                setResult({
                    requestId: activeRunId,
                    targetUrl: entry.targetUrl
                });

                // サーバー状態も更新
                console.log('サーバー状態をオンラインに更新');
                setServerStatus('online');
            }
        }
        // activeRunIdがクリアされた場合
        else if (!activeRunId && lastActiveRunIdRef.current) {
            const previousRunId = lastActiveRunIdRef.current;
            lastActiveRunIdRef.current = null;

            // 結果が存在し、以前に完了記録していない場合のみ記録
            if (resultRef.current && resultRef.current.requestId === previousRunId && previousRunId !== lastCompletedRunId) {
                setLastCompletedRunId(previousRunId);
                console.log(`ワークフロー ${previousRunId} が完了し、結果表示を維持します`);
            }
        }
    }, [activeRunId, runHistory, lastCompletedRunId]);

    // Mastraサーバーの状態をチェック
    useEffect(() => {
        console.log('🔄 Mastraサーバーの状態をチェックします...');

        const checkServerStatus = async () => {
            try {
                await axios.get('/api/health-check');
                setServerStatus('online');
            } catch (err) {
                console.warn('Mastraサーバー接続エラー:', err);
                setServerStatus('offline');
            }
        };

        checkServerStatus();
    }, []);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // 重複実行防止
        if (isLoading) {
            console.warn('⚠️ ワークフローは既に実行中です。重複実行を防止しました。');
            return;
        }

        setIsLoading(true);
        setError(null);
        console.log('🚀 UX評価ワークフローを開始します（UI側）...');

        const formData = new FormData(e.currentTarget);
        const targetUrl = formData.get('targetUrl') as string;
        const personaCount = Number(formData.get('personaCount'));
        const useExistingPersonas = formData.get('useExistingPersonas') === 'on';
        const evaluationFocusRaw = formData.get('evaluationFocus') as string;
        const projectRoot = formData.get('projectRoot') as string;

        // カンマ区切りの文字列を配列に変換
        const evaluationFocus = evaluationFocusRaw ?
            evaluationFocusRaw.split(',').map(item => item.trim()) :
            [];

        try {
            const input: UxEvaluationInput = {
                targetUrl,
                personaCount,
                useExistingPersonas,
                evaluationFocus,
                projectRoot
            };

            // APIエンドポイントを呼び出し
            const response = await axios.post<ApiResponse>('/api/ux-evaluation', input);

            if (response.data.success && response.data.runId) {
                const runId = response.data.runId;

                console.log(`✅ ワークフロー開始成功 - runId: ${runId}`);

                // グローバルワークフロー状態に登録
                monitorWorkflow(runId, targetUrl);

                // 結果を設定
                setResult({
                    requestId: runId,
                    targetUrl
                });
            } else {
                throw new Error(response.data.message || '評価の開始に失敗しました');
            }
        } catch (error: unknown) {
            console.error('評価実行中にエラーが発生しました:', error);

            // エラーメッセージをカスタマイズ
            let errorMessage = error instanceof Error ? error.message : '評価の実行中に問題が発生しました';

            // ECONNREFUSED などの接続エラーの場合
            const errorString = String(error);
            if (errorString.includes('ECONNREFUSED') ||
                errorString.includes('Network Error') ||
                errorString.includes('fetch failed')) {
                errorMessage = 'Mastraサーバーに接続できません。サーバーが起動していることを確認してください。';
                setServerStatus('offline');
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 my-8 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 border-b pb-3 border-gray-200 dark:border-gray-700">UX評価ワークフロー</h2>

            {serverStatus === 'offline' && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md">
                    <p className="font-bold">サーバー接続エラー</p>
                    <p className="text-sm mt-1">
                        Mastraサーバーに接続できません。サーバーが起動していることを確認してください。
                        <br />
                        <code className="bg-yellow-100 px-1 rounded">cd /path/to/agent && npm run dev</code> でサーバーを起動する必要があります。
                    </p>
                </div>
            )}

            {!result && (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="targetUrl" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            評価対象URL <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="url"
                            id="targetUrl"
                            name="targetUrl"
                            placeholder="https://example.com"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="personaCount" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            ペルソナ数
                        </label>
                        <input
                            type="number"
                            id="personaCount"
                            name="personaCount"
                            defaultValue={2}
                            min={1}
                            max={5}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">評価に使用するペルソナの数（1〜5）</p>
                    </div>
                    <div>
                        <label htmlFor="projectRoot" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            評価結果の保存先ディレクトリ
                        </label>
                        <input
                            type="text"
                            id="projectRoot"
                            name="projectRoot"
                            placeholder="/tmp/ux-results または空白でデフォルト場所"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            評価結果を保存するディレクトリパス（空白の場合は /tmp/ux-results がデフォルト）
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || serverStatus === 'offline'}
                        className={`w-full p-3 rounded-lg text-white font-medium transition-colors duration-200 ${isLoading || serverStatus === 'offline'
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                            }`}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                評価実行中...
                            </div>
                        ) : serverStatus === 'offline' ? 'サーバーがオフラインです' : 'UX評価を開始'}
                    </button>
                </form>
            )}

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mt-6 rounded-md" role="alert">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {result && (
                <div className="mt-6 animate-fadeIn">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">評価状況</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="mb-4">
                            <p className="font-medium text-gray-700 dark:text-gray-300">リクエストID:</p>
                            <p className="font-mono text-sm mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded break-all">{result.requestId}</p>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                対象URL: <a href={result.targetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{result.targetUrl}</a>
                            </p>
                            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                                評価が非同期で実行されています。ワークフロー状況はリアルタイムで更新されます。
                            </p>
                        </div>

                        {/* ワークフロー監視コンポーネントを追加 - targetUrlも渡す */}
                        <WorkflowMonitor runId={result.requestId} targetUrl={result.targetUrl} />

                        <div className="mt-6">
                            <button
                                onClick={() => {
                                    setResult(null);
                                    setLastCompletedRunId(null);
                                    setError(null);
                                }}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                新しい評価を開始
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 