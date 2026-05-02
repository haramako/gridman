# 設計決定事項まとめ

要件 (`plan/index.md`) をもとに、主要な設計判断をまとめる。
各項目の詳細は個別ドキュメントを参照。

## 決定事項一覧

| 領域 | 決定 | 詳細 |
|------|------|------|
| **ファイル形式** | JSONL (1行1行) per table + schema JSON | [data-model.md](./data-model.md) |
| **フロントエンド** | Vite + React + TypeScript | [tech-stack.md](./tech-stack.md) |
| **状態管理** | Zustand | [tech-stack.md](./tech-stack.md) |
| **UIライブラリ** | Tailwind CSS + shadcn/ui | [tech-stack.md](./tech-stack.md) |
| **グリッド** | カスタム実装 (react-window 継続) | [tech-stack.md](./tech-stack.md) |
| **バックエンド** | Hono.js (Node/Bun) | [tech-stack.md](./tech-stack.md) |
| **アーキテクチャ** | SPA + ローカルサーバー / File System Access API | [architecture.md](./architecture.md) |
| **ビューシステム** | 宣言的クエリ定義 (Filter / Union / Join) | [view-system.md](./view-system.md) |
| **UI構成** | 3ペイン + タブ切り替えビュー | [ui-layout.md](./ui-layout.md) |

## 要件と設計の対応

| 要件 | 対応する設計 |
|------|-------------|
| Excelライクなインターフェース | カスタムスプレッドシートグリッド（react-window）|
| gitで管理しやすいファイル | JSONL形式（1行=1行 → diffが行単位）|
| ローカル/Web両対応 | Vite SPA + Honoサーバー / File System Access API |
| バリデーション違反を拒否しない | ソフトバリデーション（dirty state管理）|
| 行のユニークID + name表示 | GUIDベース行管理 + 参照解決レイヤー |
| 構造化データカラム | JSON列型 + インラインエディター |
| 複数ビュー（表形式/ページ形式）| ViewDefinitionクエリ + Page/Card view |
| 複数テーブル + Union/Join | ビューシステムのJoin/Unionクエリ |
| テーブル横断検索 | 全テーブルを対象にした検索インデックス |

## 未決定・要確認事項

- [x] ページ/カードビューのレイアウトはユーザー定義可能にするか（固定か）
> ページ/カードビューは、ユーザー定義可能とします。ただし、最初のうちはGUIでの操作ではなく、JSONやなんらかのスクリプトによる定義とします

**決定: JSONテンプレート形式でレイアウトを定義する。** 詳細は [ui-layout.md](./ui-layout.md) を参照。

- [x] Joinビューの編集可否ルール（どこまで編集を許可するか）
> 単純なJoin(たとえば集計などのgroup化を伴わない)ものに関しては、編集可能としたい。詳細はこれから話して決めましょう

**決定: 単純な外部キー参照（1対1 / 多対1）のみ編集可能。共有参照の伝搬は行う（ユーザーへの注意喚起あり）。** 詳細は [view-system.md](./view-system.md) を参照。

- [ ] スキーマ編集UIの優先度（MVPに含めるか）
> MVPには含めません。JSONや独自の定義言語で作成とします

- [ ] Web版でのファイル保存先（サーバーのディレクトリ？DB？）
> Web版もローカル版と同じくファイルで保存とします。DBへの展開も将来的には想定してください

- [x] 複数ユーザーの同時編集は必要か
> これもMVPには含めません。Web版でも複数ユーザーは同時に編集せず、各人が分離した環境でデータの編集を行い、ある時点でコミットやマージを行うイメージです

**決定: アプリはファイル編集に専念。git操作（コミット・マージ）はターミナル/Gitクライアントに委ねる。** JSONL形式のgit-friendly設計がその基盤を担う。

