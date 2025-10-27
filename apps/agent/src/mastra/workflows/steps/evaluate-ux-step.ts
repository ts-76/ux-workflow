import { createStep } from '@mastra/core';
import { MDocument } from '@mastra/rag';
import fs from 'fs/promises';
import path from 'path';
import { generate as agentGenerate } from '../../agents/ux-evaluation-agent';
import {
    isDevelopmentEnv,
    evaluationResultSchema,
    journeySchema,
    subflowInputSchema
} from '../schemas/ux-evaluation.schemas';
import { z } from 'zod';
import { summarizeAgent } from '../../agents/summarize-agent';

// 回遊結果のキャッシュ管理
interface CrawlResultCache {
    [key: string]: {
        result: string;
        summary: string; // 要約も保存
        timestamp: number;
    };
}

// グローバルキャッシュ
const crawlResultCache: CrawlResultCache = {};
const CACHE_TTL = 60 * 60 * 1000;

// トークン制限に基づく設定
const MAX_SINGLE_PROMPT_TOKENS = 12000; // 約15,000文字相当
const CRAWL_SUMMARY_LENGTH = 2000;
const PERSONA_SUMMARY_LENGTH = 800;
const TEMPLATE_CORE_LENGTH = 1200;

/**
 * 重要度に基づく情報の要約・圧縮
 */
async function summarizeContent(content: string, targetLength: number, contentType: string): Promise<string> {
    if (content.length <= targetLength) {
        return content;
    }

    const summaryPrompt = `以下の${contentType}を${targetLength}文字程度に要約してください。重要な情報と評価に必要な要素を保持してください：

${content}

要約（${targetLength}文字程度）：`;

    try {
        const result = await summarizeAgent.generate(summaryPrompt);
        return result.text.trim();
    } catch (error) {
        console.warn(`${contentType}の要約に失敗しました:`, error);
        return extractImportantParts(content, targetLength);
    }
}

/**
 * 重要な部分を抽出する（要約失敗時のフォールバック）
 */
function extractImportantParts(content: string, targetLength: number): string {
    const sentences = content.split(/[。\.\n]+/).filter(s => s.trim());

    // 重要度の高いキーワードを含む文を優先
    const importantKeywords = [
        'ペルソナ', 'ユーザー', '目標', '課題', '問題', 'ニーズ', '期待',
        'ページ', 'ナビゲーション', 'UI', 'UX', '体験', '操作', '機能',
        '評価', '分析', '改善', '提案', '推奨'
    ];

    const scoredSentences = sentences.map(sentence => {
        const score = importantKeywords.reduce((acc, keyword) => {
            return acc + (sentence.includes(keyword) ? 1 : 0);
        }, 0);
        return { sentence: sentence.trim(), score };
    });

    // スコア順にソートして重要な文から採用
    scoredSentences.sort((a, b) => b.score - a.score);

    let result = '';
    for (const item of scoredSentences) {
        if ((result + item.sentence).length > targetLength - 20) break;
        result += item.sentence + '。';
    }

    return result + '\n\n[要約版のため一部省略]';
}

/**
 * プロンプトの全体サイズを推定
 */
function estimatePromptSize(prompt: string, crawlResult: string): number {
    return (prompt + crawlResult).length;
}

/**
 * 情報の階層化とコア要素の抽出
 */
