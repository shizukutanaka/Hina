# VRChatへの持ち込み手順（初心者向け）

雛で書き出した `.vrm` をVRChatで使うまで。所要15〜30分・全工程無料。PC必須。

> VRChatの規約上、アバターのアップロードは公式SDK経由のみ許可されています。以下は公式ルートです。
> 各ツールのUIは更新されるため、画面が異なる場合は各公式ドキュメントを正としてください。

## 0. 用意するもの
- 雛で書き出した `yourname.vrm`
- VRChatアカウント（**New User以上のTrust Rank**。Visitorはアップロード不可。数日プレイで上がる）

## 1. VCC（VRChat Creator Companion）を入れる
1. https://vrchat.com/home/download から **Creator Companion** を入手しインストール
2. VCC初回起動時、指示に従い **Unity Hub と指定バージョンのUnity** を導入（VCCが正しいバージョンを案内する）

## 2. アバタープロジェクトを作る
1. VCC → **Projects → New Project → Avatars**（World ではない）
2. プロジェクト名（例: HinaAvatar）→ Create → **Open Project** でUnityが開く

## 3. UniVRM と VRM Converter for VRChat を入れる
1. **UniVRM**: https://github.com/vrm-c/UniVRM/releases から **VRM 0.x系の .unitypackage** を取得 → Unityへドラッグ&ドロップ → Import
2. **VRM Converter for VRChat**: https://github.com/esperecyan/VRMConverterForVRChat の案内に従い導入（VCCリポジトリ追加 or .unitypackage）
   - 配布元: esperecyan（pixiv BOOTHでも配布）

## 4. VRMを変換する
1. `yourname.vrm` をUnityの **Projectウィンドウへドラッグ**（プレハブが生成される）
2. 生成されたプレハブを選択 → メニュー **VRM0 → Duplicate and Convert for VRChat**
3. ダイアログはそのまま **複製して変換** を実行
   - まばたき・リップシンク（あいうえお）・表情・揺れ物（PhysBones）・視点が自動設定される
4. 変換後プレハブを **Hierarchyへドラッグ**して配置

## 5. 確認（30秒）
- **VRC Avatar Descriptor → View Position**: 目の位置に球があるか（雛は目の高さに自動設定。ズレていたら微調整）
- **LipSync**: Viseme Blend Shape になっているか
- 雛で「揺れ物オフ」を使った場合はPhysBonesが無いのが正常

## 6. アップロード
1. メニュー **VRChat SDK → Show Control Panel** → 自分のVRChatアカウントでログイン
2. **Builder** タブ → 警告が出たら **Auto Fix**
3. 名前・サムネイルを設定 → **Build & Publish for Windows**
4. Quest対応も配るなら: Control Panelでプラットフォームを **Android に切替 → 再度 Build & Publish**（同一Blueprint IDで両対応になる）

## 7. VRChatで確認
ゲーム内 Menu → Avatars → アップロードした雛アバターを選択。

## つまずきポイント
| 症状 | 対処 |
|------|------|
| SDKでアップロードボタンが押せない | Trust RankがVisitor。数日プレイして New User になるのを待つ |
| 「Avatar is Very Poor」警告(Quest) | 雛の物理タブで「揺れ物オフ」→再書き出し、または警告のまま進めてもPC版は可 |
| ピンク色になる | シェーダー未導入。UniVRM(手順3-1)を先に入れてからVRMを取り込む |
| 後ろ向きに表示される(他ビューア) | VRM0仕様(Z-向き)。Unity/VRChatでは正常 |
