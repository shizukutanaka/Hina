# 雛 (Hina) — 長所・短所・改善案（2026-07時点）

本文書は、74ラウンドの集中監査（Round 464–537、記録は [FEATURE_AUDIT.md](FEATURE_AUDIT.md)）・公開作業・マスク法による完成監査（[COMPLETION_AUDIT.md](COMPLETION_AUDIT.md)）を経た時点でのプロダクト評価。**各主張には本セッションで実証した根拠を付す**。後続のAIセッションが作業を選ぶ際の情報源であり、[INSTRUCTIONS_OPUS.md](INSTRUCTIONS_OPUS.md) / [INSTRUCTIONS_SONNET.md](INSTRUCTIONS_SONNET.md) のタスクメニューはここから引く。

## 長所（実証済み）

| # | 長所 | 根拠 |
|---|------|------|
| 1 | **依存ゼロ・単一HTML・完全ローカル** | 配布/監査/オフラインの保証。通信ゼロ（`fetch`/`XHR`/`WebSocket`/外部`<link>`不存在）は自動テストで担保 |
| 2 | **品質保証の厚さ** | 自動テスト**2094件・0失敗**（約2秒）。ガチャは決定論的（mulberry32・3経路が単一関数に集約）。既定6プリセットの Quest Excellent（揺れ物OFF）/ Good以上（ON）はテストが保証。さらに**主要なユーザー向け約束6系統が実ブラウザE2Eで恒久検証**（書き出し・自己診断・自動保存・共有URL・Undo/Redo・視覚回帰13ケース＝`tools/render-check.js`、Round 529–531）。**スイートは自分自身も監査する**——ソース窓アンカーの死活と否定アサーションの番人規則を機械強制（Round 537） |
| 3 | **仕様準拠の厳密性・実ローダー互換** | **公式 Khronos glTF-Validator で全11書き出し 0 errors**（Round 524）＋**参照Web VRMローダー three-vrm が全ケース完全読込**（Round 525: humanoid15ボーン/17表情/springBone/firstPerson全解決）。accessor min/max厳密一致（506）、sparse昇順、GLBヘッダ検証、VRM0メタ全enum防御、MToonキーワード整合（522） |
| 4 | **セキュリティ硬化（実攻撃で検証済み）** | prototype pollution 対策をJSON流入の全4経路に適用（Round 469/495）、貼り付けDoSガード（470）、メタenum/シードの全層検証（492/493）。**Round 535で実ブラウザから4経路すべてへ実際に攻撃**（`__proto__`汚染・不正enum・範囲外値・3MB巨大ファイル）し、汚染ゼロ・既定値へのフォールバック・拒否をすべて実証。同時に発見した文字列契約の不整合（5,000字titleの素通し）も修正済み。**Round 536で書き出しファイル名も攻撃**し、パス脱出不能を確認のうえ制御文字・BIDI偽装・Windows予約名の取り逃しを修正 |
| 5 | **アクセシビリティ** | WCAG 2.2 AA（新設SC 2.5.8の24pxターゲット含む）、Windowsハイコントラスト（forced-colors）での選択状態表示、SRアナウンス規律（showErr統一・スパム抑制・フォーカス復元）、完全キーボード操作 |
| 6 | **監査証跡・二言語ドキュメント** | FEATURE_AUDIT による引き継ぎ可能な監査記録、CHANGELOG最新化、ユーザー/コントリビュータ向け文書（README・UPLOAD_GUIDE・FAQ・SPEC）の日英二言語化 |
| 7 | **成熟度の実証** | 主要3サブシステムの全行通読 clean sweep に加え、Round 528 で最後の既知欠陥（マルチタッチ視点ジャンプ）を修正し**既知の未修正欠陥ゼロ**・**dead code ゼロ**（マスク法削除ハントで実測、Round 526）。ソクラテス問答による完成主張の検証記録は COMPLETION_AUDIT 参照 |

## 短所・制約（正直に）

