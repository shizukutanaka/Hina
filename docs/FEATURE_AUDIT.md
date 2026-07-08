# 雛 (Hina) 機能監査 — 過不足リスト（2026-07時点）

## 0. この文書について

この文書は、AIコーディングセッション（コミット履歴上「Round 464」〜「Round 477」と呼ぶ14回の改善サイクル）で実施した機能監査の結果を、**前提知識のない後続セッションが読んで作業を引き継げる形**で記録したものである。Round 479 で §3-1 の表情エディタ、Round 481 で複数段Undo/Redoを実装したため、両項目を §2 へ移動済み。

- 「Round N」はコミットメッセージ先頭の通し番号。`git log --oneline` で対応コミットを特定できる
- 本文書作成時点のテスト数は **1888 passed / 0 failed**（`node tests/run.js`）
- 次に新しい変更を行う場合の通し番号は **Round 486**（Round 478 = 本文書の追加、Round 479 = 表情エディタ実装、Round 480 = 表情エディタのSRスパム修正、Round 481 = 複数段Undo/Redo実装、Round 482 = Undo/Redoのdebounceウィンドウ境界バグ修正、Round 483 = Redoショートカットの発見可能性修正、Round 484 = Undo/Redoヒントのスクリーンリーダー対応、Round 485 = outlineトグルのSRアナウンス漏れ修正）

## 1. プロダクト概要と交渉不可制約

雛は、3Dモデリング経験のないVRChatユーザーがブラウザだけでVRM 0.xアバターを作成・書き出しする単一HTMLツール。詳細仕様は `docs/SPEC.md`、VRChatへの持ち込み手順は `docs/UPLOAD_GUIDE.md` を参照。

**以下は `CLAUDE.md` に定められた交渉不可の制約。違反する変更を提案・実装してはならない：**

| 制約 | 理由 |
|------|------|
| 単一HTML・依存ゼロ（npm依存もCDNも不可） | 配布容易性・監査容易性・オフライン保証 |
| VRM 0.x 固定（1.0対応はv1.0まで凍結） | VRM Converter for VRChat エコシステムが0.x前提 |
| 既定6プリセットで Quest Excellent 維持（tris<7500 / mat=1 / skinnedMesh=1 / bones<75 / 揺れ物オフ時PhysBones=0） | テストで担保。揺れ物ON時はGood以上 |
| `index.html` は**生成物**。直接編集禁止 | `build/` 配下を編集して結合する（§6参照） |
| `<script id="hina-core">`（build/10〜12）にDOM/WebGL/Canvas参照を入れない | Node単体でテスト可能に保つため |
| 1マテリアル・1スキンメッシュ・1プリミティブを崩さない | 崩す変更は取締役会付議事項 |
| パラメータ追加は PARAMS スキーマ + i18n（ja/en両方）必須 | テストがパリティ検証する |

## 2. 対応済みの不足（14件・Round 464–477）

すべて実装・テスト・コミット済み。**再実装は不要**。挙動を変更する際は各アンカーのテストブロック（`tests/run.js` 内の `Round N` コメントで検索可能）を必ず更新すること。

### セキュリティ（2件）

| Round | 内容 | アンカー |
|-------|------|---------|
| 469 | JSON読込のprototype pollution対策。`deserialize()` が meta を無検証で返し、アプリ側の `Object.assign(meta, d.meta)` で `__proto__` キーがプロトタイプを書き換え得た。ホワイトリスト方式の `sanitizeMeta()` を追加 | `build/10-core-a.js` の `META_KEYS` / `sanitizeMeta()` / `deserialize()` |
| 470 | クリップボード貼り付けのDoS対策。ファイル読込・ドラッグ&ドロップにある2MB上限が貼り付け経路になく、巨大文字列で `JSON.parse` がハングし得た。同じ2MBガードを追加 | `build/20-app.js` の `pstj` ボタンonclick内 `text.length > 2*1024*1024` |

### 堅牢性（2件）

