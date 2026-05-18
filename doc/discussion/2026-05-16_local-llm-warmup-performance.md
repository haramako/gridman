# ローカル LLM の warmup 遅延調査（Gemma 4 vs Qwen3）

**日付**: 2026-05-16  
**関連ファイル**: なし（ツール・環境の調査）

## 相談内容

Ryzen AI Max+ PRO 395（Strix Halo）+ 128GB RAM + Windows 上の ollama で
`gemma4:31b` を使っていると、warmup が異常に遅い。
GPU 使用率が 100% と 0% を行き来する挙動が見られた。
一方、`qwen3.6:35b` は同条件でも遅くない印象があった。

実際の使用場面は OpenCode で 20K トークン程度のウィンドウが乗った状態で
次の応答を待つとき（コールドスタートではない）。

## 検討した選択肢（仮説）

1. GPU/CPU 分割推論になっている
2. KV キャッシュが大きすぎる（コンテキスト長の問題）
3. AMD GPU の JIT シェーダーコンパイル
4. コールドスタートの I/O 時間

## 決定事項（調査結果）

1. **GPU 分割ではなかった** — `ollama ps` で `100% GPU` を確認。全レイヤーが GPU 上にある。

2. **KV キャッシュは一因だが本質ではなかった** — 262K → 65K に削減してもサイズ差（47GB→30GB）はあったが warmup は同程度に遅かった。Qwen3 は KV heads が 8（GQA 積極活用）で KV キャッシュが半分程度。

3. **コールドスタートは公平な比較ではなかった** — Qwen3 が速く見えたのは GPU にロード済みだったため。コールドスタートを揃えると両者とも 15〜18 秒で同程度。

4. **本質的な原因：プリフィルの計算量 × FlashAttention 未使用** — 実際の遅延は 20K トークンのコンテキストをプリフィルする際に発生。Gemma 4 はハイブリッド Attention（Global + Local 交互）を持ち、Global 層が O(n²) の計算を必要とする。CUDA では FlashAttention で緩和されるが、Windows + ROCm では FlashAttention が機能していない可能性が高く、naive O(n²) 実装になっている。GPU 100%/0% の波は Global/Local attention 層の交互処理がそのまま現れたもの。

5. **Qwen3 が速い理由** — KV heads が 8 と少ない GQA により、同じ全体 attention でも計算量が少ない。

6. **FlashAttention 非使用が仮説から裏付けのある事実へ（Web 調査）** — 以下が確認された：
   - Strix Halo (gfx1151) は ollama 0.18 以降で GPU 検出問題があり、2026年1月時点では **Vulkan バックエンドが推奨**されている（[issue #15336](https://github.com/ollama/ollama/issues/15336)）
   - Vulkan バックエンドでは FlashAttention は**明示的に非サポート**（"flash attention enabled but not supported by gpu"）（[issue #12928](https://github.com/ollama/ollama/issues/12928)）
   - ROCm + gfx1151 で FlashAttention を有効にするには `-DGGML_HIP_ROCWMMA_FATTN=ON -DAMDGPU_TARGETS="gfx1151"` でのカスタムビルドが必要で、公式バイナリには含まれない（[issue #14855](https://github.com/ollama/ollama/issues/14855)）
   - いずれのケースでも通常インストールでは FlashAttention は無効

## 変更されたファイル

なし（調査・情報収集のみ）

## Linux / WSL2 での状況（追記）

Linux では状況が大きく異なる：

- AMD が ROCm 7.1.1 で **gfx1151 向けビルド済み llama.cpp バイナリを公式提供**（Ubuntu 24.04）
- FlashAttention 有効ビルドのコマンドも確立済み：  
  `cmake -B rocm -DGGML_HIP=ON -DGGML_HIP_ROCWMMA_FATTN=ON -DAMDGPU_TARGETS="gfx1151"`
- 実績: ROCm + Linux で **30B モデル 40 tok/s**（Vulkan/Windows は「ハングまたはクラッシュ」と比較）
- Known-Good な構成が llama.cpp Discussion #20856 で文書化済み

**WSL2 という選択肢**：Windows のまま AMD GPU を WSL2 から ROCm で使えるため、Linux の恩恵をそのまま受けられる可能性がある。

## 未解決・持ち越し

- `OLLAMA_DEBUG=1` ログで Vulkan / ROCm どちらのバックエンドか確認する
- WSL2 + ROCm で速度改善するか試す（まず最初のステップとして現実的）
- Gemma 4 の長コンテキスト作業では Qwen3 を優先的に使う運用を試す
- ROCm 公式バイナリへの gfx1151 FlashAttention 統合（Windows）は上流待ち
