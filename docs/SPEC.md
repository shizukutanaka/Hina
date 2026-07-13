# 雛 (Hina) 仕様書 v0.1.0

> 本書が完成形の定義。実装と乖離した場合は本書を正として再実装する（C11）。

## 1. プロダクト定義

このプロダクトは3Dモデリング経験のないVRChatユーザーが、ブラウザ上でパラメータ操作のみによりVRChat対応アバター（VRM 0.x）を作成・出力するための単一HTMLツールである。完全ローカル動作・外部依存ゼロ・外部送信なしを設計上の制約とする。

### 5つの問い
| # | 問い | 答え |
|---|-----|------|
| 1 | 誰が使うか | 自作アバターが欲しいVRChatユーザー（初心者主軸・上級者は詳細モードで対応） |
| 2 | 何のために | モデリング知識なしでVRChatにアップロード可能なVRMを得るため |
| 3 | どこで動くか | モダンブラウザ（WebGL1+, ES2020）。OS不問・オフライン可 |
| 4 | 何を持たないか | VRChatへの直接アップロード（規約上SDK限定）／高精細スカルプト／既製衣装の着せ替え／クラウド保存 |
| 5 | 外せない制約 | 単一HTML・依存ゼロ・通信ゼロ・PIIゼロ・既定でQuest上位Rank |

## 2. 利用者モード

| モード | 表示 | 対象 |
|--------|------|------|
| かんたん | プリセット・ガチャ・主要スライダー・色・出力 | 初心者。3クリックでVRM取得 |
| 詳細 | 全パラメータ＋数値入力＋物理調整＋メタ情報全項目 | 上級者 |

## 3. 機能一覧

| ID | 機能 | 要点 |
|----|------|------|
| F-001 | プリセット | 6体（全パラメータ＋配色のセット）。適用は1タップ |
| F-002 | ガチャ | 全パラメータを審美レンジ内でランダム化。配色はキュレーション済パレットから選択 |
| F-003 | 体格編集 | 身長0.8–2.0m・頭身・肩幅・腰幅・胸・手足の長さ/太さ 等 |
| F-004 | 顔編集 | 目の大きさ/位置/形状(4種)・瞳サイズ・眉(3種)・口幅・頬紅 |
| F-005 | 髪編集 | 髪型5種(ショート/ボブ/ロング/ツイン/ポニー)・前髪3種・長さ・ボリューム・アホ毛 |
| F-006 | 衣装 | 4種(ワンピース/セーラー/シャツ+パンツ/パーカー)・スカート丈・袖 |
| F-007 | 配色 | 肌(パレット8)・髪・瞳・服メイン/サブ/アクセント・靴。任意色入力可 |
| F-008 | 物理調整 | 髪の硬さ/重力/減衰。**揺れ物オフ**トグル（Quest Excellent用） |
| F-009 | プレビュー | WebGLトゥーン(2階調+リム)・輪郭線・軌道カメラ・呼吸/瞬き/視線追従/髪Verlet物理。`prefers-reduced-motion`で自動アニメ停止 |
| F-010 | Rank推定 | §6の全項目をPC/Quest別に判定し最悪値をランクとして色付き表示。律速項目を明示 |
| F-011 | VRM書き出し | §5仕様のVRM 0.xバイナリ(.vrm)をダウンロード |
| F-012 | パラメータ保存 | JSON書出/読込(`.hina.json`)。localStorageへ自動保存（失敗時は黙ってスキップ） |
| F-013 | メタ情報編集 | タイトル/作者/連絡先/許可ユーザー/暴力・性的・商用可否/ライセンス |
| F-014 | i18n | 日本語(一次)/English。`namespace.key`方式 |
| F-015 | 自己診断 | `?selftest` でコア整合チェック結果を表示 |
| F-016 | 表情エディタ | 詳細モード・顔タブ。喜び/怒り/悲しみ/楽しいの4表情を、既存10モーフ（あ〜お+まばたき+4感情）の重み付き組み合わせで調整。母音・まばたきは編集不可（リップシンク/自動まばたき用のため固定） |
| F-017 | 元に戻す/やり直す | Ctrl/⌘+Z / Ctrl/⌘+Shift+Z。最大20段の履歴（params/meta/exprMix/プリセットID/ガチャシード）。1.5秒以内の連続編集は1操作にまとめる |

