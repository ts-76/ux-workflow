'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { askUxAgent } from '@/app/actions';

type Message = {
    role: 'user' | 'agent';
    content: string;
};

export default function AgentChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 新しいメッセージが追加されたら自動スクロール
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput('');

        // ユーザーメッセージを追加
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            // エージェントからの応答を取得
            const agentResponse = await askUxAgent(userMessage);

            // エージェント応答を追加
            setMessages(prev => [...prev, { role: 'agent', content: agentResponse }]);
        } catch (error) {
            console.error('エージェントとの会話でエラーが発生しました:', error);
            setMessages(prev => [
                ...prev,
                {
                    role: 'agent',
                    content: 'すみません、エラーが発生しました。もう一度お試しください。'
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="my-8 rounded-lg border border-neutral-200 bg-white text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
            <div className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
                UX評価エージェント
            </div>

            <div className="px-4 py-4">
                <div className="mb-4 flex h-[420px] flex-col gap-3 overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                    {messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-neutral-500 dark:text-neutral-300">
                            <p className="text-sm">UX評価エージェントにメッセージを送信してください。</p>
                            <p className="text-xs">質問例: 「このサイトのナビゲーションについて教えてください」</p>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div
                                key={index}
                                className={`w-fit max-w-[85%] rounded-md px-3 py-2 transition-opacity ${message.role === 'user'
                                        ? 'self-end bg-white text-neutral-700 dark:bg-neutral-900 dark:text-neutral-100'
                                        : 'self-start bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                            </div>
                        ))
                    )}

                    {isLoading && (
                        <div className="flex items-center justify-center px-3 py-2 text-xs text-neutral-500 dark:text-neutral-300">
                            応答を生成中...
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="メッセージを入力..."
                        className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${isLoading || !input.trim()
                                ? 'cursor-not-allowed bg-neutral-300 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
                                : 'bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-white'
                            }`}
                    >
                        送信
                    </button>
                </form>
            </div>
        </div>
    );
}