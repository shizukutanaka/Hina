<a id="japanese"></a>

# VRChatへの持ち込み手順（初心者向け）

**日本語** · [English](#english)

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

---

<a id="english"></a>

# Getting your avatar into VRChat (beginner guide)

[日本語](#japanese) · **English**

From the `.vrm` Hina exports to using it in VRChat. About 15–30 minutes, entirely free. A PC is required.

> Per VRChat's terms, avatar uploads are only permitted through the official SDK. The route below is that official path.
> Each tool's UI changes over time — if your screen differs, treat each tool's official documentation as authoritative.

## 0. What you need
- The `yourname.vrm` you exported from Hina
- A VRChat account (**Trust Rank of New User or above**. Visitors cannot upload; a few days of playing raises it)

## 1. Install VCC (VRChat Creator Companion)
1. Get **Creator Companion** from https://vrchat.com/home/download and install it
2. On first launch, follow the prompts to install **Unity Hub and the specified Unity version** (VCC guides you to the correct version)

## 2. Create an avatar project
1. VCC → **Projects → New Project → Avatars** (not World)
2. Name it (e.g. HinaAvatar) → Create → **Open Project** to launch Unity

## 3. Install UniVRM and VRM Converter for VRChat
1. **UniVRM**: from https://github.com/vrm-c/UniVRM/releases get the **VRM 0.x `.unitypackage`** → drag & drop into Unity → Import
2. **VRM Converter for VRChat**: install per https://github.com/esperecyan/VRMConverterForVRChat (add its VCC repository, or the `.unitypackage`)
   - Distributed by esperecyan (also on pixiv BOOTH)

## 4. Convert the VRM
1. Drag `yourname.vrm` **into Unity's Project window** (a prefab is generated)
2. Select the generated prefab → menu **VRM0 → Duplicate and Convert for VRChat**
3. In the dialog, just run **Duplicate and Convert**
   - Blink, lip-sync (A/I/U/E/O), expressions, spring bones (PhysBones), and view position are all set up automatically
4. Drag the converted prefab **into the Hierarchy** to place it

## 5. Check (30 seconds)
- **VRC Avatar Descriptor → View Position**: is the sphere at eye level? (Hina sets this to eye height automatically; nudge it if it's off)
- **LipSync**: is it set to Viseme Blend Shape?
- If you used "no spring bones" in Hina, having no PhysBones is normal

## 6. Upload
1. Menu **VRChat SDK → Show Control Panel** → log in with your VRChat account
2. **Builder** tab → if warnings appear, click **Auto Fix**
3. Set a name and thumbnail → **Build & Publish for Windows**
4. To also distribute for Quest: in the Control Panel switch the platform to **Android → Build & Publish again** (the same Blueprint ID serves both)

## 7. Verify in VRChat
In-game Menu → Avatars → select your uploaded Hina avatar.

## Troubleshooting
| Symptom | Fix |
|---------|-----|
| Upload button is greyed out in the SDK | Trust Rank is Visitor. Play for a few days until you reach New User |
| "Avatar is Very Poor" warning (Quest) | Use "no spring bones" on Hina's Physics tab and re-export, or proceed with the warning (PC is fine either way) |
| Avatar turns pink | Shader not installed. Install UniVRM (step 3-1) *before* importing the VRM |
| Faces backward (in other viewers) | This is the VRM 0.x spec (Z-forward). It's correct in Unity/VRChat |
