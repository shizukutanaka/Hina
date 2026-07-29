<a id="japanese"></a>

# 雛 — Hina

**日本語** · [English](#english)

**ブラウザだけでVRChat向けアバター(VRM)を作れる単一HTMLツール。3Dモデリング知識・インストール・外部送信、すべて不要。**

VRChatで「自分のアバター」を持つには、従来 Blender や VRoid Studio などの学習コストの高いツールが必要でした。雛はスライダーを動かすだけで、揺れる髪・表情・リップシンク対応のVRM 0.xアバターを生成します。既定プリセットはすべて **Quest Excellent 圏**（揺れ物オフ時）に収まるよう設計されており、書き出したVRMはUnity + VRM Converter for VRChat 経由でそのままVRChatにアップロードできます。

![accent](https://img.shields.io/badge/accent-%2300C4CC-00C4CC) ![license](https://img.shields.io/badge/license-MIT-3DDC97) ![deps](https://img.shields.io/badge/dependencies-0-0F1216)

## Features

- **パラメトリック生成** — 体格・顔・髪型・衣装・配色など30以上のパラメータと6体のプリセット。「ガチャ」でランダム生成も。
- **本物のVRM 0.x書き出し** — Humanoidボーン21本（視線ボーン含む）、ブレンドシェイプ17種（あ/い/う/え/お・まばたき・喜怒哀楽）、SpringBone（髪揺れ）、MToonマテリアルまで純粋JavaScriptで構築。
- **Performance Rank推定器** — VRChat公式基準（PC/Quest全項目・2026年4月版）でランクをリアルタイム判定。「Quest Excellentモード」ワンタップ切替。
- **生きたプレビュー** — WebGLトゥーン描画。呼吸・まばたき・視線追従・髪の物理を書き出し前に確認できます。
- **完全ローカル** — index.html ひとつ。サーバーなし、通信なし、アカウント不要。作ったアバターはあなただけのものです。

## Installation

```
1. index.html をダウンロード
2. ブラウザ（Chrome / Edge / Firefox / Safari 最新版）で開く
```

以上です。ビルドもnpmも必要ありません。

## Usage

```
1. 「かんたん」タブでプリセットを選ぶ（またはガチャ）
2. スライダーで体格・顔・髪・服・色を調整（「詳細」モードで全項目開放）
3. 「出力」タブで名前を入れて「VRMを書き出す」
4. docs/UPLOAD_GUIDE.md の手順でVRChatへアップロード
```

VRChatへのアップロードはVRChat公式SDK（Unity）経由のみ許可されています。雛は規約準拠のため、アップロード自体は行わず、Unityにそのまま読み込めるVRMを出力します。手順は [docs/UPLOAD_GUIDE.md](docs/UPLOAD_GUIDE.md) を参照してください。

## Configuration

設定ファイル・環境変数はありません。パラメータは「保存」ボタンでJSONとして書き出し、「読込」で復元できます（ブラウザのlocalStorageに自動保存もされます）。

## Documents

| ファイル | 内容 |
|---------|------|
| [docs/SPEC.md](docs/SPEC.md) | 仕様書（パラメータ表・VRM出力仕様・Rank基準値） |
| [docs/FAQ.md](docs/FAQ.md) | よくある質問 |
| [docs/UPLOAD_GUIDE.md](docs/UPLOAD_GUIDE.md) | VRChatへの持ち込み手順（初心者向け） |
| [docs/adr/](docs/adr/) | 設計判断の記録 |

## 寄付

雛は無料で使えます。開発を支援したい方は:

- 月額 $1 寄付（Stripe）: 準備中
- Bitcoin: `bc1qjaet6jgpk08la46jelmlpgsz84luc4lc0tnwr5`

## License

[MIT](LICENSE) — 雛で**生成したアバターの権利は生成したユーザーに帰属**します。商用利用・改変・再配布の可否はVRM書き出し時にメタ情報としてあなた自身が設定できます。

---

<a id="english"></a>

# Hina (English)

[日本語](#japanese) · **English**

**A single-file HTML tool for making VRChat avatars (VRM) in your browser alone. No 3D-modeling knowledge, no installation, no data ever leaves your machine.**

Owning "your own avatar" in VRChat has traditionally meant learning heavyweight tools like Blender or VRoid Studio. Hina generates a VRM 0.x avatar — with swaying hair, facial expressions, and lip-sync support — just by moving sliders. Every built-in preset is designed to stay within **Quest Excellent** rank (with spring bones off), and the exported VRM uploads to VRChat directly via Unity + VRM Converter for VRChat.

> The UI is fully bilingual (Japanese / English) — toggle the language in-app with the header button or the `M`-adjacent language switch.

## Features

- **Parametric generation** — 30+ parameters (body, face, hair, outfit, colors) and 6 presets. A "gacha" button rolls a random avatar, with a shareable seed.
- **Genuine VRM 0.x export** — 21 humanoid bones (including eye bones), 17 blend shapes (A/I/U/E/O vowels, blink, and joy/anger/sorrow/fun), spring bones (hair sway), and an MToon material — all built in pure JavaScript.
- **Performance Rank estimator** — real-time PC/Quest rank against VRChat's official thresholds (all categories, April 2026 revision). One-tap "Quest Excellent mode" toggle.
- **Live preview** — WebGL toon rendering with breathing, blinking, eye tracking, and hair physics, so you can check everything before export.
- **Fully local** — one `index.html`. No server, no network requests, no account. The avatars you make are yours alone.

## Installation

```
1. Download index.html
2. Open it in a browser (latest Chrome / Edge / Firefox / Safari)
```

That's it. No build step, no npm.

## Usage

```
1. Pick a preset on the "Easy" tab (or roll the gacha)
2. Adjust body / face / hair / outfit / colors with the sliders (open all fields in "Detail" mode)
3. On the "Output" tab, enter a name and click "Export VRM"
4. Follow docs/UPLOAD_GUIDE.md to upload to VRChat
```

VRChat only permits uploads through the official VRChat SDK (Unity). To stay compliant, Hina never uploads on your behalf — it exports a VRM that loads straight into Unity. See [docs/UPLOAD_GUIDE.md#english](docs/UPLOAD_GUIDE.md#english) for the step-by-step (English + Japanese).

## Configuration

There are no config files or environment variables. Save parameters as JSON with the "Save" button and restore them with "Load" (they also auto-save to the browser's localStorage).

## Documents

| File | Contents |
|------|----------|
| [docs/SPEC.md](docs/SPEC.md) | Specification (parameter tables, VRM output spec, rank thresholds) |
| [docs/FAQ.md#english](docs/FAQ.md#english) | Frequently asked questions (English + Japanese) |
| [docs/UPLOAD_GUIDE.md#english](docs/UPLOAD_GUIDE.md#english) | Getting into VRChat (beginner-friendly, English + Japanese) |
| [docs/adr/](docs/adr/) | Architecture decision records |

> The FAQ and upload guide are bilingual; the remaining docs are Japanese for now. The in-app UI is fully bilingual.

## Donation

Hina is free to use. If you'd like to support development:

- $1/month (Stripe): coming soon
- Bitcoin: `bc1qjaet6jgpk08la46jelmlpgsz84luc4lc0tnwr5`

## License

[MIT](LICENSE) — **the rights to avatars you create with Hina belong to you, the creator.** You set the commercial-use / modification / redistribution permissions yourself, as metadata, at VRM export time.
