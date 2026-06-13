# Plan.md — 雛 (Hina) v0.1.0

## プロダクト定義（C11・全判断の基準）

このプロダクトは3Dモデリング経験のないVRChatユーザーが、ブラウザ上でパラメータ操作のみによりVRChat対応アバター（VRM 0.x）を作成・出力するための単一HTMLツールである。完全ローカル動作・外部依存ゼロ・外部送信なしを設計上の制約とする。

## 目的

VRoid/Blender/Unityの学習コストなしに、性能ランク対応済みのVRMアバターを数分で取得可能にする。既定プリセットで Quest Good（揺れ物オフで Quest Excellent）/ PC Excellent を保証する。

## スコープ

含む:
- パラメトリック人型生成（体格・顔・髪・服・色 30+パラメータ / プリセット6体 / ガチャ）
- VRM 0.x 書き出し（GLB・Humanoid 21ボーン・BlendShape 17・SpringBone・MToon単一マテリアル）
- WebGLプレビュー（CPUスキニング・トゥーン2階調・輪郭線・呼吸/瞬き/視線追従/髪Verlet物理）
- Performance Rank推定（PC/Quest 全14項目・公式2026-04基準値）
- 日英i18n / かんたん・詳細モード / JSON保存読込 / localStorage自動保存
- Nodeテストスイート（GLB構造バリデータ内蔵）+ CI

含まない（→ docs/SPEC.md §8-9 ロードマップ）:
- VRChatへの直接アップロード（規約上SDK限定・恒久非対応）
- 指ボーン・テクスチャ手描き・FBX出力・VRM 1.0・既存モデル読込

## 規模判定

XL（新プロダクト立ち上げ・推定 index.html 3500行+ / tests 500行）→ Plan.md必須・フルパイプライン。
アーキ/課金/認証変更なし → 取締役会付議は「GitHub公開可否」のみ（zip確認後にユーザー判断）。

## STRIDE（簡略適用）

完全ローカル・単一ユーザー・通信ゼロのため攻撃面は限定的。
- T(改ざん)/I(漏洩): 通信0リクエスト・PII収集なしで構造的に排除（テストでfetch/XHR文字列不在を担保）
- D: 該当なし（サーバーなし）
- 残リスク: localStorage破損 → try/catchで黙ってスキップ（F-012）

## フェーズ + DoD

| # | フェーズ | DoD | 状態 |
|---|---------|-----|------|
| P1 | 調査 | Rank表（公式2026-04）・VRM0座標仕様（Z-向き/右=+X）確定 | 完了 |
| P2 | 完成形ドキュメント | README/SPEC/FAQ/UPLOAD_GUIDE/ADR/LICENSE/CONTRIBUTING/SECURITY/CHANGELOG/CI | 完了 |
| P3 | Plan.md | 本書承認 | 完了 |
| P4 | コア実装 | hina-core（math/geometry/rig/morph/atlas/GLB/VRM/rank/presets/i18n）DOM非依存 | 完了（selfTest 18/18） |
| P5 | UI/プレビュー実装 | WebGL描画・タブUI・書き出し動線・自動保存 | 完了 |
| P6 | テスト | `node tests/run.js` 全通過（SPEC §10 DoD全項目） | 完了（166/166） |
| P7 | 出荷 | hina-v0.1.0.zip 生成・整合性確認 | 完了 |

実測（2026-06-11）: index.html 1979行 / 既定 1929tris・1347verts・29bones / 全6プリセット 1725–1929tris・PC Excellent / Quest: bob・short=Excellent、他=Good（springOffでExcellent）

## 完成形ファイル一覧

