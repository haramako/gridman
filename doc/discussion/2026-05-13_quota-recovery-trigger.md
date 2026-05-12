# quota-recovery トリガーパターンの発見と ping 採用

**日付**: 2026-05-13  
**関連ファイル**: `.claude/skills/workflow-insight/SKILL.md`, `multica-data/issue-insights/LIN-41.md`, `multica-data/issue-insights/LIN-42.md`

## 相談内容

LIN-42・LIN-41 の trigger_summary が「いかがです？」「how are you?」になっており、
「AIが実装ミスして人間がレビューした」パターンではないかと疑っていた。
調査の結果、これらは **エージェントの使用量が上限に達して停止した後、使用量が回復したタイミングで
タスクが自動再起動しないよう手動で送る確認メッセージ** であることが判明。

Multica の現状ベストプラクティスとして使われているが、通常の指示と区別がつかないため
機械的な分析では誤分類される問題があった。

## 検討した選択肢

- 「いかがです？」のままにする（現状維持）
- 専用キーワードを設ける（`ping`, `[quota-check]`, `[再開]` など）

## 決定事項

1. **`quota-recovery` を taxonomy に追加**  
   理由: platform-artifact・duplicate-trigger と同様に「実装品質とは無関係な run」として分類し、失敗率計算から除外できるようにする。

2. **quota-recovery の専用キーワードとして `ping` を採用**  
   理由: 短く・誤解がなく・`trigger_summary == "ping"` で機械的に検出できる。「いかがです？」は自然言語なので誤検出リスクがある。

3. **`ai-implementation-error` taxonomy の追加は見送り**  
   理由: 現状の8件では該当するケースが確認できなかった。メッセージログ（API 404）が読めないため判断できない。データが増えたタイミングで再検討する。

## 変更されたファイル

- `.claude/skills/workflow-insight/SKILL.md` — `quota-recovery` を taxonomy・判定キーワード表に追加
- `multica-data/issue-insights/LIN-41.md` — 新規作成（quota-recovery + platform-artifact）
- `multica-data/issue-insights/LIN-42.md` — 新規作成（quota-recovery + platform-artifact）

## 未解決・持ち越し

- Multica 側のトリガーキーワードを「いかがです？」→ `ping` に切り替える運用変更（ユーザー側の対応）
- `ai-implementation-error` の追加判断 — メッセージログにアクセスできるようになったタイミングで再検討
