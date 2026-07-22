# 雛 (Hina) — 長所・短所・改善案（2026-07時点）

本文書は、48ラウンドの集中監査（Round 464–511、記録は [FEATURE_AUDIT.md](FEATURE_AUDIT.md)）と公開作業を経た時点でのプロダクト評価。**各主張には本セッションで実証した根拠を付す**。後続のAIセッションが作業を選ぶ際の情報源であり、[INSTRUCTIONS_OPUS.md](INSTRUCTIONS_OPUS.md) / [INSTRUCTIONS_SONNET.md](INSTRUCTIONS_SONNET.md) のタスクメニューはここから引く。

## 長所（実証済み）

| # | 長所 | 根拠 |
|---|------|------|
| 1 | **依存ゼロ・単一HTML・完全ローカル** | 配布/監査/オフラインの保証。通信ゼロ（`fetch`/`XHR`/`WebSocket`/外部`<link>`不存在）は自動テストで担保 |
| 2 | **品質保証の厚さ** | 自動テスト**1998件・0失敗**。ガチャは決定論的（mulberry32・シード再現・ボタン/入力欄/URLの3経路が単一関数に集約）。既定6プリセットの Quest Excellent（揺れ物OFF）/ Good以上（ON）はテストが保証 |
| 3 | **仕様準拠の厳密性** | glTF 2.0 accessor min/max の厳密一致（Khronosバリデータ級。Round 506で違反を発見・修正）、sparse昇順、GLBヘッダ検証、VRM0メタの全enum防御 |
| 4 | **セキュリティ硬化** | prototype pollution 対策をJSON流入の全4経路に適用（Round 469/495）、貼り付けDoSガード（470）、メタenum/シードの全層検証（492/493） |
| 5 | **アクセシビリティ** | WCAG 2.2 AA（新設SC 2.5.8の24pxターゲット含む）、Windowsハイコントラスト（forced-colors）での選択状態表示、SRアナウンス規律（showErr統一・スパム抑制・フォーカス復元）、完全キーボード操作 |
| 6 | **監査証跡・二言語ドキュメント** | FEATURE_AUDIT による引き継ぎ可能な監査記録、CHANGELOG最新化、README/UPLOAD_GUIDE の日英二言語化 |
| 7 | **成熟度の実証** | 直近監査で主要3サブシステム（レンダー/物理・ガチャ決定性・Undo/Redo）を全行通読して実害バグゼロ（clean sweep）。「見つけられなかった」ではなく「掘り尽くした」に近い状態 |

## 短所・制約（正直に）

| # | 短所 | 補足 |
|---|------|------|
| 1 | **視覚検証パイプラインの不在**（最大のボトルネック） | AI実行環境ではWebGL出力を忠実に確認できず、v0.2主要機能（指ボーン・髪型/衣装追加）が凍結中（[FEATURE_AUDIT §3-1/3-2](FEATURE_AUDIT.md)）。人間による実ブラウザ+Unity/UniVRM確認体制が解錠条件 |
| 2 | **表現力の上限** | ミトン手（指ボーンなし）・プリセット6体・髪型5種。v0.1スコープとしては設計通りだが競合（VRoid等）比では狭い |
| 3 | **ドキュメントの言語** | SPEC.md・FAQ.md・adr は日本語のみ（README・UPLOAD_GUIDEは二言語化済み） |
| 4 | **テストの一部が正規表現ウィンドウ方式** | リファクタで文字列がずれると割れる/まれに空検証化する（Round 496/497で実例を発見・修正済み。「ウィンドウ更新+RoundNコメント」の運用規約でカバー中） |
| 5 | **持込経路の外部依存リスク**（コード外・2026-07の外部調査で確認） | VRM Converter for VRChat は2025-01以降更新停止、VRChatはUnity 6移行ベータ中、エコシステムはVRM 1.0へ緩やかにシフト。コンバータが追従しない場合、初心者向けアップロード経路が断絶しUPLOAD_GUIDE全面書き直しが必要 |
| 6 | **公開設定の残作業**（リポジトリSettings権限が必要・AI環境から実行不可） | デフォルトブランチの`main`切替 / `v0.1.0` Release作成 / GitHub Pages有効化（有効化すれば `https://shizukutanaka.github.io/Hina/` で直接動作） |

## 改善案（優先度順・推奨担当付き）

| # | 優先度 | 内容 | 担当 | 備考 |
|---|--------|------|------|------|
| 1 | **P1** | 公開設定3点（default branch→main / v0.1.0 Release / GitHub Pages） | **人間** | 各1–2クリック。Pagesは配布UXを大きく改善 |
| 2 | **P1** | 視覚検証体制の確立（実ブラウザ+Unity/UniVRM実機確認、またはスクリーンショット比較の仕組み） | **人間+Opus** | v0.2機能群の解錠条件。これが無い限り形状系変更は凍結継続 |
| 3 | P2 | エコシステム定期監視（creators.vrchat.comのRANKS・VRM Converter・UniVRMリリース） | Sonnet | 変化があればOpus/人間へ報告のみ（対応判断はしない） |
| 4 | P2 | SPEC.md / FAQ.md の英語化 | Sonnet | README/UPLOAD_GUIDEで確立した同一ファイル+相互アンカー方式を踏襲 |
| 5 | P3 | v0.2機能（指ボーン・髪型/衣装追加） | Opus | #2完了後のみ。骨/三角形予算の試算は FEATURE_AUDIT §3-1 に記録済み |
| 6 | P3 | 3Dプレビューのマルチタッチ既知問題（回転中の2本目指で視点ジャンプ） | Opus | FEATURE_AUDIT §3-4。深刻度低で保留中 |
| 7 | P3 | CONTRIBUTING.md の実態同期（ブランチ戦略の記述が現運用と乖離） | Sonnet | 小規模 |
| 8 | P3 | VRM 1.0 対応の再評価 | 人間 | CLAUDE.mdの「0.x固定」制約の変更判断はユーザー専権。#3の監視結果を判断材料に |

## 参照

- 非交渉制約: [../CLAUDE.md](../CLAUDE.md)（単一HTML・VRM 0.x・Quest予算・1マテリアル/1メッシュ）
- 監査の全記録: [FEATURE_AUDIT.md](FEATURE_AUDIT.md)
- モデル別の作業指示: [INSTRUCTIONS_OPUS.md](INSTRUCTIONS_OPUS.md) / [INSTRUCTIONS_SONNET.md](INSTRUCTIONS_SONNET.md)