```
hina/
├── index.html              # 全実装（build/ 結合生成物）
├── build/                  # ソース分割（00-head / 10-core-a / 11-core-b / 12-core-c / 20-app）
├── Plan.md                 # 本書
├── README.md / LICENSE / CHANGELOG.md / CONTRIBUTING.md / SECURITY.md / CLAUDE.md / .gitignore
├── docs/
│   ├── SPEC.md             # 仕様書（完成形定義・実装と乖離時はこちらが正）
│   ├── FAQ.md
│   ├── UPLOAD_GUIDE.md     # VCC→UniVRM→VRM Converter→SDK 手順
│   └── adr/ADR-001-architecture.md
├── tests/run.js            # Node零依存・GLBバリデータ内蔵
└── .github/workflows/ci.yml
```

## リスク

| リスク | 対策 |
|--------|------|
| VRM0座標系の解釈誤り（180°逆向き） | vrm.dev一次情報で確定済（Z-向き・右=+X）。テストでleftUpperArm.x<0を担保 |
| UniVRM読込失敗（accessor不整合等） | GLB自己バリデータをテストに内蔵。min/max必須項目を機械検証 |
| Quest Excellent割れ | 既定6プリセット全てで tris<7500/bones<75/mat=1 をテストで固定 |
| morph全配列によるファイル肥大 | v0.1は許容（~1.5MB）。v0.2でsparse化（SPEC §9） |
| ブラウザ間WebGL差異 | WebGL1機能のみ使用。uniform上限回避のためCPUスキニング採用（ADR-001） |

## ソクラテス問答記録（2026-06-11・v0.1.0 CrossReview Critic）

| 種別 | 問い | 結論 → 対応 |
|------|------|------------|
| 明確化 | 「VRChat対応」の成立条件は？ | UniVRM読込→Converter変換→SDK上传の全鎖。書式はGLB自己バリデータで機械検証済 |
| 前提検証 | 「テスト通過=UniVRM読込可」は真か？ | Unity実機は本環境で検証不能=残リスク。バリデータにノード到達性等を追加し縮小。初回読込検証はユーザー環境で実施 |
| 根拠 | Rank表示の根拠は正確か？ | pbComp=チェーン根数・pbTrans=チェーンボーン数=Converter変換後実数と一致。texMBは非圧縮値で保守的 |
| 視点転換 | index.html単体配布ユーザーはdocs/を持たない | 導線断絶 → アプリ内（出力タブ）に導入5手順を内蔵（i18n） |
| 帰結 | 1年後の保守者は何に苦しむ？ | worldMats汚染・死式 → 浄化。コンテキストロスト時の無言死 → 通知追加 |
| メタ | 最も価値ある未解決問題は？ | meta.texture=アトラス流用はツール上で破綻表示 → プレビュー視点の256pxサムネイル自動埋込。firstPersonBoneOffsetを実寸（目高・顔向きZ-）で精密化 |

結論3往復で収束。Unity実機検証のみ人間側タスクとして残置。

## ソクラテス問答記録（2026-06-13・アクセシビリティ深掘り）

| 種別 | 問い | 結論 → 対応 |
|------|------|------------|
| 明確化 | SPEC §7「WCAG AA」の成立条件は？ | キーボード操作(2.1.1)に加え、状態変化の支援技術伝達(4.1.3 Status Messages)もAA要件 |
| 前提検証 | 「スライダーを動かせば結果が分かる」は全ユーザーに真か？ | 偽。ランク/統計はcanvas横に視覚更新のみ。`#rankWrap`に`aria-live`なし → SR利用者はGood→Excellentの変化を知覚不能 |
| 視点転換 | 全盲ユーザーは「揺れ物オフでQuest Excellent」をどう確認？ | 確認手段なし。物理トグル操作が無言。律速明示の設計意図が視覚限定で破綻 |
| 根拠 | 書き出し成功のフィードバックは？ | 無言（ファイルが落ちるだけ）。失敗時のみalert。SR利用者に成功が伝わらない |
| 帰結 | 全状態変化を読み上げると？ | スライダー1刻みごと＝騒音。ランク文字列が実変化した時のみ通知する重複排除が必須 |
| メタ | 最小コスト最大是正は？ | 視覚的に隠した単一`aria-live`領域＋(1)ランク変化の重複排除通知 (2)書き出し成功通知。i18n＋テストで担保 |