async function prepareOptimalPrompt(
    persona: any,
    journey: string,
    siteNavigation: any,
    evaluationTemplate: string,
    crawlResult: string
): Promise<{ prompt: string; crawlSummary: string }> {

    // 1. 回遊結果の要約（最重要情報のみ）
    const crawlSummary = await summarizeContent(
        crawlResult,
        CRAWL_SUMMARY_LENGTH,
        "サイト回遊結果（重要な発見と問題点に焦点）"
    );

    // 2. ペルソナ情報の要約（評価に直接関わる特性のみ）
    const personaSummary = await summarizeContent(
        persona.content,
        PERSONA_SUMMARY_LENGTH,
        "ペルソナ情報（評価観点に関連する特性のみ）"
    );

    // 3. サイト情報の簡潔版
    const siteInfo = siteNavigation ? `
サイト: ${siteNavigation.siteName}
目的: ${siteNavigation.purpose?.substring(0, 150)}
主要ページ: ${siteNavigation.pages?.slice(0, 3).map((p: any) => p.title).join(', ')}` : '';

    // 4. 最適化されたプロンプト構築
    const optimizedPrompt = `
# UX評価レポート作成タスク

**重要**: このタスクは評価レポートの作成のみです。新たなサイト回遊や情報収集は行わないでください。

${siteInfo}

## ペルソナ（評価視点）
${personaSummary}

## ユーザージャーニー
${journey.length > 1000 ? await summarizeContent(journey, 800, "ユーザージャーニー") : journey}

## 評価フレームワーク
${evaluationTemplate}

## 指示
既に実行済みのサイト回遊結果に基づき、客観的かつ詳細なUX評価レポートを作成してください。
新たなページ回遊や情報収集は行わず、提供された情報のみを使用してください。

評価の重点項目：
1. ペルソナの特性に基づく体験評価
2. ユーザージャーニーの各段階での問題点
3. 具体的な改善提案

**必須要件**: 
- 評価完了後、必ず以下のJSON形式で最終結果を出力してください
- 中間メッセージではなく、完全な評価レポートを含めてください

出力形式:
\`\`\`json
{"evaluationResult": "詳細なUX評価レポート"}
\`\`\`
    `;

    return {
        prompt: optimizedPrompt.trim(),
        crawlSummary
    };
}

/**
 * キャッシュ関連の関数群
 */
function generateCacheKey(targetUrl: string, personaId: string): string {
    return `${targetUrl}:${personaId}`;
}

function getCachedCrawlResult(targetUrl: string, personaId: string): { result: string; summary: string } | null {
    const cacheKey = generateCacheKey(targetUrl, personaId);
    const cached = crawlResultCache[cacheKey];

    if (!cached || Date.now() - cached.timestamp > CACHE_TTL) {
        if (cached) delete crawlResultCache[cacheKey];
        return null;
    }

    console.log(`🔍 キャッシュヒット: ${personaId}`);
    return { result: cached.result, summary: cached.summary };
}

async function setCachedCrawlResult(targetUrl: string, personaId: string, result: string): Promise<void> {
    const cacheKey = generateCacheKey(targetUrl, personaId);

    // 回遊結果の要約を生成
    const summary = await summarizeContent(result, CRAWL_SUMMARY_LENGTH, "サイト回遊結果");

    crawlResultCache[cacheKey] = {
        result,
        summary,
        timestamp: Date.now()
    };
    console.log(`🔍 キャッシュ保存完了: ${personaId}`);
}

/**
 * 効率的な回遊結果取得
 */
async function getCrawlResultWithCache(
    targetUrl: string,
    personaId: string,
    journey: string,
    persona: any,
    siteNavigation: any
): Promise<{ result: string; summary: string }> {

    const cached = getCachedCrawlResult(targetUrl, personaId);
    if (cached) {
        return cached;
    }

    console.log(`🔍 サイト回遊を実行: ${personaId}`);

    // 効率的な回遊プロンプト
    const crawlPrompt = `
サイト回遊タスク:
- サイト: ${siteNavigation.siteName} (${targetUrl})
- ペルソナ: ${persona.content.substring(0, 600)}...
- ジャーニー: ${journey.substring(0, 500)}...

以下を重点的に記録してください:
1. 各ページでの主要な問題点・改善点
2. ナビゲーションや操作での困難
3. ペルソナ視点での感情的反応
4. 目標達成における障害

制約: フォーム入力禁止、ブラウザ終了必須

**重要**: 回遊完了後、必ず以下の形式で要点を整理したレポートを出力してください。
中間メッセージではなく、完全な回遊レポートを含めてください。

最終出力形式:
\`\`\`
# サイト回遊レポート
[回遊で発見した問題点、改善点、ユーザー体験の詳細をまとめる]
\`\`\`
    `;

    try {
        const crawlResult = await agentGenerate(crawlPrompt);
        await setCachedCrawlResult(targetUrl, personaId, crawlResult.text);

        const summary = await summarizeContent(crawlResult.text, CRAWL_SUMMARY_LENGTH, "サイト回遊結果");
        return { result: crawlResult.text, summary };
    } catch (error) {
        console.error('サイト回遊エラー:', error);
        throw error;
    }
}

