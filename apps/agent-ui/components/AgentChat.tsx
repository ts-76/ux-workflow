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
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 my-8">
            <div className="bg-blue-600 dark:bg-blue-700 text-white p-4">
                <h2 className="text-xl font-semibold flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                    UX評価エージェント
                </h2>
            </div>

            <div className="p-4">
                <div className="space-y-4 h-[450px] overflow-y-auto mb-4 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            <p className="text-center">
                                UX評価エージェントにメッセージを送信してください。<br />
                                <span className="text-sm">質問例: 「このサイトのナビゲーションについて教えてください」</span>
                            </p>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div
                                key={index}
                                className={`p-4 rounded-lg transition-all duration-200 animate-fadeIn ${message.role === 'user'
                                        ? 'bg-blue-50 dark:bg-blue-900/30 ml-8 border border-blue-100 dark:border-blue-800'
                                        : 'bg-gray-100 dark:bg-gray-800 mr-8 border border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <div className="flex items-center font-semibold mb-2 text-sm">
                                    {message.role === 'user' ? (
                                        <>
                                            <div className="bg-blue-100 dark:bg-blue-800 p-1 rounded-full mr-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 dark:text-blue-300" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <span className="text-gray-700 dark:text-gray-300">あなた</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="bg-gray-200 dark:bg-gray-700 p-1 rounded-full mr-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                </svg>
                                            </div>
                                            <span className="text-gray-700 dark:text-gray-300">UX評価エージェント</span>
                                        </>
                                    )}
                                </div>
                                <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 pl-7">{message.content}</p>
                            </div>
                        ))
                    )}

                    {isLoading && (
                        <div className="flex justify-center items-center p-6 animate-pulse">
                            <div className="dot-typing"></div>
                            <span className="ml-3 text-blue-600 dark:text-blue-400">応答を生成中...</span>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="メッセージを入力..."
                        className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className={`px-5 py-3 rounded-lg text-white font-medium transition-colors duration-200 flex items-center ${isLoading || !input.trim()
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                            }`}
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <>
                                <span>送信</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>
            </div>

            <style jsx>{`
        .dot-typing {
          position: relative;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: #3b82f6;
          color: #3b82f6;
          animation: dot-typing 1s infinite linear;
        }
        
        .dot-typing::before, .dot-typing::after {
          content: '';
          display: inline-block;
          position: absolute;
          top: 0;
        }
        
        .dot-typing::before {
          left: -8px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: #3b82f6;
          color: #3b82f6;
          animation: dot-typing 1s infinite linear 0.25s;
        }
        
        .dot-typing::after {
          left: 8px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: #3b82f6;
          color: #3b82f6;
          animation: dot-typing 1s infinite linear 0.5s;
        }
        
        @keyframes dot-typing {
          0% {
            box-shadow: none;
          }
          50% {
            box-shadow: 0 0 0 1px #3b82f6;
          }
          100% {
            box-shadow: none;
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
        </div>
    );
} 