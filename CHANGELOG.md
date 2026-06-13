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
- **WCAG 2.1.1（キーボード操作）対応**: 3Dプレビューがポインタ操作のみでキーボード非対応だった問題を修正（SPEC §7のWCAG AA主張の未達ギャップ）。canvasを `tabindex="0"` でフォーカス可能にし、矢印キー=回転／`+``−`=ズーム／`Home`=リセットのキー操作と、言語連動の `aria-label` を追加。ヒント文も更新。

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
