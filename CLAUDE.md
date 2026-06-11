# 雛 (Hina) — CLAUDE.md

## Why（コードから推論不可の制約）
- 単一HTML・依存ゼロは交渉不可（配布容易性・監査容易性・オフライン保証のため）
- VRM 0.x 固定: VRM Converter for VRChat エコシステムが0.x前提。1.0対応はv1.0で
- VRM0座標: モデルは **Z-向き**・右=+X・T-pose・ノード回転なし（正規化）。出典 vrm.dev
- Quest Excellent を既定プリセットで維持: tris<7500 / mat=1 / skinnedMesh=1 / bones<75 / 揺れ物オフ時PhysBones=0
- Rank基準値は creators.vrchat.com 2026-04版。改定時は core の RANKS テーブルのみ更新

## Map
- index.html … 全実装（**生成物**。直接編集禁止 → build/ を編集して結合）
- build/ … ソース分割: 00-head.html（CSS/markup）/ 10-core-a.js（schema/i18n/rank）/ 11-core-b.js（rig/mesh/morph）/ 12-core-c.js（GLB/VRM writer/selfTest）/ 20-app.js（UI/WebGL）
- `<script id="hina-core">`=純粋ロジック（DOM/GL禁止）/ 後続script=UI・WebGL
- tests/run.js … coreを抽出してNode実行。GLB自己バリデータ内蔵
- docs/SPEC.md … 仕様書（完成形定義）。実装と乖離したらSPECが正
- docs/UPLOAD_GUIDE.md … VRChat持込手順（初心者導線の本体）

## Rules（定量）
- core にDOM/WebGL/Canvas参照を入れない（テスト不能化するため）
- 既定6プリセット全てで Quest: 揺れ物ON=Good以上 / OFF=Excellent を維持（テストで担保）
- 1マテリアル・1スキンメッシュ・1プリミティブを崩さない（崩す変更=取締役会付議）
- パラメータ追加は PARAMS スキーマ＋I18N（ja/en両方）必須。テストがパリティ検証

## Workflows
- 結合: `cat build/00-head.html build/10-core-a.js build/11-core-b.js build/12-core-c.js build/20-app.js > index.html`
- テスト: `node tests/run.js`
- 動作確認: index.html をブラウザで開く（`?selftest` で自己診断表示）→ 書出 → UniVRMで読込確認
