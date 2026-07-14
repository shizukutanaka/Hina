# 雛 (Hina) 機能監査 — 過不足リスト（2026-07時点）

## 0. この文書について

この文書は、AIコーディングセッション（コミット履歴上「Round 464」〜「Round 477」と呼ぶ14回の改善サイクル）で実施した機能監査の結果を、**前提知識のない後続セッションが読んで作業を引き継げる形**で記録したものである。Round 479 で §3-1 の表情エディタ、Round 481 で複数段Undo/Redoを実装したため、両項目を §2 へ移動済み。Round 490 で §5-8（当時「対応不要」と判定したチェックボックスのタッチターゲット）が WCAG 2.2 の新設基準により再判定・対応済みとなったため、同項目も §2 へ移動済み。

- 「Round N」はコミットメッセージ先頭の通し番号。`git log --oneline` で対応コミットを特定できる
- 本文書更新時点のテスト数は **1985 passed / 0 failed**（`node tests/run.js`）
- 次に新しい変更を行う場合の通し番号は **Round 508**（Round 478 = 本文書の追加、Round 479 = 表情エディタ実装、Round 480 = 表情エディタのSRスパム修正、Round 481 = 複数段Undo/Redo実装、Round 482 = Undo/Redoのdebounceウィンドウ境界バグ修正、Round 483 = Redoショートカットの発見可能性修正、Round 484 = Undo/Redoヒントのスクリーンリーダー対応、Round 485 = outlineトグルのSRアナウンス漏れ修正、Round 486 = ファイル入力JSON読込のMIME/拡張子チェック漏れ修正、Round 487 = saveJson()のフォーカス復帰漏れ修正、Round 488 = 表情ミックス数値入力のクランプ未アナウンス修正、Round 489 = sphereBand()のポール零面積三角形修正、Round 490 = カラースウォッチ/チェックボックスをWCAG 2.2 SC 2.5.8準拠の24pxへ拡大、Round 491 = メタデータ入力2箇所のcaptureUndo()漏れ修正、Round 492 = sanitizeMeta()のenum値検証追加、Round 493 = loadState()のlastGachaSeed復元にclampSeed()ガード追加、Round 494 = RANKSテーブルにRaycastsカテゴリ追加（外部一次ソース照合で発見）、Round 495 = loadState()のmetaマージがsanitizeMeta()を経由していなかったprototype pollution修正、Round 496 = スライダーのHome/End/PageUp/PageDownがcaptureUndo()を呼んでいなかった不具合修正、Round 497 = Round 490の.rowスコープ付きチェックボックスCSSがガチャロックに一度も適用されていなかった不具合の訂正、Round 498 = 同根の.rowスコープ付きnumIn CSSがガチャシード入力に一度も適用されていなかった不具合修正、Round 499 = .eBtn.active/.tab[aria-selected]のforced-colors対応漏れ修正、Round 500 = document.title書込み3箇所の競合をtitledStem()/updateTitle()に統一、Round 501 = Aboutダイアログのinert背景化が#skipLinkを対象範囲から漏らしていた不具合修正、Round 502 = .row input[type=text]がtype=urlに変更されたライセンスURL欄に一度も適用されていなかった不具合修正、Round 503 = hasSkirt判定の重複リストをSKIRT_OUTFITS/hasSkirt()に単一情報源化（予防的修正）、Round 504 = saveJson()に_savingJson再入防止ガードを追加、Round 505 = doExport()のテクスチャアトラスがスナップショット漏れでデータ破損しうる不具合修正、Round 506 = モーフターゲットaccessorのmin/maxがglTF仕様の厳密一致要件に違反していた不具合修正、Round 507 = Caps Lock有効時にCtrl(+Shift)+S/Z/Pショートカットが無反応になる不具合修正）

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

### セキュリティ（4件）

