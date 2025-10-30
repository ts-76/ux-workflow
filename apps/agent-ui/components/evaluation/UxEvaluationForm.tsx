'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import axios from 'axios';
import WorkflowMonitor from '@/components/workflow/WorkflowMonitor';
import { useWorkflowState } from '@/components/WorkflowStateProvider';

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
        <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-6 text-neutral-800 shadow-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
            <h2 className="text-lg font-semibold">UX評価ワークフロー</h2>

            {serverStatus === 'offline' && (
                <div className="mt-4 rounded border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200">
                    <p className="font-medium">サーバー接続エラー</p>
                    <p className="mt-1 text-xs leading-relaxed">
                        Mastraサーバーに接続できません。サーバーが起動していることを確認してください。
                        <br />
                        <code className="rounded bg-yellow-100 px-1 py-0.5 text-[11px] dark:bg-yellow-800/30">cd /path/to/agent && npm run dev</code> でサーバーを起動する必要があります。
                    </p>
                </div>
            )}

            {!result && (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="targetUrl" className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                            評価対象URL <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="url"
                            id="targetUrl"
                            name="targetUrl"
                            placeholder="https://example.com"
                            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition-colors focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="personaCount" className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                            ペルソナ数
                        </label>
                        <input
                            type="number"
                            id="personaCount"
                            name="personaCount"
                            defaultValue={2}
                            min={1}
                            max={5}
                            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                        />
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">評価に使用するペルソナの数（1〜5）</p>
                    </div>
                    <div>
                        <label htmlFor="projectRoot" className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                            評価結果の保存先ディレクトリ
                        </label>
                        <input
                            type="text"
                            id="projectRoot"
                            name="projectRoot"
                            placeholder="/tmp/ux-results または空白でデフォルト場所"
                            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                        />
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                            評価結果を保存するディレクトリパス（空白の場合は /tmp/ux-results がデフォルト）
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || serverStatus === 'offline'}
                        className={`w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${isLoading || serverStatus === 'offline'
                            ? 'cursor-not-allowed bg-neutral-300 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
                            : 'bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-white'
                            }`}
                    >
                        {isLoading ? '評価実行中...' : serverStatus === 'offline' ? 'サーバーがオフラインです' : 'UX評価を開始'}
                    </button>
                </form>
            )}

            {error && (
                <div className="mt-6 rounded border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200" role="alert">
                    <p>{error}</p>
                </div>
            )}

            {result && (
                <div className="mt-6">
                    <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">評価状況</h3>
                    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                        <div className="mb-4">
                            <p className="font-medium">リクエストID</p>
                            <p className="mt-1 break-all font-mono text-xs text-neutral-600 dark:text-neutral-300">{result.requestId}</p>
                            <p className="mt-2 text-xs">
                                対象URL: <a href={result.targetUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{result.targetUrl}</a>
                            </p>
                            <p className="mt-4 text-xs leading-relaxed">
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
                                className="text-sm font-medium text-neutral-700 underline underline-offset-4 hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-white"
                            >
                                新しい評価を開始
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 