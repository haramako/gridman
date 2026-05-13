---
kind: ref
external_path: src/components/spreadsheet/
files:
  - SpreadsheetView.tsx        # スプレッドシート全体のルートコンポーネント（仮想スクロール統合）
  - SpreadsheetGrid.tsx        # グリッド描画・行レンダリング
  - Cell.tsx                   # セル単体（表示・編集モード切り替え）
  - DataRow.tsx                # 1 行分のセル列レンダリング
  - RowContextMenu.tsx         # 行右クリックメニュー
  - useVirtualScroll.ts        # 仮想スクロールフック
  - useKeyboardNavigation.ts   # キーボードナビゲーションフック
  - useColumnResize.ts         # カラム幅リサイズフック
---

Gridman のスプレッドシート UI コンポーネント群。仮想スクロールで大量行を効率描画し、キーボードナビゲーション・列幅リサイズ・セルインライン編集を統合する。
