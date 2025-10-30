import UxEvaluationForm from '@/components/evaluation/UxEvaluationForm';
import AgentChat from '@/components/chat/AgentChat';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="mx-auto w-full max-w-5xl px-5 py-12">
        <header className="mb-12 text-left">
          <h1 className="text-3xl font-semibold tracking-tight">UX評価ワークフローデモ</h1>
          <p className="mt-3 max-w-2xl text-base text-neutral-600 dark:text-neutral-300">
            Mastra AIエージェントを使用したUXの自動評価システム。ウェブサイトの分析、ペルソナ作成、ユーザージャーニーの評価を自動で実行します。
          </p>
        </header>

        <div className="grid grid-cols-1 gap-10">
          <section className="lg:order-1">
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">UX評価を開始</h2>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
              評価したいウェブサイトのURLを入力し、オプションを設定してUX評価ワークフローを実行します。AIがサイトを分析し、ユーザー視点での評価結果を提供します。
            </p>
            <UxEvaluationForm />

            <div className="mt-6">
              <Link
                href="/templates"
                className="inline-flex items-center text-sm font-medium text-neutral-700 underline underline-offset-4 hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-white"
              >
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

      <footer className="mx-auto mt-16 w-full max-w-5xl px-5 pb-10 text-left text-xs text-neutral-500 dark:text-neutral-400">
        <p>© 2025 Mastra AI デモアプリケーション</p>
        <p className="mt-1">UX評価エージェントとワークフローの技術デモンストレーション</p>
      </footer>
    </div>
  );
}
