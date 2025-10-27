import { createStep } from '@mastra/core';
import fs from 'fs/promises';
import path from 'path';
import { generate as agentGenerate } from '../../agents/ux-evaluation-agent';
import {
    isDevelopmentEnv,
    subflowInputSchema,
    journeySchema
} from '../schemas/ux-evaluation.schemas';
import z from 'zod';

export const createJourneysStep = createStep({
    id: 'create-journey',
    description: 'ペルソナに基づいてユーザージャーニーマップを作成',
    inputSchema: subflowInputSchema,
    outputSchema: journeySchema,
    execute: async ({ inputData, getInitData }) => {
        const initData = await getInitData();
        const siteNavigation = inputData.siteNavigation
        const persona = inputData.persona;
        const { templates } = inputData.initData;
        const personaContent = persona.content;
        const personaId = persona.id;

        console.log(`🚶 ペルソナ${personaId}のユーザージャーニーを作成します...`);

        // サイト分析情報の抽出
        const siteAnalysisInfo = siteNavigation ?
            `サイト分析情報:
        - サイト名: ${siteNavigation.siteName}
        - 主な目的: ${siteNavigation.purpose}
        - 想定ターゲットユーザー: ${siteNavigation.targetUsers}
        - 主要機能/ページ: ${siteNavigation.pages.map((page: any) => `${page.title}（${page.description}）`).join('、')}
        - サービス価値提案: ${siteNavigation.valueProposition}` : '';

        // テンプレートの取得（inputDataからのみ）
        let journeyTemplate = templates?.journey;

        // ジャーニー生成のプロンプト構築
        const prompt = `
        ユーザージャーニー作成タスクの説明:
        以下のペルソナが対象サイトを利用する際の具体的なユーザージャーニーマップを作成してください。
        ペルソナの特性、目標、課題、行動パターンを考慮し、現実的なシナリオを描いてください。

        ${siteAnalysisInfo}

        **ペルソナ情報:**
        ${personaContent}

        ユーザージャーニーマップの作成指示:
        1. 下記のユーザージャーニーテンプレートに完全に従ってください。
        2. テンプレートの各セクション（基本情報、フェーズごとの詳細など）を省略せず、すべて記入してください。
        3. [角括弧] で囲まれた部分を具体的な情報で置き換えてください。
        4. マークダウン形式で記載してください。
        5. ペルソナの特性に合わせた現実的なジャーニーを描いてください。
        6. ターゲットサイトの実際の機能やページを考慮したジャーニーを作成してください。
        7. ジャーニー全体で一貫性のあるストーリーになるようにしてください。

        === ユーザージャーニーテンプレート ===
        ${journeyTemplate}
        === テンプレートここまで ===

        特に重要な点:
        1. フェーズごとの感情スコアは具体的な数値（-5〜+5）で表現してください
        2. 各タッチポイントで「何をしているか」「何を考えているか」「何を感じているか」を明確に区別して記述してください
        3. 課題と機会は、改善可能な具体的なポイントを挙げてください
        4. ペルソナの特性と目標に一貫したジャーニーを作成してください

        以下のJSONに従って出力してください。
        \`\`\`json
        {
            "journey": "ユーザージャーニーの内容"
        }
        \`\`\`
        `;

        console.log('🔍 ジャーニー生成中...');

        try {
            // エージェントを使用してジャーニーを生成
            const result = await agentGenerate(prompt, {
                toolChoice: 'none' // ツールを無効化
            });

            console.log('📝 エージェント生成結果を受信しました');

            // テキストの直接抽出 - JSONパースを回避する方法
            try {
                // JSON形式でなく、生のマークダウンとしてそのまま抽出
                // ```json タグの中の "journey": "..." の ... 部分を直接取り出す
                const journeyMatch = result.text.match(/```json\s*\{\s*"journey"\s*:\s*"([\s\S]*?)"\s*\}\s*```/);

                if (journeyMatch && journeyMatch[1]) {
                    // 抽出されたテキスト（JSON文字列の値部分）
                    let journeyText = journeyMatch[1];

                    // エスケープされたクォートなどを元に戻す
                    journeyText = journeyText
                        .replace(/\\"/g, '"')  // エスケープされた " を戻す
                        .replace(/\\\\/g, '\\') // エスケープされた \ を戻す
                        .replace(/\\n/g, '\n') // エスケープされた改行を実際の改行に変換
                        .replace(/\\r/g, '');  // エスケープされたキャリッジリターンを除去

                    // 問題のある制御文字のみを削除（改行やタブは保持）
                    journeyText = journeyText.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

                    // マークダウンヘッダーの修正
                    // #の後にスペースがない場合は追加（例：#ヘッダー → # ヘッダー）
                    journeyText = journeyText.replace(/^(#+)([^\s#])/gm, '$1 $2');

                    // --- の前後に改行がない場合は追加
                    journeyText = journeyText.replace(/([^-\n])---([^-\n])/g, '$1\n\n---\n\n$2');

                    console.log('✅ ユーザージャーニーテキストを抽出しました');

                    if (isDevelopmentEnv()) {
                        // 保存用のディレクトリパスを取得
                        const personaDir = persona.dirPath || path.join(initData.evaluationFolder, personaId);

                        // ディレクトリが存在しない場合は作成
                        try {
                            await fs.mkdir(personaDir, { recursive: true });
                        } catch (dirError) {
                            console.error('ディレクトリ作成エラー:', dirError);
                        }

                        const journeyFilePath = path.join(personaDir, 'journey.md');

                        // ファイルに保存
                        await fs.writeFile(journeyFilePath, journeyText, 'utf-8');
                        console.log(`✅ ジャーニーを保存しました: ${journeyFilePath}`);
                    }

                    return {
                        journey: journeyText
                    };
                } else {
                    // JSONブロックが見つからない場合のフォールバック
                    // マークダウンの部分を探す
                    const markdownContent = result.text
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

                        if (isDevelopmentEnv()) {
                            const personaDir = persona.dirPath || path.join(initData.evaluationFolder, personaId);
                            try {
                                await fs.mkdir(personaDir, { recursive: true });
                            } catch (dirError) {
                                console.error('ディレクトリ作成エラー:', dirError);
                            }

                            const journeyFilePath = path.join(personaDir, 'journey.md');
                            await fs.writeFile(journeyFilePath, cleanedContent, 'utf-8');
                            console.log(`✅ フォールバック方式でジャーニーを保存しました: ${journeyFilePath}`);
                        }

                        return {
                            journey: cleanedContent
                        };
                    } else {
                        throw new Error('ジャーニーテキストの抽出に失敗しました');
                    }
                }
            } catch (extractError: unknown) {
                console.error('テキスト抽出エラー:', extractError);

                // 最後の手段として、生のテキスト全体を返す
                const fallbackText = result.text
                    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // 改行を保持して制御文字のみ削除
                    .replace(/^(#+)([^\s#])/gm, '$1 $2') // マークダウンの修正
                    .replace(/([^-\n])---([^-\n])/g, '$1\n\n---\n\n$2'); // 区切り線の修正

                console.log('🚨 最終フォールバック: 生テキストを使用します');

                return {
                    journey: fallbackText
                };
            }
        } catch (error: unknown) {
            console.error('ジャーニー生成エラー:', error);
            throw error;
        }
    }
}); 