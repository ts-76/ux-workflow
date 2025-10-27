import { z } from 'zod';

// 開発環境かどうかを判定するヘルパー関数
export const isDevelopmentEnv = (): boolean => {
    return process.env.ENVIRONMENT === 'develop';
};

// =========================================
// 基本的なスキーマ定義
// =========================================

// サイト回遊ページ情報の型定義
export interface PageInfo {
    url: string;
    title: string;
    description: string;
}

// サイト回遊結果の型定義
export interface SiteNavigationResult {
    siteName: string;
    purpose: string;
    targetUsers: string;
    valueProposition: string;
    pages: PageInfo[];
}

// ペルソナオブジェクトのスキーマ
export const personaSchema = z.object({
    id: z.string(),
    content: z.string(),
    dirPath: z.string().optional()
});

// サイト回遊のスキーマ
export const siteNavigationSchema = z.object({
    siteName: z.string().describe('サイト名'),
    purpose: z.string().describe('主な目的'),
    targetUsers: z.string().describe('想定ターゲットユーザー'),
    valueProposition: z.string().describe('サービス価値提案'),
    pages: z.array(z.object({
        url: z.string().describe('訪問したURL'),
        title: z.string().describe('ページタイトル'),
        description: z.string().describe('ページや機能の説明')
    })).describe('主要ページ/機能情報の配列'),
});

// 評価結果のスキーマ
export const evaluationResultSchema = z.object({
    evaluationResult: z.string().describe('評価結果')
});

// ジャーニースキーマ
export const journeySchema = z.object({
    journey: z.string()
});

// =========================================
// テンプレート関連のスキーマ
// =========================================

// テンプレートのスキーマ
export const templatesSchema = z.object({
    persona: z.string().optional().describe('ペルソナテンプレート'),
    journey: z.string().optional().describe('ジャーニーテンプレート'),
    evaluation: z.string().optional().describe('評価テンプレート'),
    projectInfo: z.string().optional().describe('プロジェクト情報')
});

// =========================================
// ステップ出力スキーマ
// =========================================

// セットアップステップの出力スキーマ
export const setupStepOutputSchema = z.object({
    evaluationFolder: z.string(),
    timestamp: z.string(),
    setupComplete: z.boolean(),
    personaDirs: z.array(z.object({
        id: z.string(),
        dirPath: z.string()
    })).optional()
});

// サイト回遊ステップの出力スキーマ
export const siteNavigationStepOutputSchema = z.object({
    siteNavigation: siteNavigationSchema
});

// ペルソナ生成用のスキーマを定義
export const personasOutputSchema = z.object({
    personas: z.array(personaSchema)
});

// =========================================
// ワークフロー関連のスキーマ
// =========================================

// 共通のワークフロー入力スキーマ
export const uxEvaluationWorkflowSchema = z.object({
    targetUrl: z.string().describe('評価対象のURL'),
    projectRoot: z.string().describe('プロジェクトのルートパス'),
    useExistingPersonas: z.boolean().describe('既存のペルソナを使用するか').optional().default(false),
    personaCount: z.number().describe('作成するペルソナの数').default(1),
    evaluationFocus: z.array(z.string()).optional().describe('評価の重点項目（オプション）'),
    templates: templatesSchema.optional().describe('テンプレート内容'),
});

// サブフロー用の入力スキーマ
export const subflowInputSchema = z.object({
    persona: personaSchema,
    siteNavigation: siteNavigationSchema,
    initData: uxEvaluationWorkflowSchema
});

// ネストワークフロー出力スキーマ - 1人のペルソナに対する一連の処理結果
export const personaJourneyEvalWorkflowOutputSchema = z.object({
    journey: z.string(),
    evaluationResult: evaluationResultSchema
});

// ワークフローの最終出力スキーマ - 全体の結果
export const finalizeAllResultsOutputSchema = z.object({
    journeys: z.array(z.string()),
    evaluationResults: z.array(z.string())
});

// UX評価レポートの出力スキーマ
export const uxEvaluationReportSchema = z.object({
    templateFileName: z.string().describe('テンプレートファイル名'),
    evaluationReportMarkdown: z.string().describe('UX評価レポートのマークダウン形式のテキスト'),
});

// =========================================
// ステップ状態管理のスキーマ
// =========================================

// ステップの実行状態
export const stepStatusSchema = z.enum(['pending', 'running', 'success', 'failed', 'skipped']);

// ステップ実行結果
export const stepResultSchema = z.object({
    stepId: z.string().describe('ステップID'),
    status: stepStatusSchema.describe('ステップの実行状態'),
    timestamp: z.string().describe('実行時刻'),
    duration: z.number().describe('実行時間（ミリ秒）').optional(),
    error: z.string().describe('エラーメッセージ').optional(),
    output: z.any().describe('ステップの出力').optional()
});

// ワークフロー実行状態
export const workflowStatusSchema = z.object({
    workflowId: z.string().describe('ワークフローID'),
    runId: z.string().describe('実行ID'),
    status: z.enum(['running', 'success', 'failed', 'terminated']).describe('ワークフローの状態'),
    completedSteps: z.array(stepResultSchema).describe('完了したステップ一覧'),
    currentStep: z.string().describe('現在実行中のステップ').optional(),
    failedStep: z.string().describe('失敗したステップ').optional(),
    errorMessage: z.string().describe('エラーメッセージ').optional()
});

// ステップ実行コンテキスト
export const stepExecutionContextSchema = z.object({
    stepId: z.string(),
    previousStepResult: stepResultSchema.optional(),
    workflowStatus: workflowStatusSchema,
    shouldTerminate: z.boolean().describe('ワークフローを終了するかどうか')
});

// =========================================
// 型定義のヘルパー
// =========================================
export type UxEvaluationWorkflowInput = z.infer<typeof uxEvaluationWorkflowSchema>;
export type StepStatus = z.infer<typeof stepStatusSchema>;
export type StepResult = z.infer<typeof stepResultSchema>;
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;
export type StepExecutionContext = z.infer<typeof stepExecutionContextSchema>; 