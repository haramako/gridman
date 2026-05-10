# Undo / Redo

`src/domain/commands.ts` のコマンドパターンで実装。Ctrl+Z / Ctrl+Y で操作を取り消し・やり直しできる。

## CommandHistory

```ts
class CommandHistory {
  private undoStack: Command[]
  private redoStack: Command[]

  execute(cmd: Command): void  // cmd.execute() → undoStack に積む・redoStack をクリア
  undo(): void                 // undoStack.pop() → cmd.undo() → redoStack に積む
  redo(): void                 // redoStack.pop() → cmd.execute() → undoStack に積む
  clear(): void                // loadProject 時に呼ばれる
}

export const commandHistory = new CommandHistory()  // モジュールスコープのシングルトン
```

## コマンド型

```ts
class EditCellCommand implements Command {
  // コンストラクタ時に getter で prevValue をキャプチャ
  execute(): void  // setter(newValue)
  undo(): void     // setter(prevValue)
}

class CompositeCommand implements Command {
  // 複数コマンドを束ねて 1 ステップにする
  execute(): void  // commands.forEach(c => c.execute())
  undo(): void     // commands.reverse().forEach(c => c.undo())  ← 逆順
}
```

## Undo 対象の操作

| 操作 | Undo 単位 | コマンド |
|------|-----------|---------|
| セル編集（Enter/Tab/blur 確定） | 1 セル = 1 ステップ | `EditCellCommand` 相当 |
| Ctrl+V ペースト（複数セル） | 全セルまとめて 1 ステップ | `CompositeCommand` |
| Delete/Backspace（単一セル） | 1 セル = 1 ステップ | |
| 行追加 | 1 行 = 1 ステップ | |
| 行削除（複数選択） | まとめて 1 ステップ | `CompositeCommand` |

## Undo 対象外

| 操作 | 理由 |
|------|------|
| Ctrl+S（保存） | 不可逆とみなす（スタックは残る） |
| スキーマ編集 | `updateSchema` は CommandHistory を経由しない |
| ビュー設定変更 | 同上 |

## 保存後の Undo の扱い

保存（Ctrl+S）は Undo スタックをクリアしない。そのため:

```
編集 → Ctrl+S → Ctrl+Z
```

この順で操作すると、メモリ上は保存前の状態に戻るが、ファイルはすでに保存済みで乖離が生じる。`isDirty = true` になるためユーザーは再度 Ctrl+S できる。**仕様として許容**。

## スタックリセットのタイミング

- **`loadProject` 時**: `commandHistory.clear()` でスタックをクリア
- **それ以外（保存・ビュー切り替え等）**: スタックを保持

## Ctrl+Z が 2 回必要だった問題（修正済み）

Enter でセルを確定すると `onBlur` も発火し `commitEdit` が 2 回呼ばれていた。スタックに同値コマンドが 2 つ積まれ、1 回目の Undo が見た目に反映されなかった。

→ `committedRef` フラグで修正済み。詳細は [[concepts/spreadsheet/Cell_Editing]] を参照。

## 未解決課題

- **LIN-73**: Ctrl+X のカット操作が複数セルのとき 1 セルずつ Undo になる。`CompositeCommand` でまとめる必要がある。

## 関連

- [[concepts/architecture/Domain_Logic]] — `commands.ts` の実装
- [[concepts/spreadsheet/Cell_Editing]] — `updateCell` → `commandHistory.execute` の連鎖