| Round | 内容 | アンカー |
|-------|------|---------|
| 469 | JSON読込のprototype pollution対策。`deserialize()` が meta を無検証で返し、アプリ側の `Object.assign(meta, d.meta)` で `__proto__` キーがプロトタイプを書き換え得た。ホワイトリスト方式の `sanitizeMeta()` を追加 | `build/10-core-a.js` の `META_KEYS` / `sanitizeMeta()` / `deserialize()` |
| 470 | クリップボード貼り付けのDoS対策。ファイル読込・ドラッグ&ドロップにある2MB上限が貼り付け経路になく、巨大文字列で `JSON.parse` がハングし得た。同じ2MBガードを追加 | `build/20-app.js` の `pstj` ボタンonclick内 `text.length > 2*1024*1024` |
| 492 | Round 469の`sanitizeMeta()`はキー名のホワイトリスト化のみで**値の検証が皆無**だった。enum型5フィールド（allowed/violent/sexual/commercial/license）に任意文字列が素通りする一方、兄弟の`sanitize()`はPARAMSのenumを`s.opts.includes(v)`で検証済み・書き出し側`exportVRM()`も独自`pick()`ガード持ちで、中間層だけ無防備。実害: 不正enum入りJSONを読み込むと`<select>`は先頭項目を表示するが内部stateは不正値のままで、「パラメータ保存」で`serialize()`が無検証のまま書き戻し（同じ行でexprMixには`sanitizeExprMix()`適用済みという非対称）、load→resaveのたび破損が永続する「表示と保存の食い違い」。修正: enum一覧を`META_ENUMS`として単一情報源化し、(1)`sanitizeMeta()`が不正値をキーごと落とす（=キー欠落と同じ意味論。マージ先はMETA_DEFAULTS起点なので状態は常に有効）、(2)`serialize()`が`meta:sanitizeMeta(meta)`で対称防御、(3)`exportVRM()`の`pick()`4箇所とUIの`selRow`5箇所のインライン配列を`META_ENUMS`参照へ置換（選択肢と検証リストの乖離を構造的に不可能に）。副次: Round 479時の消し忘れだった旧`serialize(p,meta)`デッドコード（後勝ち宣言で隠蔽されていた）も削除 | `build/10-core-a.js` の `META_ENUMS` / `sanitizeMeta()` / `serialize()` |
| 495 | Round 469が防いだのと**全く同じ攻撃パターン**が`loadState()`に残っていた。`loadState()`は`params`（`HINA.sanitize()`）と`exprMix`（`HINA.sanitizeExprMix()`）の間で`meta`だけ`if (j.meta && typeof j.meta==='object') Object.assign(meta, j.meta)`という無検証マージを行っており、`j`はlocalStorageから`JSON.parse`した信頼できない起源のデータ（不正拡張機能・DevTools手動編集・同一オリジンの別ページによる汚染等で改竄されうる）。`JSON.parse('{"__proto__":{"polluted":"yes"}}')`は`__proto__`という**自己所有プロパティ**を生成し、`Object.assign`の`[[Set]]`操作がAnnex Bのアクセサ経由でターゲットのプロトタイプそのものを書き換えることをNode実行で実証済み（`Object.getPrototypeOf(target)===Object.prototype`が`false`になる）。`deserialize()`経由の貼付・ファイル読込・ドラッグ&ドロップの3経路はRound 469で対策済みだったが、**ページ読み込みのたび無条件実行される`loadState()`だけ**が唯一の無防備な経路として残っていた（4経路中最も実行頻度が高い）。修正: `Object.assign(meta, HINA.sanitizeMeta(j.meta))`に変更（`sanitizeMeta()`は非object/null入力を`{}`として扱うため`typeof`ガードは冗長化し削除、`params`/`exprMix`と同じ形に統一）。`sanitizeMeta`をHINAの公開エクスポートに追加（従来`serialize()`/`deserialize()`内部専用だった） | `build/20-app.js` の `loadState()` / `build/12-core-c.js` のHINAエクスポート |

### 堅牢性（8件）

