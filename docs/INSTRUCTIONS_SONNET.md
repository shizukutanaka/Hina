# 雛 (Hina) 開発指示書 — Sonnet（中位モデル）向け

確立済みパターンに従う well-scoped な作業を担当する後続セッション向けの指示書。判断力を要する作業（新角度監査・core/バイナリ変更・エコシステム対応判断）は [INSTRUCTIONS_OPUS.md](INSTRUCTIONS_OPUS.md) または人間の担当。

## あなたの役割

- ドキュメント鮮度の維持（CHANGELOG・FAQ）
- 二言語ドキュメントの日英同期
- i18n キー追加とパリティ担保
- 既存パターンを模倣するテスト追加

## セッション開始時に読むもの

1. **[../CLAUDE.md](../CLAUDE.md)** — 非交渉制約が全て書いてある。違反する変更は提案も実装もしない
2. **[FEATURE_AUDIT.md](FEATURE_AUDIT.md)** の §0（現状・次の通し番号）と §6（引き継ぎ手順）
3. **[SWOT.md](SWOT.md)** の改善案表 — 自分の担当は「Sonnet」タグの行

## 作業手順（毎回この通りに）

1. `build/` 配下を編集する（`index.html` は**直接編集禁止**。生成物）
2. 結合する:
   ```
   cat build/00-head.html build/10-core-a.js build/11-core-b.js build/12-core-c.js build/20-app.js > index.html
   ```
3. `node tests/run.js` を実行 → **「0 failed」でなければコミット禁止**。自分で直せなければ**停止して報告**
4. コミット（コード変更 = `Round N:` 形式・末尾にテスト数と0 failed / docs変更 = `docs:` 形式）→ push（作業ブランチ `claude/product-swot-analysis-bozq7s` と公開 `main` の両方）

## 担当タスク

- **CHANGELOG.md**: ユーザー向け変更があったら `[Unreleased]` へ追記（Keep a Changelog 形式）
- **FAQ.md**: 新機能がユーザーから発見可能か点検し、必要なら Q&A を追加
- **二言語docs同期**: README / UPLOAD_GUIDE の日英は**同一ファイル内の相互アンカー方式**（`<a id="japanese"></a>` / `<a id="english"></a>`）。片方だけ編集したら必ずもう片方も同期する
- **SPEC.md / FAQ.md の英語化**（SWOT #4）: 上記と同じ同一ファイル+相互アンカー方式で
- **パラメータ追加を依頼されたら**: `PARAMS` スキーマ + **ja/en 両方**の i18n キーが必須（パリティテストが自動検出する。プレースホルダ `{v}` 等も両言語で一致させること）
- **エコシステム監視**（SWOT #3）: creators.vrchat.com の Performance Ranks / VRM Converter for VRChat のリリース / UniVRM のリリースを確認し、変化があれば**報告のみ**（対応判断はしない）
- **CONTRIBUTING.md の実態同期**（SWOT #7）: ブランチ戦略の記述と現運用の乖離を修正

## してはいけない変更（発見しても手を出さず報告する）

- `build/11-core-b.js`（ジオメトリ）・`build/12-core-c.js`（GLB/VRMライター）の**挙動**変更
- 1マテリアル / 1スキンメッシュ / 1プリミティブ・VRM 0.x・Quest予算に触れる一切
- 既存テストの削除や、割れたテストを**緩めて通す**こと（正しくは: コード変更に合わせてウィンドウ更新 + `RoundXXXで更新` コメント）
- FEATURE_AUDIT §4（却下済み）の再実装
- `index.html` の直接編集

## エスカレーション基準

迷ったら**停止して状況を報告**する。「たぶん大丈夫」で進めない。不変条件に関わる変更・視覚品質に関わる変更・§4の再提案は、[Opus](INSTRUCTIONS_OPUS.md) または人間の判断へ回す。
