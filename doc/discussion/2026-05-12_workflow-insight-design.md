# workflow-insight スキルの設計と countermeasure フィールド追加

**日付**: 2026-05-12  
**関連ファイル**: `.claude/skills/workflow-insight/SKILL.md`, `multica-data/issue-insights/*.md`

## 相談内容

`/workflow-insight` スキルを新規作成し、issue insight の統一フォーマット（JSON メタデータ先頭）を設計した。
その後、wiki 分析から改善提案を生成したところ、**すでに解決済みの問題（GitHub token 設定）が提案に混入**した。
「解決済みかどうかをデータで表現する方法」として何がよいかを相談。

## 検討した選択肢

- 提案生成時に手動で除外する（都度判断）
- insight ファイルに対策状況フィールドを追加してフィルタ可能にする

## 決定事項

1. **`countermeasure` フィールドを insight JSON メタデータに追加**  
   理由: 解決済み・一時的な問題をデータとして表現し、次回の改善提案生成時に自動フィルタできるようにする。

2. **`countermeasure` の値は 4 種類**（`none` / `one-time` / `in-agents-md` / `platform-fix`）  
   理由: 「未対策」「環境の一時問題」「AGENTS.md 対処済み」「プラットフォーム修正済み」を区別することで、何が本当に対策が必要かを明確にする。

3. **`doc/discussion/` を設計判断のSSoTとして設置**  
   理由: SKILL.md や insight ファイルには「何を決めたか」は反映されるが「なぜ決めたか」の理由が失われる。会話の中の判断根拠を残す場所が必要だった。

## 変更されたファイル

- `.claude/skills/workflow-insight/SKILL.md` — `countermeasure` フィールドの仕様・決定ロジック（Step 5）を追加
- `multica-data/issue-insights/LIN-{16,22,36,43,45,46,51,78}.md` — 全件に `countermeasure` を追加
- `.claude/skills/workflow-discussion/SKILL.md` — 本スキルを新規作成

## 未解決・持ち越し

- `countermeasure == "none"` の3件（LIN-22, LIN-46, LIN-51）への対策を検討する
  - LIN-22, LIN-46: issue 記述テンプレートの整備（Multica 側の対応が必要）
  - LIN-51: AGENTS.md に「横断的変更時は影響範囲をリストアップ」を追加する
- **[TODO・後回し]** モデル別分析・計画者/実装者分割の実験設計
  - 観察データが十分に蓄積されてから着手する