| Round | 内容 | アンカー |
|-------|------|---------|
| 507 | 複数角度並列調査ワークフローで発見（Round 506と同じ監査セッション）。`KeyboardEvent.key`はCaps Lock状態を文字キーの大文字小文字へ反映する（例: Caps Lock有効+Shift無しで's'キーは`e.key==='S'`を報告し、Caps Lock有効+Shift併用では大文字小文字反転が2回打ち消し合い`e.key==='s'`に戻る）。`Ctrl+S`/`Ctrl+Shift+S`/`Ctrl+Z`/`Ctrl+Shift+Z`/`Ctrl+Shift+P`の5ショートカットは全て`e.key`を固定の大文字小文字リテラルと比較していたため、Caps Lockが有効な間はどちらのShift状態でも該当する分岐が一つも一致せず**無反応になっていた**。さらに深刻な点として、いずれの条件にも一致しないため`e.preventDefault()`が一度も呼ばれず、例えば`Ctrl+S`はブラウザネイティブの「ページを保存」ダイアログへフォールスルーしうる（単に無反応より悪い体験）。修正: `key = e.key.length===1 ? e.key.toLowerCase() : e.key`で1文字キーを小文字へ正規化し、大文字小文字非依存の`e.shiftKey`のみで各ショートカットの変種を判別する方式に統一（`m`/`M`モード切替ショートカットが既に両ケースを個別チェックする形で対応済みだったのと同じ問題を、正規化により一般化） | `build/20-app.js` の `document.addEventListener('keydown', ...)` |
| 505 | Round 504の非同期再入防止監査を継続し、より深刻な**データ破損**バグを発見。`doExport()`は「Snapshot all mutable state so slider/meta changes during async awaits don't affect the export」というコメント付きで`params`/`meta`/`exprMix`/`build`をスナップショットしていたが、書き出しが焼き込むテクスチャアトラス（`atlas`、モジュール直下の共有canvas）だけはスナップショット対象から漏れており、2箇所の非同期待ち（`showSaveFilePicker`・サムネイル`canvasBlob`）の後で`canvasBlob(atlas)`とライブの共有canvasを直接読んでいた。`atlas`を再描画する`drawAtlas()`は`onParam()`の色変更分岐と`rebuild()`（ガチャ・プリセット取消・JSON読込・Undo/Redo経由で到達）から呼ばれるが、いずれも`_exporting`を一切チェックしない。書き出しボタン自体は無効化されるが色スウォッチ等の他のUI要素は無効化されないため、書き出し中（特に`showSaveFilePicker`のファイル保存ダイアログが開いている間、ユーザーが選択に数秒〜数十秒かけうる）に色を変更すると、書き出されるジオメトリ/メタデータは旧世代のままテクスチャだけ新世代の色で焼き込まれる、構造的には正常だが意味的に破損したGLBが生成されうる状態だった。サムネイル用の`tc`と同じパターンでオフスクリーンcanvasへ同期的にコピーする`exportAtlas`を追加し修正。同じ調査で発見した副次的な不整合として、`doScreenshot()`も`cv.toBlob()`のピクセル捕捉自体は呼び出し時点で凍結される（ブラウザ仕様）が、ファイル名/共有タイトル（`fnameStem()`/`meta.title`）は非同期コールバック内でライブに読み直しており、Undo/Redoがそのわずかな隙間に割り込むとキャプチャされたピクセルと異なる世代のファイル名が付与されうる（テクスチャ破損より軽微だが同根）ため、こちらも呼び出し前に同期スナップショット化 | `build/20-app.js` の `doExport()` 内 `exportAtlas` / `doScreenshot()` 内 `scrFname`/`scrTitle`/`scrText` |
| 504 | 3つの非同期ファイル書き込み処理（`doExport`/`doScreenshot`/`saveJson`）を横並び比較して発見: `doExport()`は`_exporting`、`doScreenshot()`は`_screenshotting`を最初の`await`より前に同期チェックし再入を防いでいるが、`saveJson()`だけ同等のガードが無かった。`btn.disabled=true`はマウスクリックの再発火は防ぐ（ブラウザが無効化されたコントロールへの`click`を抑制するため）が、`Ctrl+Shift+S`のグローバルキーボードショートカットハンドラはボタンの無効化状態を一切参照せず`document`から直接発火するため無力。`showSaveFilePicker()`が解決してから`w.close()`が解決するまでの間にショートカットを二度押しする（あるいはクリック後にショートカットを押す）と、同じ推奨ファイル名を対象とする独立した2つの直列化+書込みシーケンスが起動しうる。File System Access APIの`close()`には順序保証が無いため、後に発火した（新しい）呼び出しの`close()`より先に古い呼び出しの`close()`が解決すれば、画面上は最新状態の保存に成功したとSRへ通知されるにもかかわらず、実際にディスクへ残るのは古いスナップショットという「最後に書き込んだもの勝ち」の不整合が起こりうる。修正: `_savingJson`フラグを新設し、`doExport`/`doScreenshot`と同型のガード（最初の`await`前に同期チェック→即return、共有クリーンアップ関数`_done()`内でリセット）を追加 | `build/20-app.js` の `saveJson()` 内 `_savingJson` |
| 465 | 破損VRMのサイレントダウンロード防止。書き出し直前にGLBヘッダ（マジック `0x46546C67`・version=2・長さフィールド）を検証し、不正なら `hint.exportCorrupt` を表示して中断 | `build/20-app.js` の `doExport()` 内、`HINA.exportVRM()` 呼び出し直後 |
| 472 | Windows予約デバイス名対策。タイトルが `CON`/`PRN`/`AUX`/`NUL`/`COM1-9`/`LPT1-9` にサニタイズされるとWindowsで保存不能（拡張子付きでも不可）。該当時は末尾に `_` を付加 | `build/20-app.js` の `WIN_RESERVED` 正規表現 / `safeName()` |
| 501 | Round 411が導入したAboutダイアログの`inert`背景化（「aria-modal下でもスクリーンリーダーが背後をブラウズできるAT/ブラウザ組み合わせがある」ため`header`/`main`を手動で`inert=true`にする対策）を監査し、対象範囲の不完全さを発見。`#skipLink`（`<a href="#tabBody">`、`position:fixed;top:-4rem`でオフスクリーンだが`display:none`/`aria-hidden`/`inert`ではない実体のあるフォーカス可能要素）は`<body>`直下で`<header>`/`<main>`の**兄弟要素**（どちらの子孫でもない）として存在するが、`_dlgBg()`は`header`と`main`のみを列挙しており`#skipLink`は一度もinert化されていなかった。Round 411自身が明言した脅威モデル（AT仮想カーソルがモーダル背後をブラウズできる）がそのまま`#skipLink`にも当てはまり、ダイアログ表示中にAT経由でこのリンクを起動すると`#tabBody`（モーダルの背後）へフォーカスが移動し、モーダル境界が破られる。旧テスト（Round 411）は「`_dlgBg()`が返した要素に対してinertトグルが正しく機能するか」のみ検証しており、「その要素集合がbody直下コンテンツの完全な列挙か」は未検証だった（Round 497/498と同型の「対象範囲の網羅性を検証しない空検証」）。修正: `_dlgBg()`に`$('skipLink')`を追加（`<noscript>`はJS有効時にAT/レンダリング対象外のため対応不要と確認済み） | `build/20-app.js` の `_dlgBg()` |
| 500 | **節目のRound 500**。`document.title` を書き込む3箇所が互いに競合していた: `rebuild()`（Round 33）は`'雛 — '+fnameStem()`（情報量ありだが言語を無視し常に日本語プレフィックス）、`applyLang()`（Round 449）は多言語対応の汎用タイトル（アバター名/プリセット/シード情報が失われる）、`renderOut()`の`updateFnPrev()`は`rebuild()`と同じ日本語固定プレフィックス問題を抱えていた。起動シーケンスは`rebuild()`→`applyLang()`の順で呼ばれるため起動時は常に`applyLang()`側の汎用タイトルが勝ち、言語/モード切替やMショートカットは`rebuild()`を伴わず`applyLang()`のみを呼ぶためファイル名情報は毎回失われ、しかも出力タブが開いている場合は`applyLang()`内の`renderBody()`が`updateFnPrev()`を再トリガーして直前に設定した多言語タイトルを日本語固定プレフィックスで上書きしてしまう——「情報量」と「多言語対応」の2つの改善が**同時には成立し得ない**状態だった。単一情報源の`titledStem()`/`updateTitle()`ヘルパーへ統一（3箇所の`document.title`直接代入を全廃）。副次的に、同じ日本語固定プレフィックス問題を持っていたWeb Share（Round 405）のタイトルも同じヘルパーに統一 | `build/20-app.js` の `titledStem()` / `updateTitle()` |
| 493 | `lastGachaSeed` を書き込む3箇所（手動シード入力onchange・`?seed=`URLパーサー・`loadState()`）のうち、前者2つは`round→負値拒否→[0,4294967295]クランプ`を一貫して行うのに`loadState()`だけ`Number.isFinite()`のみで負値・非整数・オーバーフローを素通りさせていた。Round 474の「共有リンクが嘘をつかないため」という不変条件があるにもかかわらず、localStorageや貼付JSON経由で汚染された`lastGachaSeed`がシード欄の表示・共有リンク（`?seed=-5`等、再読込時にURLパーサー自身の`n>=0`チェックで弾かれ嘘リンク化）・書き出しファイル名に伝播しうる状態だった。Round 492の`META_ENUMS`と同型の単一情報源化として`clampSeed()`ヘルパーを新設し、3箇所すべてがこれを参照するよう統一 | `build/20-app.js` の `clampSeed()` / `loadState()` / seedIn `onchange` / `?seed=`URLパーサー |