| Round | 内容 | アンカー |
|-------|------|---------|
| 465 | 破損VRMのサイレントダウンロード防止。書き出し直前にGLBヘッダ（マジック `0x46546C67`・version=2・長さフィールド）を検証し、不正なら `hint.exportCorrupt` を表示して中断 | `build/20-app.js` の `doExport()` 内、`HINA.exportVRM()` 呼び出し直後 |
| 472 | Windows予約デバイス名対策。タイトルが `CON`/`PRN`/`AUX`/`NUL`/`COM1-9`/`LPT1-9` にサニタイズされるとWindowsで保存不能（拡張子付きでも不可）。該当時は末尾に `_` を付加 | `build/20-app.js` の `WIN_RESERVED` 正規表現 / `safeName()` |

### エラーメッセージの正確性（2件）

| Round | 内容 | アンカー |
|-------|------|---------|
| 467 | スクリーンショット失敗が「VRM書き出しに失敗」と誤表示していた。専用キー `err.screenshotFailed` を追加 | `build/20-app.js` の `doScreenshot()` 内2箇所 |
| 468 | 2MBサイズ超過が「形式が不正」と誤表示していた。専用キー `err.loadTooLarge` を追加（ファイル読込とドラッグ&ドロップの両経路） | `build/20-app.js` のサイズガード2箇所 |

### アクセシビリティ（3件）

| Round | 内容 | アンカー |
|-------|------|---------|
| 464 | Firefox+NVDAの幽霊「Alert」読み上げ対策。非表示要素に `role="alert"` と `aria-live="assertive"` を併記するとDOM再描画のたびに空でも読み上げられる既知バグ（WordPress Trac #36289）。`role` を除去し `aria-live` のみに | `build/00-head.html` の `#srAlert` 要素 |
| 466 | WebGL喪失時のスクリーンショット失敗を polite（srStatus）から assertive（`showErr()`）に格上げ | `build/20-app.js` の `doScreenshot()` 冒頭ガード |
| 471 | 保存失敗アナウンスのスパム抑制。保存は編集後500msデバウンスのため、localStorage故障中に入力を続けると約500ms毎にスクリーンリーダーへ割り込みが発生していた。故障状態への**遷移時に1回だけ** `showErr()` する方式に（バッジ表示は毎回更新） | `build/20-app.js` の `saveState()` catch節、`wasBroken` / `_lsBroken` |

補足: エラー系アナウンスは `showErr(msg)` に統一されている（hint バー赤表示 + srStatus + srAlert への rAF 経由書き込み + 5.5秒後クリア）。エラー経路で `srStatus` に直接書くのは既存方針に反する。

### 機能追加（11件）

