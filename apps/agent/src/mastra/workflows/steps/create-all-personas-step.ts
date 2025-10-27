import { createStep } from '@mastra/core';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { generate as agentGenerate } from '../../agents/ux-evaluation-agent';
import {
    isDevelopmentEnv,
    UxEvaluationWorkflowInput,
    personaSchema,
    personasOutputSchema,
    siteNavigationStepOutputSchema
} from '../schemas/ux-evaluation.schemas';
import { setupStep } from './setup-step';

// 一度に複数のペルソナを作成するステップ
export const createAllPersonasStep = createStep({
    id: "create-all-personas",
    description: "複数のペルソナを一度に作成",
    inputSchema: siteNavigationStepOutputSchema,
    outputSchema: personasOutputSchema,
    execute: async ({ inputData, getInitData, getStepResult }) => {
        const initData: UxEvaluationWorkflowInput = await getInitData();
        console.log(`👥 ${initData.personaCount}人のペルソナを一度に作成します`);
        const setupResult = getStepResult(setupStep);

        // サイト分析情報の抽出
        const siteAnalysisInfo = inputData.siteNavigation ?
            `サイト分析情報:
- サイト名: ${inputData.siteNavigation.siteName}
- 主な目的: ${inputData.siteNavigation.purpose}
- 想定ターゲットユーザー: ${inputData.siteNavigation.targetUsers}
- 主要機能/ページ: ${inputData.siteNavigation.pages.map(page => `${page.title}（${page.description}）`).join('、')}
- サービス価値提案: ${inputData.siteNavigation.valueProposition}` : '';

        // テンプレートの取得（inputDataからのみ）
        let personaTemplate = initData.templates?.persona;

        // プロジェクト情報の取得
        const projectInfo = initData.templates?.projectInfo || '';

        // personaDirsの生成
        const personaDirs = setupResult.personaDirs ? setupResult.personaDirs.map(dir => ({
            id: dir.id,
            content: "テンプレートに従ったペルソナの内容",
            dirPath: dir.dirPath,
        })) : [];

        // ペルソナ生成のプロンプト構築
        let prompt = `
ペルソナ作成タスクの説明:
以下のサイト分析情報とプロジェクト情報を参考にしてペルソナを${initData.personaCount} 人分作成してください。
このタスクのために、新たに追加のページ回遊や情報収集は行わないでください。

${siteAnalysisInfo}

=== プロジェクト情報 ===
${projectInfo}
=== プロジェクト情報ここまで ===

作成時の重要事項:
1. 以下のテンプレートに従ってペルソナを作成し、その内容をJSONで出力してください。
2. ${initData.personaCount}人分の異なるペルソナを作成してください。各ペルソナは明確に区別できるものにしてください。
3. プロジェクト情報に記載された「想定ユーザー」を参考にしてください。

=== ペルソナ作成テンプレート ===
${personaTemplate}
=== テンプレートここまで ===

以下のJSONのみを出力してください。その他の説明やコメントは不要です。
\`\`\`json
{
    "personas": ${JSON.stringify(personaDirs)}
}
\`\`\`
`;

        if (initData.evaluationFocus && initData.evaluationFocus.length > 0) {
            prompt += `
8. 特に以下の点に注目したペルソナ設計を行ってください：
${initData.evaluationFocus.map(item => `   - ${item}`).join('\n')}
`;
        }

        // エージェントを使用してペルソナを生成
        console.log(`${initData.personaCount}人のペルソナ生成を開始します...`);

        try {
            const result = await agentGenerate(prompt, {
                toolChoice: 'none' // ツールを無効化
            });


            let personas: z.infer<typeof personasOutputSchema>;

            if (result.text.match(/```json\n([\s\S]*?)\n```/)) {
                const jsonContent = result.text.match(/```json\n([\s\S]*?)\n```/)?.[1];
                if (jsonContent) {
                    personas = JSON.parse(jsonContent);
                } else {
                    throw new Error('ペルソナ生成結果のパースに失敗しました');
                }
            } else {
                personas = JSON.parse(result.text);
            }

            if (isDevelopmentEnv()) {
                // Promise.all() で非同期処理を並列実行
                await Promise.all(personas.personas.map(async (persona) => {
                    const personaDir = persona.dirPath;
                    if (personaDir) {
                        const personaFilePath = path.join(personaDir, 'persona.md');
                        await fs.writeFile(personaFilePath, persona.content, 'utf-8');
                    }
                }));
            }

            return {
                personas: personas.personas
            };
        } catch (error) {
            console.error('⚠️ ペルソナ生成に失敗しました:', error);
            throw error;
        }
    }
});