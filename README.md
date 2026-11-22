<a id="japanese"></a>

# 雛 — Hina

**日本語** · [English](#english)

**スライダーだけで、VRChatの性能ランク（Quest Excellent圏）が保証されたアバターを作れる単一HTMLツール。作ったアバターはシード番号ひとつで再現・共有でき、ファイルは標準VRM形式であなたの手元に残ります。3Dモデリング知識・インストール・外部送信、すべて不要。**

VRChatで「自分のアバター」を持つには、従来 Blender や VRoid Studio などの学習コストの高いツールが必要でした。雛はスライダーを動かすだけで、揺れる髪・表情・リップシンク対応のVRM 0.xアバターを生成します。既定プリセットはすべて **Quest Excellent 圏**（揺れ物オフ時）に収まるよう設計されており、書き出したVRMはUnity + VRM Converter for VRChat 経由でそのままVRChatにアップロードできます。

![accent](https://img.shields.io/badge/accent-%2300C4CC-00C4CC) ![license](https://img.shields.io/badge/license-MIT-3DDC97) ![deps](https://img.shields.io/badge/dependencies-0-0F1216)

## Features

- **パラメトリック生成** — 体格・顔・髪型・衣装・配色など30以上のパラメータと6体のプリセット。「ガチャ」でランダム生成も。
- **本物のVRM 0.x書き出し** — Humanoidボーン21本（視線ボーン含む）、ブレンドシェイプ17種（あ/い/う/え/お・まばたき・喜怒哀楽）、SpringBone（髪揺れ）、MToonマテリアルまで純粋JavaScriptで構築。
- **Performance Rank推定器** — VRChat公式基準（PC/Quest全項目・2026年4月版）でランクをリアルタイム判定。「Quest Excellentモード」ワンタップ切替。
- **生きたプレビュー** — WebGLトゥーン描画。呼吸・まばたき・視線追従・髪の物理を書き出し前に確認できます。
- **完全ローカル** — index.html ひとつ。サーバーなし、通信なし、アカウント不要。作ったアバターはあなただけのものです。

## Installation

### デスクトップ版（正規の配布形態）

雛の正規の公開形態は **デスクトップアプリ（ソフトウェア）** です。中身は同じ index.html を、外部通信・外部ページ遷移を遮断した最小の Electron 殻で開くだけで、アプリ本体は一切変更していません。

| OS | 形式 | 起動 |
|----|------|------|
| Windows | portable `.exe` | ダウンロードしてそのまま実行（インストール不要） |
| macOS | `.zip`（`.app`） | 展開して `Hina.app` を開く |
| Linux | `.AppImage` | `chmod +x` して実行 |

> **未署名についての注意:** デスクトップ版はコード署名・公証をしていません。そのため初回起動時に **Windows SmartScreen**（「WindowsによってPCが保護されました」→「詳細情報」→「実行」）や **macOS Gatekeeper**（「開発元を確認できない」→ Finder で右クリック →「開く」、または「システム設定 → プライバシーとセキュリティ」→「このまま開く」）の警告が出ることがあります。

ソースから起動・ビルドする場合（Node.js 必須）:

```
npm ci
npm start              # デスクトップ版を起動
npm run dist:win       # Windows portable（dist-desktop/）
npm run dist:mac       # macOS zip（未署名）
npm run dist:linux     # Linux AppImage
```

### ブラウザで開く（従来どおり）

```
1. index.html をダウンロード
2. ブラウザ（Chrome / Edge / Firefox / Safari 最新版）で開く
```

アプリ本体は今も単一HTML・依存ゼロのままなので、ブラウザでもビルドやnpmなしで動きます（npm はデスクトップ殻のビルドにだけ使います）。

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

## License

[MIT](LICENSE) — 雛で**生成したアバターの権利は生成したユーザーに帰属**します。商用利用・改変・再配布の可否はVRM書き出し時にメタ情報としてあなた自身が設定できます。

---

<a id="english"></a>

# Hina (English)

[日本語](#japanese) · **English**

**A single-file HTML tool for making VRChat avatars (VRM) with sliders alone — whose VRChat performance rank is guaranteed by construction (Quest Excellent range), reproducible and shareable from a single seed number, and kept as a standard VRM file in your hands. No 3D-modeling knowledge, no installation, no data ever leaves your machine.**

Owning "your own avatar" in VRChat has traditionally meant learning heavyweight tools like Blender or VRoid Studio. Hina generates a VRM 0.x avatar — with swaying hair, facial expressions, and lip-sync support — just by moving sliders. Every built-in preset is designed to stay within **Quest Excellent** rank (with spring bones off), and the exported VRM uploads to VRChat directly via Unity + VRM Converter for VRChat.

> The UI is fully bilingual (Japanese / English) — toggle the language in-app with the header button or the `M`-adjacent language switch.

## Features

- **Parametric generation** — 30+ parameters (body, face, hair, outfit, colors) and 6 presets. A "gacha" button rolls a random avatar, with a shareable seed.
- **Genuine VRM 0.x export** — 21 humanoid bones (including eye bones), 17 blend shapes (A/I/U/E/O vowels, blink, and joy/anger/sorrow/fun), spring bones (hair sway), and an MToon material — all built in pure JavaScript.
- **Performance Rank estimator** — real-time PC/Quest rank against VRChat's official thresholds (all categories, April 2026 revision). One-tap "Quest Excellent mode" toggle.
- **Live preview** — WebGL toon rendering with breathing, blinking, eye tracking, and hair physics, so you can check everything before export.
- **Fully local** — one `index.html`. No server, no network requests, no account. The avatars you make are yours alone.

## Installation

### Desktop app (the official distribution)

Hina is officially distributed as a **desktop application (software)**. It is the same index.html, opened in a minimal Electron shell that blocks network navigation and external pages; the app itself is unchanged.

| OS | Format | Run |
|----|--------|-----|
| Windows | portable `.exe` | Download and run (no installer) |
| macOS | `.zip` (`.app`) | Unzip and open `Hina.app` |
| Linux | `.AppImage` | `chmod +x` and run |

> **Unsigned builds:** the desktop builds are not code-signed or notarized, so on first launch you may see a **Windows SmartScreen** warning ("Windows protected your PC" → "More info" → "Run anyway") or a **macOS Gatekeeper** warning ("cannot verify the developer" → right-click the app in Finder → "Open", or System Settings → Privacy & Security → "Open Anyway").

To run or build from source (requires Node.js):

```
npm ci
npm start              # launch the desktop app
npm run dist:win       # Windows portable (dist-desktop/)
npm run dist:mac       # macOS zip (unsigned)
npm run dist:linux     # Linux AppImage
```

### Open in a browser (still supported)

```
1. Download index.html
2. Open it in a browser (latest Chrome / Edge / Firefox / Safari)
```

The app itself is still a single, zero-dependency HTML file, so the browser route needs no build step and no npm (npm is only used to build the desktop shell).

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
| [docs/SPEC.md#english](docs/SPEC.md#english) | Specification (parameter tables, VRM output spec, rank thresholds — English + Japanese) |
| [docs/FAQ.md#english](docs/FAQ.md#english) | Frequently asked questions (English + Japanese) |
| [docs/UPLOAD_GUIDE.md#english](docs/UPLOAD_GUIDE.md#english) | Getting into VRChat (beginner-friendly, English + Japanese) |
| [docs/adr/](docs/adr/) | Architecture decision records |

> The specification, FAQ and upload guide are all bilingual; only the ADRs remain Japanese. The in-app UI is fully bilingual.

## License

[MIT](LICENSE) — **the rights to avatars you create with Hina belong to you, the creator.** You set the commercial-use / modification / redistribution permissions yourself, as metadata, at VRM export time.