### エラーメッセージの正確性（2件）

| Round | 内容 | アンカー |
|-------|------|---------|
| 467 | スクリーンショット失敗が「VRM書き出しに失敗」と誤表示していた。専用キー `err.screenshotFailed` を追加 | `build/20-app.js` の `doScreenshot()` 内2箇所 |
| 468 | 2MBサイズ超過が「形式が不正」と誤表示していた。専用キー `err.loadTooLarge` を追加（ファイル読込とドラッグ&ドロップの両経路） | `build/20-app.js` のサイズガード2箇所 |

### ジオメトリ正確性（1件・core層）

| Round | 内容 | アンカー |
|-------|------|---------|
| 489 | Round 464-488はほぼ全て`build/20-app.js`（UI層）対象だったため、core層（`build/10-core-a.js`/`11-core-b.js`/`12-core-c.js`）へ監査対象をシフトして発見。`sphereBand()`（頭部/手/足/頭皮キャップに使う球面プリミティブ）は極（phi=0またはπ、sin(phi)=0）に位置するリングの全頂点が同一座標に潰れる（頂点インデックスは別々だが位置が完全一致）にもかかわらず、汎用の2三角形クアッド分割ロジックがそのまま適用され、極に接する三角形が常に**面積ゼロの縮退三角形**として出力されていた。既存のRound 131「縮退三角形なし」テストは頂点**インデックス**の重複のみ検査しており頂点**位置**の重複は検査していなかったため、デフォルトアバターの全1961三角形中112枚（約5.7%）が不可視の無駄な三角形として本番コードに常時存在していた（全PARAMS組み合わせで決定論的に再現、乱数20,000サンプルで確認）。**視覚的リスクなし**（面積ゼロの三角形は除去しても描画結果が変わりようがないため、このAI実行環境のWebGL検証限界と無関係に安全な修正）。`sphereBand()`内で極リングを`sin(phi)<1e-9`判定し、縮退する側の三角形のみをスキップ（生存する三角形のインデックス・巻き順は完全に不変）。Round 131のテストも位置ベースの外積面積チェックに強化し、この種のバグが再発しても検知できるようにした。全プリセット・全outfit×hairStyle組み合わせで一律-112 tris（頂点数は不変） | `build/11-core-b.js` の `sphereBand()` |

### GLB/VRM仕様準拠性（1件・core層、外部ワークフロー監査で発見）

| Round | 内容 | アンカー |
|-------|------|---------|
| 506 | 複数の新角度を並列調査するワークフロー（7観点・アドバーサリアル検証付き）で発見。`exportVRM()`のモーフターゲット（表情等12個）のglTFスパースaccessorは、宣言する`min`/`max`をソート済みエントリの**未丸めfloat64**デルタ値から計算していたが、実際にバッファへ書き込まれる値は同じデルタを`Float32Array`へ代入した際に**float32へ丸められた**別の値（`valBuf`）だった。glTF 2.0仕様はaccessorのmin/maxが実データと厳密に一致することを要求しており（Khronos公式glTF-Validatorは不一致を`ACCESSOR_MIN_MISMATCH`/`ACCESSOR_MAX_MISMATCH`としてError扱い）、本体上部のメインPOSITION accessorは既に丸め後の`Float32Array`（`fPos`）から`minMax3()`で算出していて問題なかったが、モーフターゲット側だけこの不一致を持っていた。Node上でGLBを実際に書き出し、JSON chunk + BIN chunkを手動でパースしてスパースaccessorの実バイトからmin/maxを再計算し宣言値と比較したところ、デフォルトアバター・ガチャ乱数複数ロールいずれも**12/12（100%）が不一致**（決定論的に毎回発生、特殊なパラメータ組み合わせ不要）。修正: `valBuf`（丸め後のFloat32Array）を構築してからmin/maxをそこから計算するよう順序を入れ替え、メインPOSITION accessorと同じパターンに統一。修正後は同じ検証で0/48（デフォルト+3ガチャロール）に。既存のRound 117テストは「min[k]≤0≤max[k]」という**必要だが不十分な**条件のみ検査しており、この不一致を検知できていなかった（sparse indicesの実バイト読み戻しは既存パターンがあったため、同じ手法をmin/max検証にも適用して強化） | `build/12-core-c.js` の `exportVRM()` 内モーフターゲット`min`/`max`計算 |

### ランク基準値の正確性（1件・外部一次ソース照合）