| # | 短所 | 補足 |
|---|------|------|
| 1 | **視覚検証パイプラインの制約**（最大のボトルネック・Round 518で部分的に緩和） | ヘッドレスChromium+SwiftShaderで**ジオメトリ／シルエット／プロポーションは検証可能**と実証済み（`node tools/render-check.js`／FEATURE_AUDIT §5-16）。ただし**色・テクスチャ・顔パーツは検証不能**——SwiftShaderのcanvas→テクスチャ経路が空を返し、メインFSの`if(c.a<0.5)discard`で全フラグメントが落ちるため（アトラス内容とUNPACK_FLIP_Y設定はいずれも正常＝製品側の不具合ではない。ImageData経由の回避も無効）。色を伴う判断とUnity/UniVRM実機での取込確認は依然として人間が必要。**実行検証は Chromium のみ**——Firefox/Safari は環境制約（CDN遮断）で実行できず、静的APIガード監査（全件✅、Round 534）に留まる。**実績**: この限定的な視覚検証だけで Round 519 の実バグ（アウトラインが本体の39%を覆い隠していた）を発見・修正できた |
| 2 | **表現力の上限** | ミトン手（指ボーンなし）・プリセット6体・髪型5種。v0.1スコープとしては設計通りだが競合（VRoid等）比では狭い |
| 3 | **ドキュメントの言語** | adr（設計判断記録・開発者向け内部文書）のみ日本語。ユーザー/コントリビュータ向け文書（README・UPLOAD_GUIDE・FAQ・SPEC）は全て二言語化済み（Round 533） |
| 4 | **テストの一部が正規表現ウィンドウ方式**（Round 537で空検証リスクは機械強制へ格上げ） | リファクタで文字列がずれると割れる点は変わらない（設計上の対価）。ただし**静かに空検証化する**方の危険は、スイート自身が全窓アンカーの死活と「否定アサーションを持つ窓は肯定アサーションも持つ」規則を検査するメタテストで**機械強制**するようにした（Round 537）。実例はRound 496/497・526・536で発見・修正済み。番人不在の窓3件も同時に解消（うち1件は通読では見つからず機械が発見） |
| 5 | **持込経路の外部依存リスク**（コード外・2026-07の外部調査で確認） | VRM Converter for VRChat は2025-01以降更新停止、VRChatはUnity 6移行ベータ中、エコシステムはVRM 1.0へ緩やかにシフト。コンバータが追従しない場合、初心者向けアップロード経路が断絶しUPLOAD_GUIDE全面書き直しが必要 |
| 6 | **公開設定の残作業**（リポジトリSettings権限が必要・AI環境から実行不可） | デフォルトブランチの`main`切替 / `v0.1.0` Release作成 / GitHub Pages有効化（有効化すれば `https://shizukutanaka.github.io/Hina/` で直接動作） |

## 改善案（優先度順・推奨担当付き）

| # | 優先度 | 内容 | 担当 | 備考 |
|---|--------|------|------|------|
| 1 | **P1** | 公開設定3点（default branch→main / v0.1.0 Release / GitHub Pages） | **人間** | 各1–2クリック。Pagesは配布UXを大きく改善 |
| 2 | **P1** | 視覚検証体制の確立 — **部分的に達成済み（Round 518）**。残るのは色/テクスチャ/顔パーツの確認、Unity/UniVRM実機での取込確認、および **Firefox/Safari 実機での `tools/render-check.js` 相当のE2E実行**（Round 534で静的監査のみ完了） | **人間+Opus** | ヘッドレスChromium+SwiftShaderで**ジオメトリ／シルエット／プロポーション／ポーズは検証可能**と実証（`node tools/render-check.js`。手順は FEATURE_AUDIT §5-16）。色は不可（下記）。形状系のv0.2作業はこの範囲で部分的に解錠できる |
| 3 | P2 | エコシステム定期監視（creators.vrchat.comのRANKS・VRM Converter・UniVRMリリース） | Sonnet | 変化があればOpus/人間へ報告のみ（対応判断はしない） |
| 4 | P3 | v0.2機能（指ボーン・髪型/衣装追加） | Opus | #2完了後のみ。骨/三角形予算の試算は FEATURE_AUDIT §3-1 に記録済み |
| 5 | P3 | VRM 1.0 対応の再評価 | 人間 | CLAUDE.mdの「0.x固定」制約の変更判断はユーザー専権。#3の監視結果を判断材料に |

> Round 533 時点で、**この環境から実行可能な改善案はすべて実行済み**（SPEC英語化・CONTRIBUTING実態同期を完了し本表から除去）。残る5件はすべて、人間の権限（#1,#5）・実機/視覚判断（#2,#4）・定期監視という性質上の継続タスク（#3）であり、単発のコード/文書作業として消化できるものは無い。

## 参照

- 非交渉制約: [../CLAUDE.md](../CLAUDE.md)（単一HTML・VRM 0.x・Quest予算・1マテリアル/1メッシュ）
- 監査の全記録: [FEATURE_AUDIT.md](FEATURE_AUDIT.md)
- モデル別の作業指示: [INSTRUCTIONS_OPUS.md](INSTRUCTIONS_OPUS.md) / [INSTRUCTIONS_SONNET.md](INSTRUCTIONS_SONNET.md)