/**
 * スマートな評価生成（チャンク不要の最適化アプローチ）
 */
async function generateSmartEvaluation(
    persona: any,
    journey: string,
    siteNavigation: any,
    evaluationTemplate: string,
    crawlData: { result: string; summary: string }
): Promise<string> {

    // 最適化されたプロンプトを準備
    const { prompt, crawlSummary } = await prepareOptimalPrompt(
        persona,
        journey,
        siteNavigation,
        evaluationTemplate,
        crawlData.result
    );

    // プロンプト全体のサイズを確認
    const totalSize = estimatePromptSize(prompt, crawlSummary);
    console.log(`🔍 最適化後のプロンプトサイズ: ${totalSize}文字`);

    if (totalSize <= MAX_SINGLE_PROMPT_TOKENS) {
        // 単一プロンプトで処理可能
        console.log('🔍 単一プロンプトで評価を生成します');
        const fullPrompt = `${prompt}\n\n## サイト回遊結果\n${crawlSummary}`;
        const result = await agentGenerate(fullPrompt);
        return result.text;
    } else {
        // それでも大きい場合は、段階的評価アプローチ
        console.log('🔍 段階的評価アプローチを実行します');
        return await generateStageBasedEvaluation(prompt, crawlSummary);
    }
}

/**
 * 段階的評価アプローチ（チャンクではなく評価観点別）
 */
async function generateStageBasedEvaluation(prompt: string, crawlSummary: string): Promise<string> {
    const stages = [
        {
            name: "ユーザビリティ評価",
            focus: "操作性、分かりやすさ、効率性の観点から評価"
        },
        {
            name: "体験評価",
            focus: "感情的満足度、期待との一致、全体的印象の評価"
        },
        {
            name: "改善提案",
            focus: "具体的な問題点の特定と実践的な改善案の提示"
        }
    ];

    let evaluationResults: string[] = [];

    for (const stage of stages) {
        const stagePrompt = `${prompt}

## 評価フォーカス: ${stage.name}
${stage.focus}

## サイト回遊結果
${crawlSummary}

**重要**: 評価レポートの作成のみを行い、新たなサイト回遊や情報収集は行わないでください。
この観点に特化して評価を行い、200-400文字で要点をまとめてください。`;

        try {
            const result = await agentGenerate(stagePrompt);
            evaluationResults.push(`### ${stage.name}\n${result.text}`);
        } catch (error) {
            console.error(`段階 ${stage.name} でエラー:`, error);
            evaluationResults.push(`### ${stage.name}\n評価中にエラーが発生しました。`);
        }
    }

    // 最終統合
    const finalPrompt = `以下の段階的評価結果を統合して、完全なUX評価レポートを作成してください：

${evaluationResults.join('\n\n')}

**重要**: 評価レポートの作成のみを行い、新たなサイト回遊や情報収集は行わないでください。
統合して包括的なレポートにまとめ、必ず以下のJSON形式で最終結果を出力してください：

\`\`\`json
{"evaluationResult": "統合されたUX評価レポート"}
\`\`\``;

    const finalResult = await agentGenerate(finalPrompt);
    return finalResult.text;
}

