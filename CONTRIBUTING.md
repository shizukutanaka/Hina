# Contributing to 雛 (Hina)

## 開発環境
- ブラウザ（WebGL対応）と Node.js 18+ のみ。ビルド工程なし。
- `index.html` をブラウザで開けば動作する。

## テスト
```
node tests/run.js
```
`index.html` 内の `<script id="hina-core">` を抽出して実行する。コアロジックはDOM/WebGL非依存を維持すること。

## 実ブラウザチェック（任意）
```
node tools/render-check.js          # 実ブラウザでの全E2E
node tools/render-check.js --keep   # 描画したPNGを残す
```
UI・ジオメトリ・書き出しのいずれかを変更した場合に推奨。playwright + Chromium が必要で、
無ければ SKIP して正常終了する（必須ではない）。現在の検査内容:

- **形状** 13ケースの被覆率・バウンディングボックス・左右対称性
- **書き出し** ボタン→ダウンロード→GLBヘッダ検証（実ユーザー経路）
- **自己診断** `?selftest` の22項目 / **自動保存** の再読込往復
- **共有URL** `?seed=N` の再現性 / **Undo・Redo** の往復
- **読み上げ** 操作の announcement が後続の書き込みで打ち消されないこと・同一文の連続書き込みが無いこと（Round 548/549）
- **シード入力** Tab でも Enter でも入力した種が適用されること（Round 546）
- **通信ゼロ** 全タブ・ガチャ・書き出しを操作してもローカル以外へのリクエストが1件も出ないこと（Round 543）
- **キーボード** roving tabindex 4グループの Arrow/Home/End と Enter/Space（Round 542）
- **色** 書き出した `.vrm` から PNG を取り出し、`randomParams(seed)` の予言と全ブロックを照合（Round 538）

> 以前ここには「色・テクスチャはソフトウェアラスタライザでは検証できない」と書いていたが、
> これは**誤り**だった。検証できないのは**プレビュー描画の色**だけで、ユーザーが実際に見る色は
> 書き出された `.vrm` 内の PNG であり、GPU を介さず直接検査できる（Round 538）。

## 仕様準拠チェック（任意）
```
npm install --no-save gltf-validator three @pixiv/three-vrm
node tools/spec-check.js
```
書き出し18バリエーションを**公式 Khronos glTF-Validator** と **three-vrm 参照ローダー**の両方に通す。
書き出し経路を変更した場合に推奨。依存が無ければ理由を表示して正常終了する。
警告 `INVALID_EXTENSION_NAME_FORMAT` と `NODE_SKINNED_MESH_NON_ROOT` はVRM 0.xの構造に内在するもので想定内。

## ブランチ戦略
- `main` が公開ブランチ（配布物 `index.html` を含む完成状態を維持する）。
- 人間のコントリビュータ: `feature/<issue番号>-<説明>` / `fix/<issue番号>-<説明>` / `chore/<説明>` で分岐し、PR（Squash merge）で `main` へ。diffは500行以内。
- AI保守セッション: `docs/INSTRUCTIONS_OPUS.md` / `docs/INSTRUCTIONS_SONNET.md` の手順に従い、監査済みコミット（`Round N:` 形式・テスト全通過が条件）を作業ブランチと `main` の両方へ反映する運用実績がある。いずれの経路でも「テスト0失敗でなければ `main` に載せない」が不変条件。

## コミット規約
Conventional Commits（feat / fix / refactor / docs / test / chore / build / ci）。破壊的変更は `feat!:`。監査ラウンドのコミットは `Round N:` プレフィックス（docs/FEATURE_AUDIT.md の通し番号）。

## PR前チェックリスト
- [ ] `node tests/run.js` 全通過
- [ ] コアスクリプトにDOM/WebGL参照を追加していない
- [ ] 新パラメータはPARAMSスキーマ経由（min/max/def/i18n必須）
- [ ] VRM出力に影響する変更はUniVRM(Unity)での読込確認を記載
- [ ] シークレット・PII・デバッグコードなし

## Issue報告テンプレ
タイトル: `[bug|feat] 端的な説明`
本文: 概要 / 再現手順 / 期待動作vs実際 / 環境(ブラウザ・OS) / 優先度(P0-P3)
