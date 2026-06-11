# 雛 — Hina

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
