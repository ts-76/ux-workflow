'use client';

/**
 * WorkflowStateProvider - アプリケーション全体のワークフロー状態管理
 * 
 * 責務:
 * - アクティブなワークフローの状態管理（runId、実行履歴）
 * - セッション復元（ページリロード時の状態復旧）
 * - Zustandストアとセッションストレージの同期
 * - 監視フラグの管理（実際の監視はWorkflowMonitorが実行）
 */

import { ReactNode, useEffect, createContext, useContext, useState } from 'react';
import { useWorkflowStore } from '@/lib/store';
import { findActiveWorkflow, watchWorkflowRun } from '@/lib/workflow-service';

// ワークフロー状態のコンテキスト型定義
interface WorkflowContextType {
    activeRunId: string | null;
    runHistory: {
        runId: string;
        timestamp: number;
        targetUrl: string;
    }[];
    isMonitoring: boolean;
    monitorWorkflow: (runId: string, targetUrl: string) => void;
    stopMonitoring: () => void;
}

// コンテキスト作成
const WorkflowStateContext = createContext<WorkflowContextType | null>(null);

// カスタムフック
export function useWorkflowState() {
    const context = useContext(WorkflowStateContext);
    if (!context) {
        throw new Error('useWorkflowState must be used within WorkflowStateProvider');
    }

    return context;
}

// プロバイダーコンポーネント
export function WorkflowStateProvider({ children }: { children: ReactNode }) {
    const [isMonitoring, setIsMonitoring] = useState(false);

    // Zustandストアからワークフロー状態を取得
    const {
        activeRunId,
        runHistory,
        setActiveRunId,
        addToRunHistory,
        clearActiveRunId
    } = useWorkflowStore();

    // コンポーネント初期化時に前回のアクティブなワークフローを確認
    useEffect(() => {
        async function checkForActiveWorkflow() {
            // セッションストレージからactiveRunIdを確認
            const sessionActiveRunId = typeof window !== 'undefined'
                ? sessionStorage.getItem('workflow-active-run-id')
                : null;

            // セッションストレージにactiveRunIdがない場合はクリア
            if (!sessionActiveRunId && activeRunId) {
                console.log('WorkflowStateProvider: セッション終了によりactiveRunIdをクリア');
                clearActiveRunId();
                return;
            }


            // セッションストレージにあるがZustandストアにない場合は復元
            if (sessionActiveRunId && sessionActiveRunId !== activeRunId) {
                console.log('WorkflowStateProvider: セッションからactiveRunIdを復元:', sessionActiveRunId);
                setActiveRunId(sessionActiveRunId);
                return;
            }

            // アクティブなワークフローがない場合は履歴から実行中のものを探す
            if (!activeRunId && runHistory.length > 0) {
                console.log('WorkflowStateProvider: 以前のワークフローを確認中...');

                try {
                    // 過去のワークフロー実行IDから実行中のものを探す
                    const runIds = runHistory.map(entry => entry.runId);
                    const result = await findActiveWorkflow(runIds);

                    if (result) {
                        const { runId, isActive } = result;
                        console.log(`WorkflowStateProvider: ワークフロー ${runId} を復元、実行中: ${isActive}`);
                        setActiveRunId(runId);

                        // 実行中のワークフローが見つかった場合は状態のみ復元
                        // 実際の監視はWorkflowMonitorコンポーネントで開始される
                        if (isActive) {
                            console.log(`WorkflowStateProvider: 実行中のワークフロー ${runId} の状態を復元`);
                            setIsMonitoring(true);
                        }
                    }
                } catch (error) {
                    console.error('WorkflowStateProvider: 初期化エラー:', error);
                }
            }
            if (activeRunId) {
                const entry = runHistory.find(e => e.runId === activeRunId);
                if (entry && !isMonitoring) {
                    try {
                        const result = await findActiveWorkflow([activeRunId]);
                        if (result?.isActive) {
                            // 状態のみ復元、実際の監視はWorkflowMonitorで開始
                            setIsMonitoring(true);
                        } else {
                            // 実行が終了している場合はactiveRunIdをクリア
                            clearActiveRunId();
                        }
                    } catch (error) {
                        console.error('WorkflowStateProvider: ワークフロー状態確認エラー:', error);
                    }
                }
            }
        }

        checkForActiveWorkflow();
    }, []);

    // グローバル監視状態の管理
    const [currentUnwatch, setCurrentUnwatch] = useState<(() => void) | null>(null);

    // ワークフロー監視を開始
    function monitorWorkflow(runId: string, targetUrl: string) {
        // 既に同じワークフローを監視中で状態が変わらない場合は何もしない
        if (isMonitoring && runId === activeRunId) {
            console.log(`WorkflowStateProvider: ワークフロー ${runId} は既に監視中です。追加の操作はスキップ`);
            return;
        }

        // 同一IDでない場合や監視中でない場合は、前の監視を確実に停止
        if (activeRunId && activeRunId !== runId) {
            // 既存の監視を確実に停止
            if (currentUnwatch) {
                currentUnwatch();
                setCurrentUnwatch(null);
            }
            console.log(`WorkflowStateProvider: 既存の監視を停止し、${runId} の監視を開始します`);
        }

        // 状態更新
        console.log(`WorkflowStateProvider: ワークフロー ${runId} の監視を開始`);
        setIsMonitoring(true);
        setActiveRunId(runId);

        // 履歴に追加（既に存在する場合は追加しない）
        const existingEntry = runHistory.find(entry => entry.runId === runId);
        if (!existingEntry) {
            addToRunHistory(runId, targetUrl);
        }

        // セッションストレージにも保存
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('workflow-active-run-id', runId);
        }

        // WorkflowMonitorコンポーネントに監視を委譲する形に変更
        // グローバル状態としては監視フラグとactiveRunIdのみ管理
        console.log(`WorkflowStateProvider: グローバル状態を設定 - runId: ${runId}, 監視中: true`);
    }

    // 監視を停止
    function stopMonitoring() {
        console.log('WorkflowStateProvider: 監視を停止');

        // 監視関数があれば停止
        if (currentUnwatch) {
            currentUnwatch();
            setCurrentUnwatch(null);
        }

        setIsMonitoring(false);
        clearActiveRunId();

        // セッションストレージからも削除
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('workflow-active-run-id');
        }
    }

    return (
        <WorkflowStateContext.Provider value={{
            activeRunId,
            runHistory,
            isMonitoring,
            monitorWorkflow,
            stopMonitoring
        }}>
            {children}
        </WorkflowStateContext.Provider>
    );
} 