| Round | 内容 | アンカー |
|-------|------|---------|
| 473 | MToonアウトライン書き出しトグル（旧v0.2ロードマップ項目）。`outline` bool パラメータ（色タブ・詳細モードのみ）で `_OutlineWidthMode` を 0↔1 切替。ガチャのランダム化対象外。ジオメトリ再構築不要のため `onParam()` で短絡。Quest非対応の注記 `note.outline` 付き | `build/10-core-a.js` の `PARAMS.outline` / `build/12-core-c.js` の `materialProperties` / `build/20-app.js` の `onParam()` |
| 474 | `?seed=N` URLでガチャ結果を再現。起動時 `loadState()` 後・初回 `rebuild()` 前に解釈。手動シード入力と同じ [0, 4294967295] クランプ。不正値は無言で無視 | `build/20-app.js` 起動シーケンスの `URLSearchParams` ブロック |
| 475 | 「リンクをコピー」ボタン。Round 474 の共有URLをUIから発見可能に。隣の「コピー」（シード番号のみ）と同じ disabled/busy/成功/失敗パターン | `build/20-app.js` の `cpLinkBtn` |
| 476 | ガチャのカテゴリロック。body/face/hair/outfit/color の5チェックボックス（折りたたみ `<details>` 内）でロックした分類を再生成から除外。**重要な不変条件**: ロック中の再生成はシード単独で再現不能のため `lastGachaSeed` を null にする（共有リンクが嘘をつかないため） | `build/20-app.js` の `GACHA_LOCK_TABS` / `gachaLocks` / `runGacha()` |
| 477 | ロック使用中は `<details>` を自動展開。`runGacha()` が `renderBody()` を呼びDOMが再生成されるため、これがないと再生成のたびに閉じてしまう | `build/20-app.js` の `lockDet` 生成箇所の `open:''` 条件 |
| 479 | 表情エディタ（旧v0.3ロードマップ項目）。喜び/怒り/悲しみ/楽しいの4感情のみ編集可（母音・まばたきはVRChatリップシンク/自動まばたき用のため固定）。10種の既存モーフ（あ〜お+まばたき+4感情）を重み0-100で組み合わせ可能。**重要な不変条件**: 未編集時（デフォルトミックス）は従来の単一バインド@weight100と**バイト完全一致**の書き出しを維持（`exportVRM()`第6引数省略時と同一）。`exprMix`はavatarデータとしてserialize/deserialize（`sanitizeExprMix()`によるRound 469型ホワイトリスト方式）・localStorage・undoスナップショット・Resetボタンに配線。ガチャはこれをランダム化しない | `build/10-core-a.js` の `EXPR_EDITABLE`/`EXPR_INGREDIENTS`/`sanitizeExprMix()` / `build/12-core-c.js` の `bindN()` / `build/20-app.js` の `renderExprEditor()`/`setExpr()` |
| 481 | 複数段Undo/Redo（Ctrl+Z / Ctrl+Shift+Z）。単一スナップショット `_undoSnap` を最大20段の `_undoStack`/`_redoStack` 配列に一般化。1.5秒以内の連続編集を1操作にまとめる既存デバウンス挙動は完全維持。新規編集で `_redoStack` をクリア（標準的なUndo/Redoの意味論）。設計判断（段数上限20・メモリ方針=params/meta/exprMixの軽量structuredCloneのみでジオメトリ非依存）は本ラウンドで確定済み | `build/20-app.js` の `_undoStack`/`_redoStack`/`_snapState()`/`doUndo()`/`doRedo()` |
| 482 | Round 481の自己レビューで発見: undo/redo実行後、直前の編集の捕捉タイムスタンプから1.5秒以内に**新規**編集を行うと、デバウンス判定が誤って「同一セッションの続き」と扱いプッシュをスキップし、結果として `_redoStack` がクリアされず古い未来状態が残存（後で redo すると無関係な状態にジャンプしてしまう）。`doUndo()`/`doRedo()` が状態復元後に `_undoAt = 0` をセットし、次の `captureUndo()` を強制的に新規セッション扱いにすることで解消 | `build/20-app.js` の `doUndo()`/`doRedo()` 内 `_undoAt = 0` |
| 483 | Round 481のRedo（Ctrl+Shift+Z）に発見可能性ギャップ（ボタン無し・キーボードのみで、Undo実行後にRedoが使えることを示すUI要素が皆無）を Round 474→475（`?seed=`共有URL→Copy Linkボタン）と同型の追跡で発見。`doUndo()` は末尾で新規i18nキー `hint.redoReady`（「Ctrl+Shift+Z → やり直す」）をヒントバーに3秒フラッシュ、`doRedo()` は対称的に既存の `hint.undoReady` を再フラッシュ（Redo後はUndoが再び使える、という事実をそのまま流用）。両者とも既存の `_undoHintTimer` を共有再利用（新規タイマー変数なし） | `build/10-core-a.js` の `hint.redoReady` / `build/20-app.js` の `doUndo()`/`doRedo()` 末尾のフラッシュ処理 |
| 484 | Round 483の自己レビューで発見: 新設のヒントバーフラッシュは視覚のみ（`h.textContent`）で、`srStatus`には一切反映されなかった。既存の `captureUndo()` は同じメッセージをヒントバーとsrStatusの両方に出す前例があるため、スクリーンリーダーユーザーは「元に戻しました/やり直しました」は聞こえてもRedo/Undoショートカットの存在を一切知る手段がなかった（晴眼ユーザーとの体験差）。`doUndo()`/`doRedo()` の `sr.textContent` を単一の結合メッセージ（例:「元に戻しました — Ctrl+Shift+Z → やり直す」）に変更し、ヒントバーと同じ `noExprActive` 条件で両方をゲート（表情プレビュー中は元々ヒントも出ないため、SR側も出さない一貫性を維持） | `build/20-app.js` の `doUndo()`/`doRedo()` 内 `sr.textContent = noExprActive ? ... : ...` |
| 485 | `onParam()` に構造の似た2つの「bool切替→renderBody(false)→再フォーカス」分岐（`springOff`（旧）と`outline`（Round 473・新））があり、`springOff` 側は表示された注記（`note.springOff`/`note.quest`等）をsrStatusにも常に反映する前例が既にあったが、`outline` 側は同じ形をコピーした際にこの反映処理だけ引き継がれていなかった。晴眼ユーザーはチェックボックス直下に「アウトラインはPC限定・Quest非対応」という実用上重要な注記（`note.outline`）を見られるが、スクリーンリーダーユーザーはチェック状態の変化しか聞こえず、この互換性注意事項を一切知る手段がなかった。`params.outline`がtrueになった時（＝注記が可視化される時）にのみ`t('note.outline')`をsrStatusへ反映するよう修正（オフ時は対応するメッセージが存在しないため無反応のまま） | `build/20-app.js` の `onParam()` 内 `k==='outline'` 分岐 |

