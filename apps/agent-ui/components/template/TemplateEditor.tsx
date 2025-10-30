'use client';

import { useState, useEffect } from 'react';
import { getTemplate, saveTemplate } from '@/app/actions';

interface TemplateEditorProps {
    templateType: string;
    title: string;
    description: string;
}

export default function TemplateEditor({ templateType, title, description }: TemplateEditorProps) {
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveStatus, setSaveStatus] = useState<string>('');

    // テンプレートを読み込み
    useEffect(() => {
        async function loadTemplate() {
            setIsLoading(true);
            try {
                const template = await getTemplate(templateType);
                setContent(template);
            } catch (error) {
                console.error('テンプレート読み込みエラー:', error);
                setContent('# テンプレート読み込みエラー\n\nテンプレートの読み込みに失敗しました。');
            } finally {
                setIsLoading(false);
            }
        }

        loadTemplate();
    }, [templateType]);

    // テンプレートを保存
    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus('');

        try {
            await saveTemplate(templateType, content);
            setSaveStatus('success');
        } catch (error) {
            console.error('テンプレート保存エラー:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);

            // 3秒後にステータスメッセージをクリア
            setTimeout(() => {
                setSaveStatus('');
            }, 3000);
        }
    };

    return (
        <div className="space-y-4">
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                    <div className="flex flex-col items-center">
                        <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-gray-600 dark:text-gray-400">テンプレートを読み込んでいます...</p>
                    </div>
                </div>
            ) : (
                <>
                    <textarea
                        className="w-full h-96 p-4 font-mono text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        spellCheck={false}
                    />

                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`px-6 py-2 rounded-md text-white font-medium transition-colors duration-200 
                ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isSaving ? '保存中...' : '保存'}
                        </button>

                        {saveStatus === 'success' && (
                            <span className="text-green-600 dark:text-green-400">
                                ✓ テンプレートを保存しました
                            </span>
                        )}

                        {saveStatus === 'error' && (
                            <span className="text-red-600 dark:text-red-400">
                                ⚠ テンプレートの保存に失敗しました
                            </span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
} 