結論2往復で収束。WCAG 2.1.1(前回)＋4.1.3(今回)でSPEC §7のAA主張のUI操作系ギャップを解消。

## ソクラテス問答記録（2026-06-13・データ整合性・サイレント失敗）

| 種別 | 問い | 結論 → 対応 |
|------|------|------------|
| 明確化 | 英語ユーザーがExportタブで見る`note.upload`の内容は？ | "See docs/UPLOAD_GUIDE.md" と表示される。単体配布にそのファイルは存在しない。CHANGELOGに記載済みの日本語修正と対称的に英語オブジェクトにも同じ死エントリが残存 → 両言語の旧エントリを削除。正エントリ（最後尾・上書き）はすでに存在していた |
| 前提検証 | JSON読み込み失敗時にユーザーは何を知覚できるか？ | 知覚できない。`deserialize()`がnullを返すと`if(d)`はfalseで無音のままUIは変化なし。操作が届いたか分からない → `err.loadFailed` i18nキー追加・alertによる明示通知 |
| 根拠 | `saveState()`はスライダー1刻みで何回`localStorage.setItem`を呼ぶか？ | height 0.8→2.0を引くと120回の同期setItem。mid-drag中間値はほぼ無価値 → debounce(500ms)で最終値のみ永続化 |
| 視点転換 | debounce化で即時性が失われる場所はあるか？ | 言語・モード切替は明示的意図だが500ms以内の離脱は稀。blanket 500ms debounceで許容範囲内 |
| 帰結 | `rebuild()`もdebounceすべきか？ | 否。プレビュー即時更新がこのツールの主要UX。ターゲット（デスクトップ）では十分高速。saveStateのみdebounce |
| メタ | 3つを合わせた最小コスト最大是正は？ | (1)両言語の死エントリ削除 (2)`err.loadFailed`+alertフィードバック (3)saveState 500ms debounce。合計20行未満・テスト178→183で担保 |

結論3往復で収束。i18n重複エントリ・サイレント失敗・過剰LocalStorage書き込みの3問題を同時解消。

## ソクラテス問答記録（2026-06-13・エクスポート品質・回復力）

| 種別 | 問い | 結論 → 対応 |
|------|------|------------|
| 明確化 | Exportタブのライセンスドロップダウンに実際に表示される文字列は？ | `Redistribution_Prohibited`、`CC_BY_NC_SA` 等のraw技術値。VRC初心者には難解。`selRow` の第4引数が `null` のため翻訳が無効化されていた → `license.*` i18n 8キー追加＋引数を `'license'` に変更 |
| 前提検証 | `buildAvatar()` が例外を投げた場合、何が起きるか？ | `build` が null のまま、UIは無音で機能停止。エラーバウンダリなし → `rebuild()` に try/catch を追加。`err.buildFailed` i18n キーで alert 通知 |
| 視点転換 | タイトル未入力でエクスポートすると？ | `hina.vrm` 固定。複数バリアント試行時に全ファイルが同名 → title/author 入力欄に placeholder ヒント追加（`out.title.ph`・`out.author.ph`） |
| 根拠 | VRMメタ `version` フィールドの仕様上の意味は？ | アバター製作者バージョン文字列。空文字列はUniVRM通過可能。v0.2課題として残置 |
| 帰結 | 3問題の優先順位は？ | (1)ライセンス表示ローカライズ — 全エクスポーターに影響 (2)error boundary — 稀だが致命的 (3)placeholder — UXヒント |
| メタ | 最小コスト最大是正は？ | (1)8×2 `license.*` i18nキー+selRow引数変更 (2)`err.buildFailed`付きtry/catch (3)placeholder 2キー追加。合計30行・テスト183→190で担保 |

結論3往復で収束。エクスポートUI品質・回復力・入力ヒントの3軸を同時改善。
