# Security Policy

## Supported Versions
| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ |

## 設計上の安全性
- 完全ローカル動作。ネットワーク通信を一切行わない（fetch/XHR/WebSocket不使用）。
- 外部依存ゼロ。CDN・トラッカー・解析ツールなし。
- 収集データなし。パラメータ自動保存はブラウザのlocalStorageのみ（端末外に出ない）。

## 脆弱性の報告
公開Issueでの報告は禁止。GitHubの **Private vulnerability reporting** から報告してください。
- 初回応答: 72時間以内
- 修正リリース: 30日以内（CRITICAL は即時対応）
