<a id="japanese"></a>

# 雛 FAQ

**日本語** · [English](#english)

### Q. 作ったアバターをVRChatで使うには？
A. VRChatの規約上、アップロードは公式SDK（Unity）経由のみ。雛が書き出したVRMを **UniVRM + VRM Converter for VRChat** でUnityに取り込み、SDKでアップロードする。全手順は [UPLOAD_GUIDE.md](UPLOAD_GUIDE.md)。所要15〜30分・無料。

### Q. Quest（Android/モバイル）対応？
A. 対応。既定プリセットは三角形数<7,500・マテリアル1・スキンメッシュ1で設計。
- 揺れ物ON: Quest **Good**（QuestのExcellentはPhysBones=0が条件のため）
- 物理タブの「揺れ物オフ」: Quest **Excellent**
PCは常時Excellent圏。アプリ内のRank表示は公式2026年4月基準値。

### Q. なぜVRM 0.xで1.0ではない？
A. VRChat持込の事実上標準ルートである VRM Converter for VRChat が0.x前提のため。1.0出力はv1.0で対応予定（UnityのUniVRMで0.x→1.0移行も可能）。

### Q. 商用利用できる？作ったアバターの権利は？
A. ツール本体はMIT。**生成アバターの権利は生成者に帰属**。配布可否・商用可否・暴力/性的表現の許可は書き出し時にVRMメタとして自分で設定する（既定は最も保守的: 本人のみ/全Disallow/再配布禁止）。

### Q. 通信・アカウント・課金は？
A. すべてなし。完全ローカル動作で1リクエストも送信しない。本体無料。寄付は任意（README参照）。

### Q. BOOTHの衣装や既存モデルを着せられる？
A. v0.1では非対応（スコープ外）。雛は「ゼロから1体作る」ツール。既存モデル改変はBlender/Unityの領分。

### Q. 表情・リップシンクは動く？
A. 動く。あ/い/う/え/お（リップシンク用）・まばたき・喜怒哀楽をVRM標準ブレンドシェイプとして出力。VRM Converter for VRChatが自動でVRChatのVisemes/表情に変換する。視線（アイトラッキング）もBone方式で対応済み。
さらに **表情エディタ** で喜/怒/哀/楽の4感情を、既存モーフ（あ〜お・まばたき・4感情）の重み0〜100のミックスとして自分好みに調整できる（未編集なら従来と完全に同一のVRMを書き出す）。

### Q. 操作を間違えた／やり直したい
A. **Ctrl+Z で元に戻す・Ctrl+Shift+Z でやり直し**（最大20段）。スライダー・プリセット・ガチャ・JSON読込・メタ入力のすべてが対象。

### Q. 気に入ったガチャ結果をもう一度出したい／友達と共有したい
A. ガチャを引くと **シード番号** が決まる。同じ番号をシード入力欄に入れれば同一アバターを再現できる。「リンクをコピー」ボタンで `?seed=N` 付きURLをコピーすれば、そのリンクを開くだけで相手も同じ結果を再現できる。さらに **カテゴリロック**（体格/顔/髪/衣装/配色）で気に入った部分だけ保ったまま再ガチャも可能。

### Q. プレビューを画像として保存したい
A. ヘッダのスクリーンショットボタン（または Ctrl+Shift+P）で現在のプレビューをPNG保存できる。モバイルでは共有シートから直接送れる。

### Q. 書き出したVRMが他ツールで後ろを向く
A. VRM 0.x仕様（Z-向き）に正しく準拠している。VRM1前提のビューアで読むと180°回転して見えることがあるが、UniVRM・VRChat変換では正常。

### Q. 指が動かない
A. v0.1はミトン手（指ボーンなし）。VRChatでは手のジェスチャーが指アニメに依存しないHumanoid動作のため支障は小さい。指ボーンはv0.2予定。

### Q. データはどこに保存される？
A. パラメータのみブラウザのlocalStorage（端末内）。「保存」ボタンでJSONファイルにも書き出せる。モデル本体は書き出した.vrmファイルだけ。

### Q. スマホで使える？
A. 編集UIはタッチ対応済み。ただし書き出し後のUnity作業はPC必須。

---

<a id="english"></a>

# Hina FAQ (English)

[日本語](#japanese) · **English**

### Q. How do I use my avatar in VRChat?
A. Per VRChat's terms, uploads only go through the official SDK (Unity). Import the VRM Hina exports into Unity with **UniVRM + VRM Converter for VRChat**, then upload via the SDK. Full steps: [UPLOAD_GUIDE.md#english](UPLOAD_GUIDE.md#english). About 15–30 minutes, free.

### Q. Does it support Quest (Android / mobile)?
A. Yes. Built-in presets are designed for <7,500 triangles, 1 material, 1 skinned mesh.
- Spring bones ON: Quest **Good** (Quest Excellent requires PhysBones = 0)
- "No spring bones" on the Physics tab: Quest **Excellent**
PC is always in Excellent range. The in-app rank display uses the official April 2026 thresholds.

### Q. Why VRM 0.x and not 1.0?
A. Because VRM Converter for VRChat — the de-facto standard route into VRChat — assumes 0.x. VRM 1.0 export is planned for v1.0 (you can also migrate 0.x→1.0 with UniVRM in Unity).

### Q. Can I use it commercially? Who owns the avatars I make?
A. The tool itself is MIT. **Rights to generated avatars belong to their creator.** You set redistribution / commercial / violent / sexual permissions yourself as VRM metadata at export time (the default is the most conservative: author-only / all Disallow / no redistribution).

### Q. Any network, account, or payment?
A. None. It runs fully locally and sends zero requests. The tool is free; donations are optional (see README).

### Q. Can I put BOOTH clothing or existing models on it?
A. Not in v0.1 (out of scope). Hina is a "build one from scratch" tool; editing existing models is Blender/Unity territory.

### Q. Do expressions and lip-sync work?
A. Yes. A/I/U/E/O (for lip-sync), blink, and joy/anger/sorrow/fun are exported as standard VRM blend shapes, which VRM Converter for VRChat maps automatically to VRChat's visemes/expressions. Eye tracking is supported via bones.
There's also an **expression editor** to tune joy/anger/sorrow/fun as a 0–100 weighted mix of the existing morphs (A–O, blink, the four emotions). If you leave it untouched, the exported VRM is byte-identical to before.

### Q. I made a mistake / want to undo
A. **Ctrl+Z to undo, Ctrl+Shift+Z to redo** (up to 20 steps). Sliders, presets, gacha, JSON loads, and metadata edits are all covered.

### Q. I want to reproduce or share a gacha result I liked
A. Each gacha roll has a **seed number**. Enter the same number in the seed field to reproduce the exact avatar. The "Copy Link" button copies a `?seed=N` URL — opening that link reproduces the same result for anyone. You can also **lock categories** (body / face / hair / outfit / colors) to re-roll while keeping the parts you like.

### Q. I want to save the preview as an image
A. The screenshot button in the header (or Ctrl+Shift+P) saves the current preview as a PNG. On mobile you can send it straight from the share sheet.

### Q. My exported VRM faces backward in other tools
A. It correctly follows the VRM 0.x spec (Z-forward). VRM 1.0-based viewers may show it rotated 180°, but it's correct in UniVRM / the VRChat conversion.

### Q. The fingers don't move
A. v0.1 uses mitten hands (no finger bones). In VRChat this is a minor limitation, since hand gestures use humanoid muscles rather than finger animation. Finger bones are planned for v0.2.

### Q. Where is my data stored?
A. Only parameters, in the browser's localStorage (on your device). The "Save" button also exports them as a JSON file. The model itself is only the `.vrm` you export.

### Q. Can I use it on a phone?
A. The editing UI is touch-ready. But the post-export Unity work requires a PC.