## 3. 未対応の不足（優先順位順）

### 3-1. 指ボーン＋指モーフ（v0.2項目）— **視覚検証手段の確保が前提条件**

数値上は実現可能と確認済み：
- 骨予算: 現在29本（twin髪型時）+ 指30本（3節×5指×2手）= 59本 < Quest Excellent閾値75本
- 三角形予算: 現在約1,961 tris、閾値7,500に対し約5,500の余裕。指形状は数百tris程度
- スキニングは頂点ごとの明示指定方式（`build/11-core-b.js` の `addV()`）で、既存の手首ブレンド（`[[la,0.65],[ha,0.35]]`）と同じパターンで記述可能
- 現在の手は `sphereBand()` によるミトン形状（`build/11-core-b.js` の「mitten hand」コメント箇所）

**見送り理由**: AI実行環境ではWebGL出力を忠実にレンダリングできず（ヘッドレスChromium+SwiftShaderで検証したがテクスチャ/ライティングに忠実度ギャップあり）、特にボーン回転時（VRChatのジェスチャー）の変形品質を保証できない。**人間が実ブラウザ+Unity/UniVRMで視覚確認できる体制ができてから**着手すること。

### 3-2. 髪型・衣装プリセット追加（v0.2項目）

3-1と同じ理由（新規メッシュ形状の視覚品質を保証できない）で見送り。同じ前提条件で解除。

### 3-3. v1.0系（VRM 1.0出力・VRMA・プリセット共有形式）

`CLAUDE.md` の「VRM 0.x固定」制約により当面凍結。制約自体の変更はユーザー判断事項。

### 3-4. 既知の軽微な問題（修正保留）

- 3Dプレビューのマルチタッチ: 回転ドラッグ中に2本目の指が触れると視点が一瞬跳ぶことがある（`build/20-app.js` のポインタ処理。camDistのクランプで被害は限定的）。深刻度低・発生頻度低のため保留

## 4. 実装しないと判断した過剰（7件）

以下は検討のうえ**意図的に実装しなかった**。再提案する場合は下記の判断理由を覆す根拠を示すこと。

