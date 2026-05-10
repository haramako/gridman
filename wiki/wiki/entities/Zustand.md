# Zustand

React 向けの軽量状態管理ライブラリ。Redux より少ないボイラープレートで、Zustand のストアは React コンポーネント外からも `getState()` / `setState()` で直接アクセスできる。

Gridman では 3 ストア体制で使用。詳細は [[concepts/architecture/Stores]] を参照。

**Gridman での特徴的な使い方**:
- `useSelectionStore.getState()` — Ctrl+Z ハンドラで `editingCell` を同期的に確認（React の再レンダリングを待たずに参照）
- ストアの外でも `commandHistory` シングルトン経由で状態を変更し、Zustand の `set` で反映する