| Round | 内容 | アンカー |
|-------|------|---------|
| 494 | 本セッションで初めて外部リサーチ（WebFetch）による一次ソース照合を実施。`RANKS`テーブルの出典日として明記済みの2026-04-21版を creators.vrchat.com「Performance Ranks」で再取得したところ、既存の全カテゴリ（Triangles/Bones/SkinnedMesh/Mesh/Material/PB部品/PB変換/PBコライダ/PB衝突/TexMem、PC・Quest両方）は数値完全一致（乖離ゼロ）を確認したが、同じ2026-04-21同期（VRChat 2026.2.1）で追加されていた「Raycasts」カテゴリ（PC 1/4/8/15・Quest 1/2/4/8）が`RANKS`テーブルに欠落していた。CLAUDE.mdの「改定時はcoreのRANKSテーブルのみ更新」という規約に該当する構造的乖離（値の改定ではなく行の追加）。雛はVRC Raycastコンポーネントを一切出力しないため`estimate()`は常にraycasts:0を返し、両プラットフォームとも常にExcellent圏（律速要因になり得ない）で、既定6プリセットのランク保証への実害はなし。`RANKS.pc/quest.raycasts`・`estimate()`の`raycasts:0`・`cat.raycasts`のja/en i18nラベルを追加し、`docs/SPEC.md`§6の基準値一覧も同期。既存の`rank()`が`for(const cat in T)`で全カテゴリを走査する実装だったため、テストコード側で手組みしていた複数の合成statsオブジェクト（`raycasts`キー欠落）がrank()に「undefined <= 閾値」として最悪ランク扱いされ壊れたが、これはテスト側の不備であり本体コードの不具合ではない（`base`オブジェクトに`raycasts:1`を追加して解消） | `build/10-core-a.js` の `RANKS` / `estimate()` / `I18N.cat.raycasts` |

### アクセシビリティ（6件、うちRound 497はRound 490の訂正）

| Round | 内容 | アンカー |
|-------|------|---------|
| 464 | Firefox+NVDAの幽霊「Alert」読み上げ対策。非表示要素に `role="alert"` と `aria-live="assertive"` を併記するとDOM再描画のたびに空でも読み上げられる既知バグ（WordPress Trac #36289）。`role` を除去し `aria-live` のみに | `build/00-head.html` の `#srAlert` 要素 |
| 466 | WebGL喪失時のスクリーンショット失敗を polite（srStatus）から assertive（`showErr()`）に格上げ | `build/20-app.js` の `doScreenshot()` 冒頭ガード |
| 471 | 保存失敗アナウンスのスパム抑制。保存は編集後500msデバウンスのため、localStorage故障中に入力を続けると約500ms毎にスクリーンリーダーへ割り込みが発生していた。故障状態への**遷移時に1回だけ** `showErr()` する方式に（バッジ表示は毎回更新） | `build/20-app.js` の `saveState()` catch節、`wasBroken` / `_lsBroken` |
| 490 | カラースウォッチ（20px・gap5px）とチェックボックス（18px）のタッチターゲット拡大。旧監査（§5-8、当時の項番8）は「WCAG 2.1ではターゲットサイズはAAA(2.5.5, 44px)のみでAA相当の基準が存在しない」との前提で対応不要と判定していたが、この前提は**WCAG 2.2（2023年10月勧告）で陳腐化**していた。2.2はSC 2.5.8 Target Size (Minimum) をLevel AAとして新設し、24×24 CSS px未満のターゲットは中心間距離24px以上の「spacing」例外を満たさない限り不適合となる。実測するとスウォッチは20px+gap5px=中心距離25pxで例外をぎりぎり満たすが、ガチャロックのラベル群（Round 476、`lockWrap` の `gap:4px 12px`）は18pxチェックボックス+行間4pxで折返し時の中心間距離が約22px<24pxとなり不適合だった。両方とも24×24pxへ拡大し、例外条件に頼らず直接充足する形に修正（SPEC.md §7 の目標を「WCAG AA」→「WCAG 2.2 AA」へ明記） | `build/00-head.html` の `.sw` / `.row input[type=checkbox]` |
| ~~490~~→497 | **訂正**: Round 490の「ガチャロックのチェックボックスも24×24pxへ拡大した」という記述は誤りだった。修正したCSSルール`.row input[type=checkbox]`は`.row`クラスを持つ祖先が必要な子孫セレクタだが、`lockWrap`/各`<label>`（`build/20-app.js`のガチャロックUI）は`style:`属性のみで`class:'row'`を一度も持たない（`el()`ヘルパーは`class`キーを明示的に渡した時だけ`className`を設定する実装のため）。つまりこのルールはRound 476の実装当初から**一度もガチャロックの5個のチェックボックスに適用されたことがなく**、Round 490時点でも18pxではなくブラウザ既定サイズ（多くの環境で13-16px程度）のまま出荷され続けていた。当時のRound 490テストも「CSSルールのテキストがファイル中に存在するか」しか検査しておらず、実際にこの対象マークアップへ適用されるかは未検証（Round 496のstale-literal発見と同種の「検証していない主張」型の空検証）。修正: `.row`スコープを外し`input[type=checkbox]{width:24px;height:24px;...}`へ変更（アプリ全体でチェックボックスはこの2箇所のみと確認済みのため、スコープを外しても安全）。テストもマークアップ実体（`lockWrap`が`class:'row'`を持たないこと自体・ルールが`.row`プレフィックス無しであること）を直接検証する形に強化 | `build/00-head.html` の `input[type=checkbox]` |
| 499 | Round 440の`forced-colors`（Windows High Contrast Mode）対応を横展開して発見: `.preCard.selected`（プリセットカード選択状態）は`border-color`+`rgba`背景のみで表現され、forced-colors下では両方ともUAに上書きされるため`outline:2px solid Highlight`で復元済みだったが、全く同型の「色のみで選択状態を表現する」パターンが2箇所見過ごされていた。(1) `.eBtn.active`（表情プレビューの切替ボタン、`background`+`color`のみで現在プレビュー中の表情を示す）はforced-colorsブロック自体（Round 240）より前から存在（Round 104）しており、Round 240/440でブロックが導入・拡張された際に一度も見直されていなかった。(2) `.tab[aria-selected="true"]`（タブの選択状態、`color`+`border-bottom-color`のみ）も記録上追跡可能な最古のcommit時点から同型の未対応だった。両者とも`aria-pressed`/`aria-selected`はスクリーンリーダー向けに正しく設定済みだが、forced-colorsが対象とする「晴眼の高コントラストモードユーザー」には選択状態を伝える手段が皆無だった。`.preCard.selected`と同じ`outline:2px solid Highlight`をforced-colorsブロックへ追加（タブは`#tabs`に隣接タブ間の`gap`が無く枠線が隣に滲み出るため`outline-offset:-2px`で内側描画に調整） | `build/00-head.html` の `@media (forced-colors:active)` 内 `.eBtn.active` / `.tab[aria-selected="true"]` |