## 4. パラメータ仕様（抜粋・全定義はコアPARAMSスキーマが正）

数値は全て `{min, max, def, step}` を持ち、UIスライダーと乱数生成が共有する。

| キー | 範囲 | 既定 | 内容 |
|------|------|------|------|
| height | 0.8–2.0 | 1.45 | 身長(m)。VRChat推奨レンジ内 |
| headRatio | 0.18–0.36 | 0.24 | 頭高/身長。0.30+でちび頭身 |
| shoulderW / hipW | 0.14–0.34 | 0.21/0.215 | 肩幅/腰幅(×身長) |
| bust | 0–1 | 0.25 | 胸の張り出し |
| armLen / legLen | 0.8–1.2 | 1.0 | 腕/脚の長さ係数 |
| eyeSize / eyeY / eyeGap | — | — | 目の大きさ/高さ/間隔 |
| eyeShape | enum4 | round | round/tare/tsuri/jito |
| hairStyle | enum5 | twin | short/bob/long/twin/pony |
| bangs | enum3 | full | full/see/center |
| outfit | enum4 | sailor | onepiece/sailor/shirts/hoodie |
| springOff | bool | false | true=揺れ物なし(Quest Excellent) |
| hairStiff / hairGrav / hairDrag | 0–1 | 0.65/0.05/0.4 | SpringBone係数（書き出し値と同一） |

## 5. VRM出力仕様（VRM 0.x / glTF 2.0 GLB）

### 5.1 座標・姿勢（出典: vrm.dev）
- 右手系 Y-up。**モデルはZ-向き、右が+X**（VRM 0.x規定）
- T-pose正規化: 全ノード回転は単位、translationのみ。バインド姿勢=T-pose
- 単位: メートル

### 5.2 構成
| 項目 | 値 | 理由 |
|------|----|------|
| メッシュ | 1（1プリミティブ） | Quest「Skinned Meshes=1」「Material Slots=1」でExcellent |
| マテリアル | 1（MToon, Cutout, 両面） | 同上。顔パーツは同一アトラスのα領域 |
| テクスチャ | 1024×1024 アトラス ×1 + サムネイル | テクスチャメモリ Quest Excellent(≤10MB)圏 |
| Humanoidボーン | 21: hips/spine/chest/neck/head/L,R shoulder/upperArm/lowerArm/hand/upperLeg/lowerLeg/foot/eye | Unity Humanoid必須15+推奨。eyeでLookAt(Bone)有効 |
| 揺れボーン | 髪型に応じ0–3チェーン(各3–4本)。skirtは脚ウェイト追従(非物理) | Quest PhysBones制限(Good≤4comp/16transforms)内 |
| 総三角形 | 全プリセットで < 7,500 | Quest Excellent閾値 |
| 総ボーン | < 75 | PC/Quest Excellent閾値 |

### 5.3 BlendShape（VRM0 blendShapeMaster）
プリセット名: `neutral, a, i, u, e, o, blink, blink_l, blink_r, joy, angry, sorrow, fun, lookup, lookdown, lookleft, lookright`
- 母音5種は口形状の頂点モーフ（VRChatリップシンク変換対象）
- look系は空バインド（視線はBone方式のため）
- モーフはメッシュ`extras.targetNames`に名称を格納（UniVRM互換）
- 各モーフはglTFスパースアクセサ（非ゼロ頂点のみ格納）で書き出す。ファイルサイズ縮小のため
- joy/angry/sorrow/funの4グループは表情エディタ（F-016）のミックス設定に応じて複数バインド（重み付き）を持ちうる。未編集時は従来通り単一バインド・weight=100（バイト互換）

### 5.4 SpringBone（secondaryAnimation）
- boneGroups: 共通パラメータ `stiffiness`(VRM0原文ママ)/gravityPower/gravityDir(0,-1,0)/dragForce/hitRadius、`bones`=チェーン根ノード
- colliderGroups: 頭部に球コライダ1（髪貫通防止）
- プレビュー物理は同一パラメータのVerlet実装（見た目の事前確認用）

