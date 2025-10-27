import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkflowStoreState {
    // 現在実行中のワークフロー（セッションストレージで管理）
    activeRunId: string | null;

    // 過去の実行履歴（直近5件まで）
    runHistory: {
        runId: string;
        timestamp: number;
        targetUrl: string;
    }[];

    // アクション
    setActiveRunId: (runId: string | null) => void;
    addToRunHistory: (runId: string, targetUrl: string) => void;
    clearHistory: () => void;
    clearActiveRunId: () => void;
}

// 最大履歴保持数
const MAX_HISTORY = 5;

// セッションストレージのキー
const ACTIVE_RUN_ID_KEY = 'workflow-active-run-id';

// activeRunIdをセッションストレージで管理するヘルパー関数
const getActiveRunIdFromSession = (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(ACTIVE_RUN_ID_KEY);
};

const setActiveRunIdToSession = (runId: string | null): void => {
    if (typeof window === 'undefined') return;
    if (runId) {
        sessionStorage.setItem(ACTIVE_RUN_ID_KEY, runId);
    } else {
        sessionStorage.removeItem(ACTIVE_RUN_ID_KEY);
    }
};

// Zustandストアを作成（履歴のみローカルストレージに永続化）
export const useWorkflowStore = create<WorkflowStoreState>()(
    persist(
        (set, get) => ({
            activeRunId: null,
            runHistory: [],

            setActiveRunId: (runId: string | null) => {
                setActiveRunIdToSession(runId);
                set({ activeRunId: runId });
            },

            addToRunHistory: (runId: string, targetUrl: string) =>
                set((state) => {
                    // 既存エントリの重複チェック
                    const existingIndex = state.runHistory.findIndex(entry => entry.runId === runId);

                    // 新しい履歴エントリ
                    const newEntry = {
                        runId,
                        targetUrl,
                        timestamp: Date.now()
                    };

                    let newHistory;
                    if (existingIndex >= 0) {
                        // 既存エントリを更新
                        newHistory = [...state.runHistory];
                        newHistory[existingIndex] = newEntry;
                    } else {
                        // 新しいエントリを先頭に追加し、MAX_HISTORYに制限
                        newHistory = [newEntry, ...state.runHistory].slice(0, MAX_HISTORY);
                    }

                    // activeRunIdもセッションストレージに保存
                    setActiveRunIdToSession(runId);

                    return {
                        activeRunId: runId,
                        runHistory: newHistory
                    };
                }),

            clearHistory: () => {
                setActiveRunIdToSession(null);
                set({ runHistory: [], activeRunId: null });
            },

            clearActiveRunId: () => {
                setActiveRunIdToSession(null);
                set({ activeRunId: null });
            }
        }),
        {
            name: 'workflow-store', // localStorage のキー（履歴用）
            partialize: (state) => ({
                runHistory: state.runHistory
            }), // activeRunIdは永続化から除外
            onRehydrateStorage: () => (state) => {
                // ストア復元時にセッションストレージからactiveRunIdを読み込み
                if (state) {
                    const sessionActiveRunId = getActiveRunIdFromSession();
                    if (sessionActiveRunId) {
                        state.activeRunId = sessionActiveRunId;
                    }
                }
            },
        }
    )
); 