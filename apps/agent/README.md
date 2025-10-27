# Mastra UX評価エージェント・ワークフロー

UX評価を自動化するMastraベースのエージェント・ワークフローです。

## 🚀 概要

このプロジェクトは、以下の機能を提供します：

- **UX評価エージェント**: Claude 4 Sonnetモデルを活用し、ペルソナベースのUX評価を行う専門エージェント
- **UX評価ワークフロー**: 5段階の包括的なUX評価プロセス
- **評価ツール**: 日付取得、ノート管理、Playwright自動化など

## 📋 ワークフロー構成

### 1. 評価環境のセットアップ
- 評価結果保存フォルダの作成
- ペルソナ・ジャーニーテンプレート取得

### 2. ペルソナの管理
- ペルソナファイルの生成・保存

### 3. ユーザージャーニーの作成
- 各ペルソナのジャーニーマップ作成
- ページアクセス順序の設計

### 4. UX評価の実行
- 第一印象、ユーザビリティ、デザイン、ペルソナ適合性の評価
- 各ペルソナの詳細評価レポート作成

### 5. 総合レポートの作成
- 評価サマリーの生成
- 改善提案の整理

## 🛠️ セットアップ

### 前提条件
- Node.js 20.9.0以上
- npm または yarn

### インストール
```bash
npm install
```

### 環境設定
```bash
# AWSクレデンシャルの設定（Bedrock使用）
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
```

## 📖 使用方法

### 1. 開発環境の実行
```bash
npm run dev
```

### 2. プログラムからの使用

#### ワークフロー実行
```typescript
import { runUxEvaluation } from './src/mastra';

const result = await runUxEvaluation({
  targetUrl: 'http://localhost:3000/',
  projectRoot: '/path/to/project',
  useExistingPersonas: false,
  personaCount: 2,
  evaluationFocus: ['ユーザビリティ', 'デザイン']
});

console.log('評価フォルダ:', result.evaluationFolder);
console.log('評価結果数:', result.evaluationResults.length);
```

#### エージェント単体使用
```typescript
import { askUxAgent } from './src/mastra';

const response = await askUxAgent('UX評価のポイントを教えてください');
console.log(response.text);
```

### 3. Mastraワークフローとして実行
```typescript
import { mastra } from './src/mastra';

const run = await mastra.getWorkflow("uxEvaluationWorkflow").createRunAsync();
const result = await run.start({
  inputData: {
    targetUrl: 'http://localhost:3000/',
    projectRoot: '/path/to/project',
    useExistingPersonas: false,
    personaCount: 2,
    evaluationFocus: ['ユーザビリティ']
  }
});
```

## 📊 出力仕様

評価結果は指定したプロジェクトルートの `ux-results/[yyyyMMddHHmm]/` に以下のファイルが生成されます：

### 生成ファイル
- `evaluation-summary.md`: 評価サマリー
- `persona[N].md`: 各ペルソナの詳細
- `persona[N]_journey.md`: 各ペルソナのユーザージャーニー
- `ux-eval-[ペルソナ名].md`: 各ペルソナのUX評価結果

### 評価項目
1. **第一印象**: 信頼性、専門性、親しみやすさ、現代性
2. **ユーザビリティ**: ナビゲーション、情報発見性、読みやすさ、アクセシビリティ
3. **デザイン**: 視覚的魅力、一貫性、レスポンシブ対応
4. **ペルソナ適合性**: ニーズ充足度、適切性
5. **操作性**: クリック・タップ操作、予測可能性、誤操作防止

## 🏗️ アーキテクチャ

```
agent/
├── src/
│   ├── mastra/
│   │   ├── agents/
│   │   │   ├── tiny-agent.ts            # 軽量エージェント
│   │   │   └── ux-evaluation-agent.ts   # UX評価エージェント
│   │   ├── workflows/
│   │   │   └── ux-evaluation-workflow.ts # UX評価ワークフロー
│   │   ├── tools/
│   │   │   ├── date-tool.ts             # 日付取得ツール
│   │   │   └── note-tool.ts             # ノート管理ツール
│   │   ├── mcp/
│   │   │   └── client.ts                # MCP連携クライアント 
│   │   ├── models/
│   │   │   └── index.ts                 # AWS Bedrock設定
│   │   └── index.ts                     # Mastraインスタンス
│   └── notes/                           # テンプレートファイル
│       ├── persona-creation-template.md # ペルソナテンプレート
│       ├── user-journey-template.md     # ジャーニーテンプレート
│       └── ux-evaluation-template.md    # UX評価テンプレート
├── package.json
└── README.md
```

