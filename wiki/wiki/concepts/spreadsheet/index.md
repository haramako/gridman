# Spreadsheet

スプレッドシートビューは Gridman の中核 UI。行・列のグリッド表示とセル編集機能を提供する。

## サブページ

- [[Cell_Editing]] — セル編集フロー・dirty 追跡・commitEdit の二重防止
- [[Input_Behavior]] — キーボード・マウス入力仕様と Excel との差異

## コンポーネント構成

```
SpreadsheetView
└── SpreadsheetGrid        ← フィルタリング・ソート・仮想スクロール・キーボード処理
    └── Cell               ← 1 セルの表示・編集・バリデーション表示
```

詳細な構成は [[concepts/architecture/Component_Structure]] を参照。

## 関連

- [[concepts/Auto_Save_and_Draft]] — セル編集がトリガするドラフト保存
- [[concepts/Undo_Redo]] — Ctrl+Z / Ctrl+Y の実装
