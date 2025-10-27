import UxEvaluationForm from '@/components/UxEvaluationForm';
import AgentChat from '@/components/AgentChat';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-10">
      <div className="container mx-auto px-4">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 text-gray-800 dark:text-gray-100">
            UX評価ワークフローデモ
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Mastra AIエージェントを使用したUXの自動評価システム。ウェブサイトの分析、
            ペルソナ作成、ユーザージャーニーの評価を自動で実行します。
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 max-w-7xl mx-auto">
          <section className="lg:order-1">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100 flex items-center">
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-500 dark:text-blue-300 p-2 rounded-full mr-3 inline-flex">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </span>
              UX評価を開始
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              評価したいウェブサイトのURLを入力し、オプションを設定してUX評価ワークフローを実行します。
              AIがサイトを分析し、ユーザー視点での評価結果を提供します。
            </p>
            <UxEvaluationForm />

            <div className="mt-6 text-center">
              <Link
                href="/templates"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                UX評価ドキュメントを編集する
              </Link>
            </div>
          </section>

          {/* <section className="lg:order-2">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100 flex items-center">
              <span className="bg-green-100 dark:bg-green-900 text-green-500 dark:text-green-300 p-2 rounded-full mr-3 inline-flex">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </span>
              エージェントとチャット
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              UX評価エージェントと直接会話して、ウェブサイトの設計や改善点について
              質問できます。自由に質問を入力してください。
            </p>
            <AgentChat />
          </section> */}
        </div>
      </div>

      <footer className="mt-20 pb-8 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>© 2025 Mastra AI デモアプリケーション</p>
        <p className="mt-2">UX評価エージェントとワークフローの技術デモンストレーション</p>
      </footer>
    </div>
  );
}