export const evaluateUxStep = createStep({
    id: "evaluate-ux",
    description: "ペルソナとジャーニーに基づくUX評価",
    inputSchema: journeySchema,
    outputSchema: evaluationResultSchema,
    execute: async ({ inputData, getInitData }) => {
        const subflowInitData: z.infer<typeof subflowInputSchema> = await getInitData();
        const { persona, siteNavigation, initData } = subflowInitData;
        const journey = inputData.journey;

        console.log(`🔍 ペルソナ「${persona.id}」のUX評価を最適化アプローチで実行中...`);

        try {
            // 1. 回遊結果の取得（キャッシュ活用）
            const crawlData = await getCrawlResultWithCache(
                initData.targetUrl,
                persona.id,
                journey,
                persona,
                siteNavigation
            );

            // 2. スマートな評価生成
            const result = await generateSmartEvaluation(
                persona,
                journey,
                siteNavigation,
                initData.templates?.evaluation || '',
                crawlData
            );

            // 3. JSON結果の抽出（create-journeys-step.tsと同様の処理）
            let evaluation;
            try {
                // JSON形式でなく、生のマークダウンとしてそのまま抽出
                // ```json タグの中の "evaluationResult": "..." の ... 部分を直接取り出す
                const evaluationMatch = result.match(/```json\s*\{\s*"evaluationResult"\s*:\s*"([\s\S]*?)"\s*\}\s*```/);

                if (evaluationMatch && evaluationMatch[1]) {
                    // 抽出されたテキスト（JSON文字列の値部分）
                    let evaluationText = evaluationMatch[1];

                    // エスケープされたクォートなどを元に戻す
                    evaluationText = evaluationText
                        .replace(/\\"/g, '"')  // エスケープされた " を戻す
                        .replace(/\\\\/g, '\\') // エスケープされた \ を戻す
                        .replace(/\\n/g, '\n') // エスケープされた改行を実際の改行に変換
                        .replace(/\\r/g, '');  // エスケープされたキャリッジリターンを除去

                    // 問題のある制御文字のみを削除（改行やタブは保持）
                    evaluationText = evaluationText.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

                    // マークダウンヘッダーの修正
                    // #の後にスペースがない場合は追加（例：#ヘッダー → # ヘッダー）
                    evaluationText = evaluationText.replace(/^(#+)([^\s#])/gm, '$1 $2');

                    // --- の前後に改行がない場合は追加
                    evaluationText = evaluationText.replace(/([^-\n])---([^-\n])/g, '$1\n\n---\n\n$2');

                    console.log('✅ UX評価レポートテキストを抽出しました');

                    evaluation = {
                        evaluationResult: evaluationText
                    };
                } else {
                    // JSONブロックが見つからない場合のフォールバック
                    // マークダウンの部分を探す
                    const markdownContent = result
                        .replace(/```json[\s\S]*?```/g, '')  // JSONブロックを削除
                        .replace(/```[\s\S]*?```/g, '')      // 他のコードブロックも削除
                        .trim();                            // 前後の空白を削除

                    if (markdownContent && markdownContent.includes('#')) {
                        console.log('⚠️ JSONからの抽出に失敗、マークダウンコンテンツを直接使用します');

                        // 問題のある制御文字のみを削除（改行やタブは保持）
                        const cleanedContent = markdownContent
                            .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
                            // マークダウンヘッダーの修正
                            .replace(/^(#+)([^\s#])/gm, '$1 $2')
                            // --- の前後に改行を追加
                            .replace(/([^-\n])---([^-\n])/g, '$1\n\n---\n\n$2');

                        evaluation = {
                            evaluationResult: cleanedContent
                        };
                    } else {
                        throw new Error('評価レポートテキストの抽出に失敗しました');
                    }
                }
            } catch (extractError: unknown) {
                console.error('テキスト抽出エラー:', extractError);

                // 最後の手段として、生のテキスト全体を返す
                const fallbackText = result
                    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // 改行を保持して制御文字のみ削除
                    .replace(/^(#+)([^\s#])/gm, '$1 $2') // マークダウンの修正
                    .replace(/([^-\n])---([^-\n])/g, '$1\n\n---\n\n$2'); // 区切り線の修正

                console.log('🚨 最終フォールバック: 生テキストを使用します');

                evaluation = {
                    evaluationResult: fallbackText
                };
            }

            if (!evaluation?.evaluationResult) {
                throw new Error('評価レポートの内容が見つかりませんでした');
            }

            // 4. ファイル保存（開発環境）
            if (isDevelopmentEnv()) {
                const personaDir = persona.dirPath || path.join(initData.projectRoot, 'ux-results', persona.id);

                try {
                    await fs.mkdir(personaDir, { recursive: true });
                    const evaluationFilePath = path.join(personaDir, 'evaluation.md');
                    await fs.writeFile(evaluationFilePath, evaluation.evaluationResult, 'utf-8');
                    console.log(`✅ 評価レポート保存完了: ${evaluationFilePath}`);
                } catch (writeError: any) {
                    console.warn(`ファイル保存エラー: ${writeError.message}`);
                }
            }

            return {
                evaluationResult: evaluation.evaluationResult
            };

        } catch (error) {
            console.error('UX評価エラー:', error);
            throw error;
        }
    }
});