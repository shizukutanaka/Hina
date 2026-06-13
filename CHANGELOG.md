# Changelog

形式: [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) / バージョニング: SemVer

## [Unreleased]
### Added
- enum パラメータ（目の形・眉・髪型・前髪・衣装・袖）の選択肢を日英ローカライズ表示（従来は内部ID `round`/`sailor` 等を直接表示していた）。`enum.<key>.<value>` キーで管理し、テストが全選択肢のja/enラベル網羅を担保。
- 詳細モードのスライダー横に**数値直接入力欄**を追加（SPEC §2「全パラメータ＋数値入力」の充足）。範囲外入力はクランプ。
- Performance Rank の**律速項目を明示**（SPEC F-010）。PC/Quest ランクのバッジに、ランクを律速しているカテゴリ名（日英）をツールチップ＋小テキストで表示。
- 性能カテゴリ（tris/bones/pbComp 等）に日英ラベル `cat.*` を追加。
- モーフターゲットをフル配列（全頂点×3float）から **glTF sparse accessor**（差分頂点のみ）に変更（Plan.md §リスク「v0.2でsparse化」を前倒し）。既定ビルドで 193,968 B → 2,058 B（98.9% 削減）。UniVRM互換・テスト担保。
- MToon `_OutlineWidthMode` を `1`（WorldSpace ON）から `0`（OFF）に修正。SPEC §5.5「アウトラインは既定OFF（Unity側で任意有効化）」の充足。
- 出力タブの統計表に**VRM推定ファイルサイズ**を追加（`~XXX KB`形式・テクスチャ込み）。`estimate()` が `approxBytes` を返すようになり、テストで妥当範囲を担保。
- Aboutダイアログのバージョン表示を `HINA.VERSION` から動的に設定（ハードコード `v0.1.0` を排除）。
- `note.upload` テキストから存在しない `docs/UPLOAD_GUIDE.md` の参照を削除（アプリ内ガイドで代替済み）。
### Fixed
- **ライセンスドロップダウンのローカライズ**: Exportタブのライセンス選択肢が `Redistribution_Prohibited`、`CC_BY_NC_SA` 等のraw技術値で表示されていた（`selRow` 第4引数が `null`）。`license.*` i18n キー8種（ja/en）を追加し、ユーザー向け表示（「再配布禁止」「No redistribution」等）に変更。
- **`rebuild()` エラーバウンダリ追加**: `buildAvatar()` が例外を投げた場合 `build` が null のまま機能停止していた。try/catch を追加し `err.buildFailed` i18n キーで alert 通知。テスト担保。
- **メタ入力欄に placeholder ヒント追加**: タイトル・作者フィールドに placeholder（`out.title.ph`・`out.author.ph`、ja/en）を追加。タイトル未入力のままエクスポートすると全ファイルが `hina.vrm` になる問題への入力促進。
- **i18n `note.upload` 死エントリ除去**: 両言語（ja/en）の i18n オブジェクトに、修正済みの正エントリとは別に旧エントリ（`docs/UPLOAD_GUIDE.md` を参照するテキスト）が重複キーとして残存していた。JavaScript はオブジェクトリテラルの重複キーで後勝ちのため動作上の影響はなかったが、混乱を招くコードスメルだったため削除。
- **About ボタンの `aria-label` ローカライズ**: `aria-label="About"` をハードコード英語から `a11y.about.btn` i18n キー（ja: 「雛について」/ en: 「About Hina」）に変更。`applyLang()` が言語切替時に動的更新。日本語モードで「About ボタン」と英語で読まれる問題を解消。
- **`<noscript>` フォールバック追加**: JavaScript 無効時に空白ページを表示する代わりに、日英両言語で「JavaScript が必要です」と案内するメッセージを `<body>` 開始直後に追加。既存 CSS 変数（`--bg` / `--text` / `--text-dim`）を使用してデザインを統一。
- **selfTest 強化 — bone/node インデックス整合性検証追加**: selfTest() に (1)ヒューマノイドボーンの全 node インデックスが `nodes[]` 範囲内か (2)SpringBone colliderGroup の node インデックスが範囲内か、の2件を追加（18件→20件）。無効な node 参照による UniVRM 読み込み失敗を早期発見できる。
- **About ダイアログのアクセシビリティ強化**: `<dialog>` に `aria-labelledby="aboutH2"`、`<h2>` に `id="aboutH2"` を追加。スクリーンリーダーが「雛 (Hina) v0.1.0 ダイアログ」とタイトル付きで読み上げるようになった。閉じるボタンのテキストを `OK` から `about.close` i18n キー（ja: 「閉じる」/ en: 「Close」）に変更し言語切替に対応。
- **WebGL エラーメッセージの i18n 対応**: WebGL 使用不可時（`hint.noGL`）とコンテキスト消失時（`hint.glLost`）のヒントをハードコード英語から i18n キー（ja/en）に変更。`applyLang()` が言語切替時に WebGL 状態を確認して適切なメッセージを表示するよう修正（以前は無条件で `hint.drag` を設定し WebGL エラーメッセージを上書きしていた）。
- **VRM meta 入力欄に maxlength="256" 追加**: VRM ライターの `str()` が `.slice(0,256)` でサニタイズするため、ブラウザ側でも256文字上限を `maxlength` で明示。無音切り詰めを防ぎ、ユーザーが意図せず長い文字列を送信することを防止。title・author・contact・reference の全フィールドに適用。
- **ガチャシード再入力フォーム**: プリセットタブのガチャセクションにシード番号入力欄を追加。数値を入力してEnterキーを押すと同じシードでアバターを再生成でき、友人とシード番号を共有することで同一アバターを再現できる。gacha.seed.ph プレースホルダーi18nキー（ja/en）追加。ガチャボタンと再入力を `runGacha(seed)` に統一。
- **WCAG ランドマーク構造強化**: `<section id="stage">` と `<aside id="panel">` に `aria-label`（`a11y.stage`・`a11y.panel` i18n、ja/en）を追加。名前なし `<section>` はARIA ランドマークにならないため、スクリーンリーダーのランドマーク移動（NVDA: R / VoiceOver: VO+Cmd+L）で「3Dプレビューエリア」「アバター設定パネル」として到達可能になった。言語切替時は `applyLang()` で動的更新。
- **WCAG 1.3.1 完全対応 — `paramRow` の全入力にラベル関連付け追加**: `paramRow()` が生成するすべての入力要素（range・enum select・checkbox・color picker）に `id='pr-{param}'` を付与し、対応する `<label>` の `for` 属性を設定。ラベルをクリックするとフォーカスが対応するスライダー/セレクト/チェックボックス/カラーピッカーに移動するようになった（Round 11 の Exportタブ対応と合わせて全タブで充足）。
- **Content Security Policy 追加**: `<meta http-equiv="Content-Security-Policy" content="object-src 'none'; base-uri 'none'; form-action 'none'">` を追加。インラインスクリプトを持つ単一 HTML の制約内で適用可能な最大 CSP（Flash/ActiveX 禁止・base タグ書き換え禁止・form 外部送信禁止）を設定。
- **ブラウザタブタイトル動的更新**: タイトル入力欄を変更すると `document.title` が `雛 — {ファイル名}` に即時更新されるようになった。複数タブで異なるアバターを作業する際のタブ識別が容易になる。
- **Ctrl+S ヒント表示**: Export タブの書き出しボタン直下に `hint.ctrlS` キーのヒント文（ja/en）を追加。
- **WCAG 1.3.1（情報と関係性）対応 — Exportタブのラベル関連付け**: `txt()` / `selRow()` ヘルパーの `<label>` 要素に `for` 属性、対応する `<input>`/`<select>` に `id` を追加（`meta-title`・`meta-author` 等）。ラベルクリックでフォーカス遷移するようになり、スクリーンリーダーが form 要素を正しく識別できるようになった。
- **Ctrl/Cmd+S キーボードショートカット**: グローバル `keydown` ハンドラを追加し、テキスト入力欄以外でCtrl+S（macOSはCmd+S）を押すとVRM書き出しを即時実行。制作ツールの筋肉記憶ショートカットに対応。
- **WCAG AA コントラスト比修正**: `--text-faint` を `#5f6b78`（コントラスト比 ~2.5:1）から `#7a868f`（~4.7:1）に引き上げ。CSS変数1点の変更で `.row label`・`.sect`・`.rankBadge .lbl`・`.note`・`.limit` 等の全適用箇所がWCAG AA（4.5:1）を充足。
- **スマートデフォルトファイル名**: `title` 未入力時のVRM/JSONファイル名フォールバックを `hina` から `hina_<プリセットID|custom>` に変更（例: `hina_kotone.vrm`）。`fnameStem()` 関数を導入し `doExport()`/`saveJson()` 双方で使用。Exportタブのタイトル欄下にリアルタイムファイル名プレビューを追加（`out.filename` i18nキー、ja/en）。テスト202→205で担保。
- **VRMメタ `contact`/`reference` フィールドをUIに追加**: Exportタブにアバター作者の連絡先（`contactInformation`）と参照元（`reference`）の入力欄を追加。VRM 0.x 仕様の帰属フィールドがUIから設定可能になり、二次配布・権利管理の機械可読化を実現。`out.contact`・`out.reference`・各 placeholder の i18n 4キー（ja/en）追加。テスト200→202で担保。
- **JSON読込失敗のサイレント失敗を解消**: `deserialize()` が null を返した場合（形式不正・`app` フィールド不一致・空ファイル等）、UIが無音のまま変化しなかった。`err.loadFailed` i18n キー（ja/en）を追加し `alert()` で明示通知するよう修正。テスト担保。
- **`saveState()` の過剰 localStorage 書き込みを抑制**: スライダー操作中に毎刻 `localStorage.setItem` が同期実行されていた（height 全可動域で最大 120 回）。500ms デバウンスを追加し最終値のみを永続化。プレビュー `rebuild()` は引き続き即時実行（UX維持）。
- **WCAG 2.1.1（キーボード操作）対応**: 3Dプレビューがポインタ操作のみでキーボード非対応だった問題を修正（SPEC §7のWCAG AA主張の未達ギャップ）。canvasを `tabindex="0"` でフォーカス可能にし、矢印キー=回転／`+``−`=ズーム／`Home`=リセットのキー操作と、言語連動の `aria-label` を追加。ヒント文も更新。
- **WCAG 4.1.3（ステータスメッセージ）対応**: 性能ランクや書き出し結果が視覚的にのみ更新され、支援技術へ伝わらなかった問題を修正。視覚的に隠した `aria-live="polite"` ライブリージョン（`#srStatus`）を追加し、(1) ランク文字列が**実際に変化した時のみ**「性能ランク — PC: … / Quest: …（律速: …）」を通知（スライダー1刻みごとの読み上げ氾濫を重複排除で抑止）、(2) VRM書き出し成功時にファイル名とサイズを通知。

