# Lint 対応方針

## 背景

Biome (`npx biome check src server`) により 133 件の lint エラーが検出された。

## エラー内訳 (カテゴリ別)

| 件数 | カテゴリ | 内容 |
|---|---|---|
| 38 | format | セミコロン欠落、トレイリングカンマ、改行 |
| 22 | a11y/useButtonType | button に `type` 属性がない |
| 21 | organizeImports | import の並び順 |
| 15 | style/noNonNullAssertion | `!` 非nullアサーションの使用 |
| 5 | a11y/noLabelWithoutControl | label と input の関連付けなし |
| 5 | suspicious/noExplicitAny | `any` 型の使用 |
| 4 | a11y/noAutofocus | autoFocus 属性 |
| 4 | correctness/useExhaustiveDependencies | useEffect の依存配列不足 |
| 4 | suspicious/noGlobalIsNan | グローバル `isNaN` の使用 |
| 3 | complexity/noForEach | for...of 推奨 |
| 3 | a11y/useKeyWithClickEvents | クリックイベントにキーボードハンドラなし |
| 2 | style/useTemplate | テンプレートリテラル推奨 |
| 2 | performance/noDelete | `delete` 演算子の使用 |
| 2 | style/useNumberNamespace | `Number.isNaN` / `Number.isFinite` 推奨 |
| 1 | style/noUselessElse | 不要な else |
| 1 | a11y/noNoninteractiveTabindex | 非インタラクティブ要素の tabindex |
| 1 | a11y/useSemanticElements | セマンティック要素推奨 |
| **133** | **合計** | |

## 検討した対応方針

### A. 全自動修正 (`biome check --write --unsafe`)
format / organizeImports / noAutofocus が自動修正される。
- Pros: 最小工数で lint 通過、フォーマット統一
- Cons: autoFocus 除去による UX 低下リスク、設計判断が必要な問題 (noExplicitAny など) が残る

### B. フォーマットのみ即適用＋lintルールは段階的対応
format + organizeImports を先に修正し、残りは優先度・工数を見ながら対応。
- Pros: リスクが低い、フォーマットの一貫性がすぐ得られる
- Cons: 完全通過までは継続的対応が必要

### C. Biome 設定で問題の多いルールを無効化
biome.json で件数の多いルールを緩和する。
- Pros: 最小コード変更で通過、プロジェクト実情に合わせられる
- Cons: アクセシビリティや型安全性のベストプラクティスを放棄

### D. 全件手動修正
133 件すべてを手動で確認しながら修正。
- Pros: 最も品質が高い
- Cons: 非常に工数がかかる

### 推奨: A+B のハイブリッド

## 実施した対応

### Step 1: 安全な自動修正 (format + organizeImports)
`npx biome check --write src server` で 39 ファイルのフォーマットと import 順を自動修正した。

### Step 2 (P0): 重要ルールの手動修正
- **useButtonType (22件)**: `<button>` に `type="button"` を追加。フォーム内で意図しない submit を防止。
- **noLabelWithoutControl (5件)**: `<label>` に `htmlFor` + 対応する `id` を追加。

### 残課題 (優先度順)

| 優先度 | ルール | 件数 | 対応方針 |
|---|---|---|---|
| P1 | noAutofocus | 4 | biome.json で `"noAutofocus": "off"` にする。ダイアログで autoFocus は一般的な UX パターンであり、ESLint の jsx-a11y/no-autofocus でも `"ignoreNonDOM": true` で許可されるケースのため。 |
| P1 | noExplicitAny | 5 | 型安全性向上に寄与するため、適切な型に置き換える |
| P1 | noNonNullAssertion | 15 | `?.` や型ガードに置き換える |
| P2 | noForEach / useTemplate / useExhaustiveDependencies / noDelete / useNumberNamespace / noUselessElse | 15 | リファクタリングレベルで対応 |
| P3 | useKeyWithClickEvents / useSemanticElements / noNoninteractiveTabindex | 5 | アクセシビリティ強化として対応 |
| P3 | noGlobalIsNan | 4 | Biome のデフォルト推奨だが、現状動作に問題なし |

## noAutofocus について

`a11y/noAutofocus` は WAI-ARIA オーサリングプラクティスに基づくアクセシビリティルールである。自動フォーカスによりスクリーンリーダーの読み上げ位置が突然移動し、ユーザーが現在位置を見失うリスクがあるため。

ただし、ダイアログ内の入力欄に `autoFocus` をつけるのは「ユーザーが自らそのダイアログを開いた」という明確な意図があるため一般的なパターンである。Biome には `"ignoreNonDOM"` 相当のオプションがないため、`biome.json` で無効化するのが現実的な判断となる。