補足: エラー系アナウンスは `showErr(msg)` に統一されている（hint バー赤表示 + srStatus + srAlert への rAF 経由書き込み + 5.5秒後クリア）。エラー経路で `srStatus` に直接書くのは既存方針に反する。

### CSSセレクタスコープの不整合（3件・Round 497, 498, 502）

本セッションで新たに発見したバグの型: `build/00-head.html` の一部CSSルールが `.row 子孫` のような祖先クラス依存の子孫セレクタ、または `input[type=text]` のような属性値限定セレクタで書かれているが、`build/20-app.js` 側の対象マークアップが実際にはその条件（祖先クラス／属性値）を満たしておらず、ルールが**構文上有効なまま一度も対象要素に適用されていない**というパターン。見た目上は「対応するCSSルールがある」ように見えて実際には無関係、という静的検査でしか見つからない類のバグ。旧テストはCSSルールの**文字列がファイル中に存在するか**しか検査しておらず、対象マークアップへの到達性は未検証だった（空検証）。

| Round | 内容 | アンカー |
|-------|------|---------|
| 497 | `.row input[type=checkbox]`（Round 490）がガチャロックの5個のチェックボックスに一度も適用されていなかった。詳細は上表「アクセシビリティ」Round 497行参照 | `build/00-head.html` の `input[type=checkbox]` |
| 498 | Round 497と同根: `.row input.numIn`（基本スタイル・スピンボタン非表示・hover・iOS自動ズーム防止の計4ルール）はガチャシード入力（`seedIn`、`build/20-app.js`）に一度も適用されていなかった。`seedIn`の祖先チェーン（`seedRow`→`gDiv`→`#tabBody`）はどこにも`class:'row'`を持たない一方、他の2つの`numIn`インスタンス（`paramRow()`の`valEl`・`renderExprEditor()`の`numEl`）はいずれも`.row`でラップ済み。実害: シード欄だけ非テーマ背景・枠なし・高さ不揃いの素のnumber inputとして表示され、スピンボタンも他の全numIn欄（Round 251で非表示化済み）と異なり表示されたまま、hoverでのアクセントボーダーも出ず、モバイルではiOS Safariのフォーカス時自動ズーム防止（16px指定、Round 407）も効かない。記録上追跡可能な最古のcommit（`19b5901`）時点で既にこの不整合が存在しており、後発の回帰ではなく実装当初からの不具合。修正: `.numIn`関連4ルール全てを`.row`スコープから外す（`numIn`はこの3箇所にしか使われないため安全）。テストもマークアップ実体（`seedRow`が`class:'row'`を持たないこと自体）を直接検証する形に強化 | `build/00-head.html` の `input.numIn` |
| 502 | Round 497/498とは異なる派生型（祖先クラス欠落ではなく**属性値の不一致**）: `.row select,.row input[type=text]`（基本スタイル+モバイル16px自動ズーム防止の計2ルール）は「`.row`内のテキスト入力は全て`type=text`」という前提で書かれていたが、Round 433がライセンスURL欄（`licUrlInp`）をネイティブURLキーボード/検証API目的で`type='text'`→`type='url'`へ変更した際、この2ルールは更新されなかった。`licUrlInp`自体は`licUrlRow`が`class:'row'`を持つため祖先条件は満たしている（Round 497/498のような祖先クラス欠落ではない）が、`input[type=text]`セレクタの属性値条件を満たさないため一度もマッチしない。実害: ライセンスURL欄だけ非テーマ背景・枠なし・`flex:1`不適用（他の4つの兄弟テキスト欄=タイトル/バージョン/作者/連絡先/参考URLとは見た目が異なる）、モバイルでは16px自動ズーム防止（Round 407/498と同型のiOS Safari回帰）も効かない。Round 433以降、この欄を触った複数ラウンド（442, 458, 459, 491, 495等）はいずれも挙動・a11yテストを追加したが、CSSカバレッジの欠落には一度も気づかなかった。修正: 両ルールへ`.row input[type=url]`を追加（アプリ全体で`type=url`はこの1箇所のみ、常に`.row`内と確認済みのため安全） | `build/00-head.html` の `.row input[type=text]` |

### 重複リストのドリフトリスク（1件・Round 503）

Round 497/498/502の「不完全な列挙」パターンをCSS以外へ横展開した監査で発見。**注記**: 他のRound 497/498/502とは異なり、これは**現時点で実害が発生している既存バグではない**——発見時点で2つのリストの値は完全一致していた。「将来ドリフトしても既存テストが検知できない」というテストの空洞化リスクへの予防的対応であり、正直にそう記録する。

