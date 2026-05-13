# How-To: Undo/Redo 対応コマンドを追加する

`CommandHistory` に積む `Command` を新たに実装する手順。
`commandHistory.execute()` に渡すだけで Undo/Redo が自動的に動く。

---

## 変更ファイルと手順

### Step 1: `src/domain/commands.ts` — Command クラスを実装

`Command` インターフェースを実装するクラスを追加:

```ts
export class RenameTableCommand implements Command {
  description = '`テーブル名を変更`';

  constructor(
    private oldName: string,
    private newName: string,
    private setter: (name: string) => void,
  ) {}

  execute(): void {
    this.setter(this.newName);
  }

  undo(): void {
    this.setter(this.oldName);
  }
}
```

**設計のポイント**:
- `execute()` と `undo()` は互いに逆操作になるように実装する
- 状態の変更は必ずコンストラクタで受け取った `setter` 関数経由で行う（純粋性を保つ）
- `description` はデバッグ・ログ用の文字列（ユーザー表示はしていない）

**既存パターンの参考**:
- 単一セル: `EditCellCommand` — `getter`/`setter` の関数ペアで古い値を自動保存
- 複数操作まとめ: `CompositeCommand` — `Command[]` を受け取り `undo` は逆順実行

---

### Step 2: `src/stores/project.store.ts` — commandHistory.execute() を呼ぶ

ストアのアクション内で `commandHistory.execute()` に新コマンドを渡す:

```ts
// project.store.ts 内のアクション
renameTable: (oldName: string, newName: string) => {
  const setter = (name: string) => {
    set((state) => {
      // 実際の状態更新ロジック
      state.project.tables = state.project.tables.map(
        (t) => (t === oldName ? name : t)
      );
    });
  };
  commandHistory.execute(new RenameTableCommand(oldName, newName, setter));
  useCommandHistoryStore.getState().sync();  // ← 必須: canUndo/canRedo を React に反映
},
```

**`sync()` の呼び出しを忘れない**: `commandHistory` は Zustand の外にあるシングルトンなので、`execute()`/`undo()`/`redo()` の後に `useCommandHistoryStore.getState().sync()` を呼ばないと `canUndo`/`canRedo` が更新されない。

---

### Step 3: 呼び出し側（コンポーネント / ショートカット）を接続

```tsx
// EditorPage.tsx などから
const { renameTable } = useProjectStore();
renameTable('enemy', 'monster');
```

Ctrl+Z は `EditorPage.tsx` で `undo()` を呼ぶグローバルハンドラーが既に存在する。
新コマンドを `commandHistory` に積むだけで自動的に Ctrl+Z で取り消せる。

---

## CompositeCommand を使う場合

複数の変更を 1 回の Undo でまとめて戻したいとき:

```ts
const cmds = selectedRows.map(
  (row) => new EditCellCommand(row._id, colKey, row[colKey], newValue, setter)
);
commandHistory.execute(new CompositeCommand(cmds, 'セル一括変更'));
useCommandHistoryStore.getState().sync();
```

`CompositeCommand` は `undo()` 時にコマンドを**逆順**で実行する。

---

## 確認チェックリスト

- [ ] 操作後 Ctrl+Z で取り消せる
- [ ] Ctrl+Z 後 Ctrl+Y でやり直せる
- [ ] `undo` の後の状態が `execute` 前と一致する
- [ ] `tests/domain/commands.test.ts` に新コマンドのユニットテストを追加

---

## 落とし穴

- `sync()` を呼び忘れると Ctrl+Z ボタンの有効/無効が更新されない（Undo は動くが UI が壊れる）
- `undo()` の実装で `execute()` と同じ setter を使う場合、古い値を `constructor` で保存しておくこと（`EditCellCommand` が `getter` を受け取るのはこのため）
- `loadProject()` 後は `commandHistory.clear()` が呼ばれ履歴がリセットされる

→ [[concepts/Gotchas]] — その他の落とし穴
→ [[concepts/Undo_Redo]] — CommandHistory の設計詳細

---

## 関連

- [[summaries/src-domain]] — `Command` / `CommandHistory` / `EditCellCommand` の実装
- [[summaries/src-stores]] — `commandHistory.execute()` を呼ぶストア側のパターン
- [[concepts/Undo_Redo]] — Undo/Redo の全体像
