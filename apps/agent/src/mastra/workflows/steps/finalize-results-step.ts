import { createStep } from '@mastra/core';
import fs from 'fs/promises';
import path from 'path';
import {
    finalizeAllResultsInputSchema,
    finalizeAllResultsOutputSchema,
    journeySchema,
    evaluationResultSchema,
    personaSchema,
    isDevelopmentEnv
} from '../schemas/ux-evaluation.schemas';
import { z } from 'zod';

// 並列処理の結果を集約する最終ステップ
export const finalizeAllResultsStep = createStep({
    id: "finalize-all-results",
    description: "すべてのペルソナ評価結果を集約",
    inputSchema: finalizeAllResultsInputSchema,
    outputSchema: finalizeAllResultsOutputSchema,
    execute: async ({ inputData }) => {
        console.log('🔄 すべての評価結果を集約中...');

        // 入力データが配列であることを確認
        if (!Array.isArray(inputData) || inputData.length === 0) {
            throw new Error('評価結果がありません');
        }

        // 共通の情報を取得
        const firstItem = inputData[0];
        const {
            targetUrl,
            projectRoot,
            evaluationFolder,
            timestamp,
            setupComplete,
            siteNavigation,
            useExistingPersonas,
            personaCount,
            evaluationFocus
        } = firstItem;

        // すべてのペルソナ、ジャーニー、評価結果を集約
        const personas: z.infer<typeof personaSchema>[] = [];
        const journeys: z.infer<typeof journeySchema>[] = [];
        const evaluationResults: z.infer<typeof evaluationResultSchema>[] = [];

        // 結果を集約
        for (const result of inputData) {
            if (result.persona) {
                personas.push(result.persona);
            }
            if (result.journey) {
                journeys.push(result.journey);
            }
            if (result.evaluationResult) {
                evaluationResults.push(result.evaluationResult);
            }
        }

        // 評価サマリーを作成
        const summary = `# UX評価サマリー

## プロジェクト情報
- 評価日時: ${timestamp}
- 評価対象URL: ${targetUrl}
- 評価フォルダ: ${evaluationFolder}

## サイト概要
- サイト名: ${siteNavigation?.siteName || '不明'}
- 主な目的: ${siteNavigation?.purpose || '不明'}
- 想定ターゲットユーザー: ${siteNavigation?.targetUsers || '不明'}
- サービス価値提案: ${siteNavigation?.valueProposition || '不明'}
- 主要ページ/機能数: ${siteNavigation?.pages?.length || 0}

## 評価概要
- 評価ペルソナ数: ${personas.length}
- 生成ジャーニー数: ${journeys.length}
- 評価結果数: ${evaluationResults.length}
${evaluationFocus ? `- 評価重点項目: ${evaluationFocus.join(', ')}` : ''}

## ペルソナ一覧
${personas.map((p, i) => {
            const dirPath = p.dirPath ? path.basename(p.dirPath) : p.id;
            return `${i + 1}. [${p.id}](./${dirPath}/${p.id}.md)`;
        }).join('\n')}

## ユーザージャーニー一覧
${journeys.map((j, i) => {
            const filePath = j.filePath ? path.relative(evaluationFolder, j.filePath) : `${j.id}/journey-${j.id}.md`;
            return `${i + 1}. [${j.id}のジャーニー](./${filePath})`;
        }).join('\n')}

## 評価結果一覧
${evaluationResults.map((e, i) => {
            const filePath = e.filePath ? path.relative(evaluationFolder, e.filePath) : `${e.personaId}/ux-eval-${e.personaId}.md`;
            return `${i + 1}. [${e.personaId}の評価結果](./${filePath})`;
        }).join('\n')}

## 主な発見と推奨事項
（詳細は各ペルソナの評価結果を参照してください）
`;

        // サマリーファイルに保存
        const summaryFilePath = path.join(evaluationFolder, 'evaluation-summary.md');
        if (isDevelopmentEnv()) {
            await fs.writeFile(summaryFilePath, summary, 'utf-8');
            console.log(`✅ 評価サマリーを保存しました: ${summaryFilePath}`);
        } else {
            console.log('📄 本番環境: 評価サマリーのファイル保存をスキップします');
        }

        // 各ペルソナのサブディレクトリへのリンクを含むインデックスファイルも作成
        const index = `# UX評価インデックス

## 評価対象: ${targetUrl}
評価日時: ${timestamp}

## 評価結果
[詳細評価サマリー](./evaluation-summary.md)

## ペルソナ別評価
${personas.map((p, i) => {
            const dirPath = p.dirPath ? path.basename(p.dirPath) : p.id;
            const matchingJourney = journeys.find(j => j.id === p.id);
            const journeyPath = matchingJourney?.filePath ?
                path.relative(evaluationFolder, matchingJourney.filePath) :
                `${p.id}/journey-${p.id}.md`;
            const matchingEval = evaluationResults.find(e => e.personaId === p.id);
            const evalPath = matchingEval?.filePath ?
                path.relative(evaluationFolder, matchingEval.filePath) :
                `${p.id}/ux-eval-${p.id}.md`;

            return `### ${i + 1}. ペルソナ: ${p.id}
- [ペルソナ詳細](./${dirPath}/${p.id}.md)
- [ユーザージャーニー](./${journeyPath})
- [UX評価結果](./${evalPath})`;
        }).join('\n\n')}
`;

        // インデックスファイルを保存
        const indexFilePath = path.join(evaluationFolder, 'index.md');
        if (isDevelopmentEnv()) {
            await fs.writeFile(indexFilePath, index, 'utf-8');
            console.log(`✅ 評価インデックスを保存しました: ${indexFilePath}`);
        } else {
            console.log('📄 本番環境: 評価インデックスのファイル保存をスキップします');
        }

        return {
            targetUrl,
            projectRoot,
            evaluationFolder,
            timestamp,
            setupComplete,
            siteNavigation,
            useExistingPersonas,
            personaCount,
            evaluationFocus,
            personas,
            journeys,
            evaluationResults
        };
    }
}); 