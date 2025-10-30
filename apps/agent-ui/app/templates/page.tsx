'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TemplateEditor from '@/components/template/TemplateEditor';

// テンプレートの種類を定義
const TEMPLATE_TYPES = {
    PERSONA: 'persona',
    JOURNEY: 'journey',
    EVALUATION: 'evaluation',
    PROJECT_INFO: 'projectInfo'
};

export default function TemplatesPage() {
    const [activeTab, setActiveTab] = useState(TEMPLATE_TYPES.PERSONA);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-10">
            <div className="container mx-auto px-4">
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-3 text-gray-800 dark:text-gray-100">
                        UX評価ドキュメント管理
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                        UX評価ワークフローで使用するドキュメントを管理します。
                        各テンプレートを編集して、評価プロセスをカスタマイズできます。
                    </p>
                </header>

                <div className="max-w-5xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <Tabs defaultValue={TEMPLATE_TYPES.PERSONA} className="w-full" onValueChange={setActiveTab}>
                        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-2">
                            <TabsList className="flex space-x-2 bg-transparent">
                                <TabsTrigger
                                    value={TEMPLATE_TYPES.PERSONA}
                                    className="px-4 py-2 rounded-md data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900 dark:data-[state=active]:text-blue-300"
                                >
                                    ペルソナテンプレート
                                </TabsTrigger>
                                <TabsTrigger
                                    value={TEMPLATE_TYPES.JOURNEY}
                                    className="px-4 py-2 rounded-md data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900 dark:data-[state=active]:text-blue-300"
                                >
                                    ジャーニーテンプレート
                                </TabsTrigger>
                                <TabsTrigger
                                    value={TEMPLATE_TYPES.EVALUATION}
                                    className="px-4 py-2 rounded-md data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900 dark:data-[state=active]:text-blue-300"
                                >
                                    評価テンプレート
                                </TabsTrigger>
                                <TabsTrigger
                                    value={TEMPLATE_TYPES.PROJECT_INFO}
                                    className="px-4 py-2 rounded-md data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900 dark:data-[state=active]:text-blue-300"
                                >
                                    プロジェクト情報
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6">
                            <TabsContent value={TEMPLATE_TYPES.PERSONA}>
                                <TemplateEditor
                                    templateType={TEMPLATE_TYPES.PERSONA}
                                    title="ペルソナテンプレート"
                                    description="ユーザーペルソナを作成するためのテンプレートを編集します。このテンプレートは、対象サイトのユーザー像を具体化するために使用されます。"
                                />
                            </TabsContent>

                            <TabsContent value={TEMPLATE_TYPES.JOURNEY}>
                                <TemplateEditor
                                    templateType={TEMPLATE_TYPES.JOURNEY}
                                    title="ユーザージャーニーテンプレート"
                                    description="ユーザージャーニーマップを作成するためのテンプレートを編集します。このテンプレートは、ペルソナがサイトをどのように体験するかを記録するために使用されます。"
                                />
                            </TabsContent>

                            <TabsContent value={TEMPLATE_TYPES.EVALUATION}>
                                <TemplateEditor
                                    templateType={TEMPLATE_TYPES.EVALUATION}
                                    title="評価テンプレート"
                                    description="UX評価レポートを作成するためのテンプレートを編集します。このテンプレートは、サイトのUXを評価し、改善点を提案するために使用されます。"
                                />
                            </TabsContent>

                            <TabsContent value={TEMPLATE_TYPES.PROJECT_INFO}>
                                <TemplateEditor
                                    templateType={TEMPLATE_TYPES.PROJECT_INFO}
                                    title="プロジェクト情報"
                                    description="評価対象プロジェクトの基本情報を編集します。サービスの概要や目的、対象ユーザーなどの情報を含めることで、より的確な評価が可能になります。"
                                />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>

            <footer className="mt-20 pb-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                <p>© 2025 Mastra AI デモアプリケーション</p>
                <p className="mt-2">UX評価エージェントとワークフローの技術デモンストレーション</p>
            </footer>
        </div>
    );
} 