## 🔧 カスタマイズ

### ペルソナのカスタマイズ
`src/mastra/workflows/ux-evaluation-workflow.ts` の `managePersonasStep` でペルソナ設定を変更できます。

### 評価項目の変更
`src/notes/*.md` テンプレートを編集して評価項目や基準を調整できます。

### モデルの変更
`src/mastra/models/index.ts` で使用するモデルを変更できます。

## 🐛 トラブルシューティング

### よくある問題

1. **AWS認証エラー**
   - AWSクレデンシャルが正しく設定されているか確認
   - Bedrockサービスが有効になっているか確認

2. **ファイル作成エラー**
   - プロジェクトルートパスが正しいか確認
   - 書き込み権限があるか確認

3. **ワークフロー実行エラー**
   - 入力パラメータの型が正しいか確認
   - 必須パラメータが設定されているか確認

### ログ確認
```bash
# デバッグモードでの実行
DEBUG=* npm run dev
```

## エラーハンドリング機能

このUX評価ワークフローでは、Mastraのベストプラクティスに従った包括的なエラーハンドリング機能を実装しています。

### 主な機能

#### 1. ステップ実行状態の追跡
- **StepTracker**: 各ステップの実行状態を追跡し、成功/失敗/スキップを記録
- **実行時間の測定**: 各ステップの実行時間を自動的に測定
- **詳細なログ**: 実行状況を詳細にログ出力

#### 2. 早期終了機能
- **失敗時の早期終了**: 前のステップが失敗した場合、後続のステップを適切にスキップ
- **bail()の活用**: 正常な早期終了にはMastraの`bail()`関数を使用
- **Error()の活用**: エラー時の終了にはMastraの`Error()`を使用

#### 3. コンテキストでの状態管理
- **RuntimeContext**: ステップ間でのステータス情報の受け渡し
- **ステップ結果の保存**: 各ステップの実行結果を保持し、後続ステップで参照可能
- **エラー情報の伝播**: エラー内容を適切に後続ステップに伝達

### 実装例

```typescript
// エラーハンドリング対応のステップ定義
const errorHandledStep = createStep({
    id: "error-handled-step",
    description: "エラーハンドリング対応のステップ",
    inputSchema: inputSchema,
    outputSchema: outputSchema,
    execute: async ({ inputData, runtimeContext, runId }) => {
        const tracker = new StepTracker("workflow-id", runId);
        runtimeContext?.set('stepTracker', tracker);
        
        try {
            tracker.startStep('step-name');
            
            // ステップの実行ロジック
            const result = await executeLogic(inputData);
            
            tracker.completeStep('step-name', result);
            return result;
        } catch (error) {
            tracker.failStep('step-name', error as Error);
            
            // Mastraベストプラクティス: Error()で早期終了
            throw new Error(`ステップが失敗しました: ${error.message}`);
        }
    }
});
```

### ワークフロー実行時の動作

1. **ステップ開始**: 各ステップの開始時に実行状態を記録
2. **エラー検出**: 前のステップの失敗を検出し、適切にスキップ
3. **ログ出力**: 実行状況を詳細にログ出力
4. **サマリー表示**: ワークフロー完了時に実行サマリーを表示

### ログ出力例

```
🚀 ジャーニー作成ステップを監視実行します...
✅ ジャーニー作成が完了しました
🔍 UX評価ステップを監視実行します...
✅ UX評価が完了しました
💾 結果コミットステップを監視実行します...
🎉 ワークフロー完了
ワークフロー実行結果: 総ステップ数: 3, 成功: 3, 失敗: 0, スキップ: 0
```

### エラー発生時の動作

```
🚀 ジャーニー作成ステップを監視実行します...
❌ ジャーニー作成でエラーが発生しました: API呼び出しに失敗しました
⏭️ 前のステップが失敗したため、UX評価をスキップします
🛑 ワークフローを早期終了します: 前のステップが失敗しました
```

### 設計思想

この実装は以下のMastraベストプラクティスに従います：

1. **エラーハンドリングの一貫性**: 全てのステップで統一されたエラーハンドリング
2. **適切な早期終了**: `bail()`と`Error()`の適切な使い分け
3. **状態管理**: RuntimeContextを使用したステップ間の状態共有
4. **詳細なログ**: 実行状況の透明性を確保
5. **リソース効率**: 失敗時に無駄な処理を避ける

この機能により、UX評価ワークフローは高い信頼性と可観測性を持ちながら実行されます。