'use server';

import { getAgent } from "@/lib/mastra-client";
import fs from 'fs/promises';
import path from 'path';

// テンプレートタイプのマッピング
const TEMPLATE_FILES = {
    persona: 'public/templates/persona-creation-template.md',
    journey: 'public/templates/user-journey-template.md',
    evaluation: 'public/templates/ux-evaluation-template.md',
    projectInfo: 'public/templates/project-info.md'
};

/**
 * テンプレートを取得する
 */
export async function getTemplate(templateType: string): Promise<string> {
    if (!TEMPLATE_FILES[templateType as keyof typeof TEMPLATE_FILES]) {
        throw new Error(`不明なテンプレートタイプ: ${templateType}`);
    }

    try {
        const filePath = path.resolve(process.cwd(), TEMPLATE_FILES[templateType as keyof typeof TEMPLATE_FILES]);
        const content = await fs.readFile(filePath, 'utf-8');
        return content;
    } catch (error) {
        console.error(`テンプレート読み込みエラー (${templateType}):`, error);
        throw new Error(`テンプレートの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * テンプレートを保存する
 */
export async function saveTemplate(templateType: string, content: string): Promise<void> {
    if (!TEMPLATE_FILES[templateType as keyof typeof TEMPLATE_FILES]) {
        throw new Error(`不明なテンプレートタイプ: ${templateType}`);
    }

    try {
        const filePath = path.resolve(process.cwd(), TEMPLATE_FILES[templateType as keyof typeof TEMPLATE_FILES]);
        await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
        console.error(`テンプレート保存エラー (${templateType}):`, error);
        throw new Error(`テンプレートの保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * UXエージェントに質問を投げる
 */
export async function askUxAgent(prompt: string) {
    try {
        const agent = getAgent("uxEvaluationAgent");
        const result = await agent.generate({
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        });
        return result.text;
    } catch (error) {
        console.error('❌ UXエージェントでエラーが発生しました:', error);
        throw error;
    }
}