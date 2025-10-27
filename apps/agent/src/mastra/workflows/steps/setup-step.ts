import { createStep } from '@mastra/core';
import fs from 'fs/promises';
import path from 'path';
import {
    isDevelopmentEnv,
    uxEvaluationWorkflowSchema,
    setupStepOutputSchema
} from '../schemas/ux-evaluation.schemas';

// ステップ1: 評価の初期設定
export const setupStep = createStep({
    id: "setup",
    description: "評価の初期設定",
    inputSchema: uxEvaluationWorkflowSchema,
    outputSchema: setupStepOutputSchema,
    execute: async ({ inputData }) => {
        console.log('🛠️ Step 1: 評価の初期設定');

        const now = new Date();

        // 固定フォーマット: yyyyMMddhhmm
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');

        const timestamp = `${year}${month}${day}${hour}${minute}`;

        const evaluationFolder = path.join(inputData.projectRoot, 'ux-results', timestamp);
        const personaDirs = [];

        // 開発環境の場合のみフォルダ作成
        if (isDevelopmentEnv()) {
            try {
                // メインの評価フォルダを作成
                await fs.mkdir(evaluationFolder, { recursive: true });
                console.log(`✅ 評価フォルダを作成しました: ${evaluationFolder}`);

                // 各ペルソナ用のサブディレクトリを作成
                for (let i = 1; i <= inputData.personaCount; i++) {
                    const personaId = `persona${i}`;
                    const personaDirPath = path.join(evaluationFolder, personaId);
                    await fs.mkdir(personaDirPath, { recursive: true });
                    personaDirs.push({
                        id: personaId,
                        dirPath: personaDirPath
                    });
                    console.log(`📁 ペルソナ「${personaId}」のディレクトリを作成しました: ${personaDirPath}`);
                }
            } catch (error) {
                console.error('⚠️ 評価フォルダの作成に失敗しました:', error);
            }
        } else {
            console.log('📄 本番環境: ファイル作成をスキップします');
        }

        return {
            ...inputData,
            evaluationFolder,
            timestamp,
            setupComplete: true,
            personaDirs
        };
    }
}); 