| Round | 内容 | アンカー |
|-------|------|---------|
| 503 | `build/11-core-b.js`の`hasSkirt`（ジオメトリ層: どの衣装がスカートメッシュを持つか）と`build/20-app.js`の`skirtLen`行表示条件（UI層: どの衣装でスカート丈スライダーを表示するか）が、`['onepiece','sailor']`という同じ集合を指す**独立に手書きされた2つのリテラル**だった。両者を一致させる仕組みが皆無で、既存テスト（`tests/run.js`）も「`skirtLen`/`onepiece`/`sailor`という部分文字列がファイル中に存在するか」しか検査しておらず、2つのリストが**論理的に等しいか**は未検証だった（空検証）。`PARAMS.outfit.opts`に将来スカート付き/なしの新衣装が追加された際、片方のリストだけ更新されるとテストを通過したまま「見た目にスカートがあるのにスライダーが出ない」または「スカートが無いのに無意味なスライダーが出る」という不整合が発生しうる状態だった。修正: `build/10-core-a.js`に`SKIRT_OUTFITS`配列と`hasSkirt(outfit)`ヘルパーを単一情報源として新設し、ジオメトリ層・UI層の両方をこれに差し替え。テストも文字列存在チェックから、`PARAMS.outfit.opts`の全値について`HINA.hasSkirt()`の判定と実際のジオメトリ（`skirtLen`変化で頂点座標が動くか）が一致するかを検証する形に強化 | `build/10-core-a.js` の `SKIRT_OUTFITS` / `hasSkirt()` |

### 機能追加（14件）

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
| 486 | JSON読込の3経路（貼付・ファイル入力・ドラッグ&ドロップ）を横並び比較して発見: ドラッグ&ドロップは拡張子/MIMEチェックをサイズチェックより先に行い、非JSONファイルには常に正確な`err.loadFailed`を返す。ファイル入力（「パラメータ読込」ボタン）側にはこのチェックが皆無だった。`accept='.json,application/json'`属性はネイティブファイル選択ダイアログの単なるヒントに過ぎず、大半のOSの「すべてのファイル」オプションで簡単に回避されるため、非JSONファイルがそのまま`onchange`まで到達しうる。小さい非JSONファイルは無駄な読込+パース処理の後に失敗し、**より深刻なのは、2MB超の非JSONファイル（例: 写真）が実際にはフォーマットの問題であるにもかかわらず「ファイルが大きすぎます」と誤報される**点（Round 468が`err.loadTooLarge`を新設した趣旨「大きくても正当なファイルはありうる」の逆）。ドラッグ&ドロップと同一の拡張子/MIMEチェックをサイズチェックの前に追加して解消 | `build/20-app.js` のファイル入力 `onchange` ハンドラ |
| 487 | 3つの非同期ボタン（doExport/doScreenshot/saveJson）を比較して発見: doExport・doScreenshotはいずれも非同期ギャップの前に「ボタンがフォーカスされていたか」を記録し、完了後にフォーカスを復元する（無効化されたコントロールはフォーカスを`<body>`へ落とすブラウザの標準挙動への対策）。saveJson()も同じく非同期の`showSaveFilePicker`前にボタンを無効化するが、フォーカスの記録・復元が一切なかった（成功・ユーザーによるキャンセル(AbortError)・書込失敗時の`<a download>`フォールバックの全経路で未対応）。キーボード/スクリーンリーダーユーザーは「パラメータ保存」を押すたびにフォーカスを失い、隣接する見た目がほぼ同じ「VRM書き出し」「PNG」ボタンとの体験差があった（WCAG 2.4.3）。`_wasFocused`をボタン無効化前に記録し、共有クリーンアップ関数`_done()`（2箇所の呼び出しで3つの終了経路すべてをカバー）でフォーカスを復元するよう修正 | `build/20-app.js` の `saveJson()` 内 `_wasFocused` / `_done()` |
| 488 | `paramRow()`の詳細モード数値入力（`onchange`）は範囲外/非数値入力を`aria-invalid`+`aria-errormessage`+`showErr(a11y.clamped)`で常にアナウンスし1.5秒後に自動クリアするが、表情エディタ（Round 479）の同型の数値入力（各ミックススライダーに併設）は全く同じクランプ処理をしながらアナウンスが一切なかった。スクリーンリーダーユーザーが0-100の重み欄に「500」と入力すると無音で100に補正され、他タブの見た目が同一のフィールドとの体験差があった。`paramRow`と同一の`_announce()`パターンを移植（新規i18nキー不要、既存の`a11y.clamped`を再利用）。非数値入力時のフォールバック値は、レンダリング時にクロージャされた古い値ではなく`exprMix[name][morphKey]`から都度読む現在値に修正（`paramRow`が`params[k]`という生きた状態を読む方式と一致） | `build/20-app.js` の `renderExprEditor()` 内 `numEl` の `onchange` |

### Undo取りこぼし（3件・Round 491, 496）

「captureUndo()が既にある同型フィールド群の中で、1つだけ抜けている箇所」を横並び比較で探す監査を行い、同一パターンの取りこぼしを複数発見。まとめて1ラウンドで修正（Round 461/463の前例と同型: 同一修正パターンを複数箇所へ適用）。