## [0.1.0] - 2026-06-11
### Added
- パラメトリック人型アバター生成（体格・顔・髪・服・色 30+パラメータ）
- VRM 0.x 書き出し（純粋JS実装・依存ゼロ・GLB+VRM拡張）
  - Humanoid 21ボーン（eye含む・T-pose正規化・Z-向き）
  - BlendShape 17グループ（A/I/U/E/O/Blink/Blink_L/R/Joy/Angry/Sorrow/Fun/Neutral/Look4方向）
  - SpringBone（髪揺れ）+ 頭部コライダ
  - MToon マテリアル（単一マテリアル・単一アトラス・Cutout）
- WebGLリアルタイムプレビュー（CPUスキニング・トゥーン2階調・輪郭線・呼吸/瞬き/視線追従/髪物理）
- VRChat Performance Rank推定（PC/Quest 全14項目・公式2026-04基準値）
- Quest Excellentモード（揺れ物オフ切替）
- プリセット6体 + ガチャ / パラメータJSON保存・読込 / 自動保存
- 日英i18n / かんたん・詳細モード / prefers-reduced-motion対応
- アプリ内 VRChat導入5手順（単体配布時もdocs/不要）
- VRMサムネイル自動埋込（書き出し時のプレビュー視点・256px）
- Nodeテストスイート（依存ゼロ・GLB構造バリデータ内蔵・ノード到達性検証）
### Changed
- firstPersonBoneOffset を実寸計算に変更（目の高さ・顔向きZ-。体格非依存で正確）
### Security
- 完全ローカル動作。外部送信・外部依存・PII収集なし
