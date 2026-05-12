```json
{
  "identifier": "LIN-22",
  "title": "[TML] 不正なカラー値のサイレント変換に警告がない",
  "status": "in_review",
  "run_count": 6,
  "total_tokens": 8772141,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": ["spec-design-change", "env-url-config"],
  "patterns": ["spec-design-change", "env-url-config"],
  "countermeasure": "none",
  "written_at": "2026-05-12"
}
```

# LIN-22: [TML] 不正なカラー値のサイレント変換に警告がない

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | (初回実行) |
| 2 | completed | コールバック設計変更依頼（WarnCallback → ログレベル+文字列の統一コールバック）|
| 3 | completed | ブランチへの push 依頼 |
| 4 | completed | 「Dropboxのファイルへのfind.exeについて」確認 |
| 5 | completed | URL設定ミス修正・タスク継続依頼 |
| 6 | completed | URL再設定後の確認 |

## 観察

### 実装後にコールバック設計を変更
Run2のトリガー「WarnCallbackではなく、ログレベル・文字列を引数とする一つのコールバックにしてください」が示すように、初回実装後にインターフェース設計の変更が発生した。issueの説明に設計方針（コールバックの形）が含まれていなかった。

### URL/接続設定ミスで2回詰まる
Run5・6はユーザー側のリポジトリURL設定ミスが原因。設定を修正してから再依頼する必要があった。エージェントはエラーを検知したが、設定変更はユーザーにしかできない。

### セキュリティ懸念の確認
Run4では「Dropboxのファイルに対してfind.exeを実行したか？」という確認が入った。エージェントがプロジェクト外ディレクトリをスキャンした可能性への懸念をユーザーが感知したケース。

## 教訓

1. **コールバック/インターフェース設計はissue記述に含める**。「警告を出す」だけでは実装者（AI）が設計判断し、後で変更になりやすい。
2. **外部リポジトリへのアクセス設定はタスク開始前に動作確認**する。接続失敗は実装と無関係な run 増加を招く。
3. エージェントのファイルアクセス範囲はプロジェクトディレクトリに限定されるよう AGENTS.md でスコープを明示すると、不意のアクセスを防げる。
