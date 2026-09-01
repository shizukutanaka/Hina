# Contributing to 雛 (Hina)

## 開発環境
- ブラウザ（WebGL対応）と Node.js 18+ のみ。ビルド工程なし。
- `index.html` をブラウザで開けば動作する。

## テスト
```
node tests/run.js
```
`index.html` 内の `<script id="hina-core">` を抽出して実行する。コアロジックはDOM/WebGL非依存を維持すること。

## 視覚チェック（任意）
```
node tools/render-check.js          # 形状・被覆・対称性を13ケースで確認
node tools/render-check.js --keep   # 描画したPNGを残す
```
ジオメトリを変更した場合に推奨。playwright + Chromium が必要で、無ければ SKIP して正常終了する（必須ではない）。
色・テクスチャはソフトウェアラスタライザでは検証できないため、判定するのは「客観的に異常な状態」のみ（本体の隠蔽・空描画・極端な非対称）。

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
