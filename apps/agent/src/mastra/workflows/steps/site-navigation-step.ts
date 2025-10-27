import { createStep } from '@mastra/core';
import { chromium } from 'playwright';
import { generate as pageSearchGenerate } from '../../agents/crawl-agent';
import {
    setupStepOutputSchema,
    siteNavigationStepOutputSchema,
    SiteNavigationResult
} from '../schemas/ux-evaluation.schemas';

// ステップ2: サイト回遊
export const siteNavigationStep = createStep({
    id: "site-navigation",
    description: "Playwrightを使用したサイト回遊",
    inputSchema: setupStepOutputSchema,
    outputSchema: siteNavigationStepOutputSchema,
    execute: async ({ inputData, getInitData }) => {
        const initData = await getInitData();
        const targetUrl = initData.targetUrl;
        console.log('🌐 Step 2: Playwrightによるサイト回遊');

        // サイト回遊用の簡略化されたプロンプト - ペルソナ作成とユーザージャーニーに必要な情報に絞る
        console.log(`🌐 Playwrightによる基本サイト分析を開始します: ${targetUrl}`);
        let siteNavigation: SiteNavigationResult = {
            siteName: '', // デフォルト値を設定
            purpose: '', // デフォルト値を設定
            targetUsers: '', // デフォルト値を設定
            valueProposition: '', // デフォルト値を設定
            pages: [],
        };

        let navLinks: { href: string; text: string }[] = [];

        try {
            // Playwrightを使用してナビゲーションリンクを確実に取得
            console.log(`🚀 Playwrightでナビゲーションリンクを取得します: ${targetUrl}`);
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            console.log(`🔗 ページを開きます: ${targetUrl}`);
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            navLinks = await page.evaluate((baseUrl) => {
                const links: { href: string; text: string }[] = [];
                document.querySelectorAll('nav a').forEach(anchor => {
                    if (anchor instanceof HTMLAnchorElement && anchor.href && anchor.textContent?.trim()) {
                        try {
                            const url = new URL(anchor.href, baseUrl).href;

                            // javascript: から始まるリンクは除外
                            if (url.startsWith('http') && !url.includes('javascript:')) {
                                links.push({
                                    href: url,
                                    text: anchor.textContent.trim()
                                });
                            }
                        } catch (e) {
                            // 無効なURLは無視
                        }
                    }
                });
                // hrefをキーにして重複を削除
                return [...new Map(links.map(item => [item.href, item])).values()];
            }, targetUrl);

            await browser.close();
            console.log(`🔗 取得したナビゲーションリンク (${navLinks.length}件):`, navLinks);
        } catch (error) {
            console.error('⚠️ サイト回遊中にエラーが発生しました:', error);
        }

        // 専用のページ回遊エージェントを使用
        const navigationPrompt = `
対象サイト: ${targetUrl}

以下のナビゲーションリンクのリストを分析し、サイト全体の情報と、**各リンク先の内容を要約した説明**を生成してください。

分析対象のナビゲーションリンク:
${navLinks.map(link => `- [${link.text}](${link.href})`).join('\n')}

**重要事項:**
- URLに \`#\` が含まれている場合、それはページ内の一部分（セクション）を指しています。その場合は、ページ全体ではなく、**その特定のセクションの内容を中心に要約してください**。例えば、\`#newsInner\` というリンクであれば、ニュースのセクションについて説明してください。
- 外部サイトへのリンク（資料請求、問い合わせフォームなど）の場合も、そのページの目的を簡潔に説明してください。

以下のJSONスキーマに厳密に従った形式で情報を返してください。\`pages\` 配列は、提供されたナビゲーションリンクのリストと**同じ順序・同じ数**で返してください。
\`\`\`json
{
  "siteName": "サイトの名前",
  "purpose": "サイトの主な目的",
  "targetUsers": "サイトのターゲットユーザー",
  "valueProposition": "サイトの価値提案",
  "pages": [
    {
      "title": "ページのタイトル",
      "description": "ページの説明",
      "url": "ページのURL"
    },
  ]
}
\`\`\`
`;

        // 専用のページ回遊エージェントに指示を送信
        console.log(`🤖 ページ回遊エージェントにサイト分析の指示を送信します...`);

        try {
            const response = await pageSearchGenerate(navigationPrompt);

            if (response.text.match(/```json\n([\s\S]*?)\n```/)) {
                const jsonContent = response.text.match(/```json\n([\s\S]*?)\n```/)?.[1];

                if (jsonContent) {
                    siteNavigation = JSON.parse(jsonContent);
                } else {
                    throw new Error('分析結果のパースに失敗しました');
                }
            } else {
                siteNavigation = JSON.parse(response.text);
            }

            return {
                siteNavigation
            }

        } catch (error) {
            console.error('⚠️ サイト回遊中にエラーが発生しました:', error);
            throw error;
        }
    }
});