| # | 却下した機能 | 判断理由 |
|---|------|---------|
| 1 | ~~Undo/Redoフルスタックを小修正の一環として実装~~ | ~~「1ラウンド=1つの焦点を絞った修正」の原則を超える~~ → **Round 481で独立した1ラウンドとして実装済み（保守的スコープ: 20段・redoは新規編集でクリア）。この却下は「不関連ラウンドへの便乗実装」のみを対象としており、専用ラウンドでの実装まで永続的に禁じるものではなかった** |
| 2 | ガチャロックをパラメータ単位（30個超）に細分化 | 5カテゴリで実用十分。粒度過多はUIの複雑化のみ招く |
| 3 | 物理タブ（hairStiff等）用の6個目のロック | 副次的パラメータで、常に再生成されても実害がない |
| 4 | エクスポート進捗バー | `docs/SPEC.md` §7 で書き出し<2秒と規定済み。進捗表示が必要な長さではない |
| 5 | 複数アバター保存スロット/プロジェクト管理 | 「クラウド保存を持たない」設計思想（SPEC §1）と方向が逆。既存のJSON手動保存で代替可能 |
| 6 | 共有リンクへのプレビュー画像同梱 | スコープ外の複雑化。スクリーンショット機能（Ctrl+Shift+P）で代替可能 |
| 7 | 「初期化」ボタンでガチャロックもクリア | ロックは `lang`/`mode` と同じ「ツール設定」区分（アバターデータではない）。初期化が消さないのが既存挙動と一貫 |

## 5. 検証済み・問題なし（8件）

以下は監査で調査し**問題なしと確認済み**。再調査は時間の無駄なので省くこと（コードを変更した場合は別）。

1. **Rank推定の境界値**: `build/10-core-a.js` の `RANKS` テーブルは `docs/SPEC.md` §6 と数値完全一致。境界比較は `v<=arr[j]`（閾値ちょうどは良い方のランク）で一貫
2. **プリセット「元に戻す」**: 非表示パラメータ含め全復元・`captureUndo()` 済み・ガチャ後の非表示化も正常
3. **揺れ物ゼロ時のVRM出力**: 常に有効な `{boneGroups:[], colliderGroups:[]}` を出力。undefined混入なし
4. **カラースウォッチ**: aria-label（色名）・aria-pressed・role=group・`<input type="color">` 併設でWCAG AA準拠
5. **VRM0メタ**: `otherPermissionUrl` 空欄は仕様（SPEC §5.6）。`firstPerson`（ボーンオフセット・meshAnnotations・lookAt曲線）も正常
6. **通信ゼロ**: `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`/外部 `<link>`/`@import` すべて不存在。faviconも data: URI
7. **ファイルサイズ**: index.html 180KB（gzip 57KB）。477ラウンド経ても console.log 等のデバッグ残骸ゼロ
8. **チェックボックスのタッチターゲット（18px）**: WCAG AAA（2.5.5 の44px）未満だが、プロジェクトの目標は AA（SPEC §7）なので対応不要

このほか、doExport の finally によるフラグ復帰、About ダイアログのフォーカス管理（inert+復帰）、devicePixelRatio/リサイズ処理（RAFループで毎フレーム検出）、ガチャシードの決定性（mulberry32・隠れエントロピーなし）も検証済みで問題なし。

## 6. 作業を引き継ぐ場合の手順

```bash
# 1. ソースを編集（index.html は直接編集禁止。build/ 配下のみ）
#    00-head.html = CSS/マークアップ
#    10-core-a.js = スキーマ/i18n/Rank（純粋ロジック・DOM禁止）
#    11-core-b.js = リグ/メッシュ/モーフ（同上）
#    12-core-c.js = GLB/VRMライター/selfTest（同上）
#    20-app.js    = UI/WebGL

# 2. 結合（この順序固定）
cat build/00-head.html build/10-core-a.js build/11-core-b.js build/12-core-c.js build/20-app.js > index.html

# 3. テスト（0 failed になるまでコミット禁止）
node tests/run.js
```

**テスト追加の規約**（`tests/run.js`）:
- 新ラウンドのテストブロックは、直前ラウンドのブロックの**直前**（ファイル上でより上）に挿入する
- ソース検査型テストの正規表現ウィンドウ `[\s\S]{0,N}` は実測+2割の余裕で設定。コード変更で既存ラウンドのテストが割れたら、そのテストのウィンドウ/パターンを更新し、コメントに「RoundXXXで更新」と残す
- パラメータ・UI文言の追加は ja/en 両方の i18n キーが必須（パリティテストが自動検出する）

**コミット規約**: メッセージ先頭に `Round N:`、ブランチは `claude/product-swot-analysis-bozq7s`、テスト数と 0 failed をメッセージ末尾に記載。