| Round | 内容 | アンカー |
|-------|------|---------|
| 491 | 出力タブのメタデータテキスト入力を横並び比較して発見: 共通ヘルパー`txt()`（バージョン/作者/連絡先/参考URL）と手書きの`meta.title`入力はいずれも`onfocus:()=>captureUndo()`で編集前状態をスナップショットするが、ライセンスURL欄（`licUrlInp`、license==='Other'選択時のみ表示）だけ`oninput`と`onblur`検証はあるのに`onfocus`のcaptureUndo()が皆無だった。セッション最初の編集としてライセンスURLを書き換えると、見た目上は変更されているのにCtrl+Zが「元に戻す対象なし」を報告する（またはセッション後半では無関係な古い状態へ復元してしまう）。5つの兄弟フィールドと同じ`onfocus:()=>captureUndo()`を追加 | `build/20-app.js` の `licUrlInp` |
| 491 | ネイティブ`<input type=range>`は矢印キー操作時に`pointerdown`を一切発火せず直接`input`イベントのみ発火するため、`onpointerdown`だけでキー操作の編集前スナップショットは取れない。`paramRow()`の数値スライダーは`onkeydown`で矢印キーを検知し`captureUndo()`を呼ぶ対策済みだが、表情エディタ（Round 479）の各ミックス重みスライダーは`onpointerdown`のみで`onkeydown`が皆無だった。キーボード専用/スクリーンリーダーユーザーが矢印キーで重みを調整すると編集前状態が一切保存されず、直後のCtrl+Zが機能しない。`paramRow`と同じ`onkeydown:e=>{ if(/^Arrow/.test(e.key)) captureUndo(); }`を追加（`paramRow`側にある同キーでのデフォルト値リセット機能は、表情ミックスに「デフォルト値」という概念自体が存在しないため移植対象外） | `build/20-app.js` の `renderExprEditor()` 内 `r`（範囲スライダー） |
| 496 | Round 491は「ネイティブrange inputはキー操作でpointerdownを発火しない」という正しい診断をしたが、対象を`/^Arrow/`（矢印キーのみ）に限定していた。ネイティブ`<input type=range>`はHome（最小値へジャンプ）・End（最大値へジャンプ）・PageUp/PageDown（大きい単位でステップ）でも同様に`pointerdown`なしで`input`を直接発火する——矢印キーと全く同じ抜け穴のクラスだが対象キー集合が違うだけで、Round 491時点の`paramRow()`側の元実装・表情ミックス側の修正のどちらにも存在しなかった。キーボード/スクリーンリーダーユーザーがEndキーでスライダーを最大値へジャンプさせると編集前状態が一切保存されず、直後のCtrl+Zが機能しない、または無関係な古い状態へ復元する。矢印4種+Home/End/PageUp/PageDownの8キーを`RANGE_JUMP_KEYS`という単一情報源のSetへまとめ（Round 492/493と同型のパターン）、`paramRow()`・表情ミックス双方のスライダーの`onkeydown`がこれを参照するよう統一 | `build/20-app.js` の `RANGE_JUMP_KEYS` / `paramRow()` / `renderExprEditor()` |

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

## 5. 検証済み・問題なし（11件）

以下は監査で調査し**問題なしと確認済み**。再調査は時間の無駄なので省くこと（コードを変更した場合は別）。

1. **Rank推定の境界値**: `build/10-core-a.js` の `RANKS` テーブルは `docs/SPEC.md` §6 と数値完全一致。境界比較は `v<=arr[j]`（閾値ちょうどは良い方のランク）で一貫
2. **プリセット「元に戻す」**: 非表示パラメータ含め全復元・`captureUndo()` 済み・ガチャ後の非表示化も正常
3. **揺れ物ゼロ時のVRM出力**: 常に有効な `{boneGroups:[], colliderGroups:[]}` を出力。undefined混入なし
4. **カラースウォッチ**: aria-label（色名）・aria-pressed・role=group・`<input type="color">` 併設でWCAG AA準拠
5. **VRM0メタ**: `otherPermissionUrl` 空欄は仕様（SPEC §5.6）。`firstPerson`（ボーンオフセット・meshAnnotations・lookAt曲線）も正常
6. **通信ゼロ**: `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`/外部 `<link>`/`@import` すべて不存在。faviconも data: URI
7. **ファイルサイズ**: index.html 180KB（gzip 57KB）。477ラウンド経ても console.log 等のデバッグ残骸ゼロ
8. **core層のゼロ除算/NaN**: `build/11-core-b.js` の全幾何計算関数を分析+乱数20,000サンプルの実測で検証。PARAMS全域（height=0.8〜2.0等の境界値含む）でNaN/Infinityを生成する組み合わせは存在しない
9. **GLB/VRMバイナリの境界チェック**: `nV>=65536`（Uint16頂点上限）・`bones.length>=256`（Uint8ジョイント上限）は現在のジオメトリ規模で唯一到達可能なサイズ依存パッキング判断であり、両方とも既にガード済み。全モーフ重みゼロという到達不能な組み合わせに理論上の潜在ギャップがあるが、現行PARAMS/exprMixでは発生しえない
10. **`sanitize()`のstep非丸め**: num型パラメータはmin/maxにはクランプされるがstepには丸められない（例: height=1.234567でもstep=0.01を無視して通る）。ただしファイルサイズ・決定性・書き出しいずれもstep整合に依存しないため実害なし
11. **enum/i18n整合性**: `enum.`+key+`.`+opt 形式のi18nキーとcore側のPARAMS.opts配列のドリフトは既存の自動テスト（tests/run.js 1765行付近）で検知済み

このほか、doExport の finally によるフラグ復帰、devicePixelRatio/リサイズ処理（RAFループで毎フレーム検出）、ガチャシードの決定性（mulberry32・隠れエントロピーなし）も検証済みで問題なし。

**訂正（Round 501）**: 上記「About ダイアログのフォーカス管理（inert+復帰）」は問題なしと記載していたが不正確だった。詳細は §2「堅牢性」Round 501 行を参照——`_dlgBg()` が `header`/`main` の**トグル対象自体は正しく機能する**ことしか検証しておらず、その2要素が「ダイアログ外の body 直下コンテンツの完全な列挙」になっているかは未検証だった（`#skipLink` が漏れていた）。

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