### 5.5 マテリアル（materialProperties）
shader `VRM/MToon`。`_BlendMode=1(Cutout)`,`_Cutoff=0.5`,`_CullMode=0(両面)`,`_ShadeToony=0.9`,`_ShadeShift=0`。glTF側は`alphaMode:MASK`をミラー。アウトラインは既定OFF、`outline`パラメータ（詳細モード・色タブ）でON時`_OutlineWidthMode=1`を書き出す。Quest側シェーダーは非対応のためPC限定表示（UIで明示）。

### 5.6 メタ（meta）
title/version/author/contactInformation/reference/texture(サムネイル)/allowedUserName/violentUssageName/sexualUssageName/commercialUssageName/licenseName/otherLicenseUrl。既定は `OnlyAuthor / Disallow×3 / Redistribution_Prohibited`（最も保守的）。UIで変更可。

## 6. Performance Rank基準値（推定器テーブル）

出典: creators.vrchat.com「Performance Ranks」2026-04-21版。**値の改定はコアRANKSテーブルのみ更新**。

PC: Triangles 32k/70k/70k/70k ・ Bones 75/150/256/400 ・ SkinnedMesh 1/2/8/16 ・ Mesh 4/8/16/24 ・ Material 4/8/16/32 ・ PB部品 4/8/16/32 ・ PB変換 16/64/128/256 ・ PBコライダ 4/8/16/32 ・ PB衝突 32/128/256/512 ・ TexMem 40/75/110/150MB ・ Raycasts 1/4/8/15（E/G/M/P。超過=Very Poor）
Quest: Triangles 7.5k/10k/15k/20k ・ Bones 75/90/150/150 ・ SkinnedMesh 1/1/2/2 ・ Mesh 1/1/2/2 ・ Material 1/1/2/4 ・ PB部品 0/4/6/8 ・ PB変換 0/16/32/64 ・ PBコライダ 0/4/8/16 ・ PB衝突 0/16/32/64 ・ TexMem 10/18/25/40MB ・ Raycasts 1/2/4/8

Raycasts は2026-04-21同期で追加された項目（Round 494で推定器テーブルへ反映）。雛はVRC Raycastコンポーネントを一切出力しないため常時0で、両プラットフォームとも律速要因になり得ない。

判定: 全項目の最悪ランク。Questは「揺れ物ON→Good上限 / OFF→Excellent」が本ツールの設計帰結であり、UIで明示する。

## 7. 非機能要件

| 項目 | 基準 |
|------|------|
| 依存 | ランタイム依存0。テストもNode標準のみ |
| 通信 | 0リクエスト（fetch/XHR/WS/беacon不使用） |
| PII | 収集・送信・保存なし（C5）。作者名はユーザーが書出ファイルに自ら記す任意項目 |
| 性能 | パラメータ変更→プレビュー反映 < 50ms（再生成方式）/ 書き出し < 2s |
| アクセシビリティ | WCAG 2.2 AA: フォーカス可視・コントラスト4.5:1・aria-label・reduced-motion・ターゲットサイズ24px（SC 2.5.8） |
| ブラウザ | Chrome/Edge/Firefox/Safari 最新2版 |

## 8. 制約・非対応（明示スコープ外）

- VRChatへの直接アップロード（公式SDK限定のため恒久非対応）
- FBX/PMX書き出し・既存モデルの読込改変・テクスチャ手描き（→ロードマップ）
- 指ボーン（v0.1はミトン手。VRChat動作に支障なし）

## 9. ロードマップ

| 版 | 内容 |
|----|------|
| v0.2 | 指ボーン+指モーフ・髪/衣装プリセット追加（スパースモーフ格納・MToonアウトライン出力は実装済み、§5.3/§5.5参照） |
| v0.3 | テクスチャレイヤーペイント・アクセサリ（表情エディタは実装済み、F-016/§5.3参照） |
| v1.0 | VRM 1.0出力・VRMA対応・プリセット共有形式 |

## 10. 受け入れ基準（DoD）

- [ ] `node tests/run.js` 全通過（GLB構造バリデータ含む）
- [ ] 既定6プリセット: tris<7500・bones<75・mat=1・skinnedMesh=1 をテストで担保
- [ ] 書き出したVRMがGLB仕様（マジック/チャンク/4byte整列/accessor整合）を満たすことを機械検証
- [ ] i18n ja/en キー完全一致
- [ ] 揺れ物OFF時 Quest判定=Excellent / ON時=Good をテストで担保
