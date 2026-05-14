# CI の強制はできているか？

**クエリ日**: 2026-05-14

## 回答

**現在、CI は「指示」ベースで存在するが、技術的な強制はない。**

### 何が "指示" されているか

AGENTS.md の「動作確認（タスク完了の必須条件）」セクションに以下が明記されている（[[concepts/agent-patterns/Regression_and_Testing]] 参照）：

```bash
npx tsc --noEmit   # 型チェック
npm run test       # ユニット・コンポーネントテスト
npm run test:e2e   # E2Eテスト
```

PR 作成前にこれらが全て通過することが必須とされている。
この記載は LIN-46 でのインシデント → LIN-78 での改善という学習ループを経て追加された
（[[concepts/agent-patterns/Regression_and_Testing]] 参照）。

### 何が「強制」できていないか

以下の仕組みは **存在しない**：

| 仕組み | 状況 |
|--------|------|
| GitHub Actions（CI/CD） | `.github/` ディレクトリなし |
| pre-commit フック（husky等） | package.json に設定なし |
| PR マージ保護ルール | 未設定（技術的にブロックされない） |

つまり、エージェントが AGENTS.md を無視すれば、テストを実行しないまま PR を出しマージすることが技術的には可能。

### まとめ

現状は「エージェントへの指示」のみで CI を担保しており、人間のレビュー時に気づくことに依存している。
`e2e-not-verified` パターンの再発リスクは、技術的ゲートがある限り残る。

## 改善案

1. **GitHub Actions を追加する** — PR 時に `npm run test` + `npx tsc --noEmit` を自動実行。E2Eは環境依存があるため optional にする選択肢もある。
2. **pre-commit フック（husky）** — コミット時に型チェックだけでも走らせる。
