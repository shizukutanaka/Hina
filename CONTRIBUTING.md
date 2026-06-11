# Contributing to 雛 (Hina)

## 開発環境
- ブラウザ（WebGL対応）と Node.js 18+ のみ。ビルド工程なし。
- `index.html` をブラウザで開けば動作する。

## テスト
```
node tests/run.js
```
`index.html` 内の `<script id="hina-core">` を抽出して実行する。コアロジックはDOM/WebGL非依存を維持すること。

## ブランチ戦略
- `feature/<issue番号>-<説明>` / `fix/<issue番号>-<説明>` / `chore/<説明>`
- main直push禁止。PRはSquash merge。diffは500行以内。

## コミット規約
Conventional Commits（feat / fix / refactor / docs / test / chore / build / ci）。破壊的変更は `feat!:`。

## PR前チェックリスト
- [ ] `node tests/run.js` 全通過
- [ ] コアスクリプトにDOM/WebGL参照を追加していない
- [ ] 新パラメータはPARAMSスキーマ経由（min/max/def/i18n必須）
- [ ] VRM出力に影響する変更はUniVRM(Unity)での読込確認を記載
- [ ] シークレット・PII・デバッグコードなし

## Issue報告テンプレ
タイトル: `[bug|feat] 端的な説明`
本文: 概要 / 再現手順 / 期待動作vs実際 / 環境(ブラウザ・OS) / 優先度(P0-P3)
