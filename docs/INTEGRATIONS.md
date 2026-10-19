# 外部サービスと連携方針

| サービス | 用途 | 状態 |
|---|---|---|
| GitHub | ソース管理（sakamototakurounin-glitch/reading-rating） | 接続済み |
| Vercel | 静的配信 + Serverless Functions | 利用中（vercel.json） |
| OpenAI | 要約採点・語義・手書き認識 | 利用中（Vercel 環境変数） |
| Supabase | — | 未使用 |

## 提案（未実施・要確認）
1. **Vercel × GitHub 連携のプレビュー URL**：PR ごとにプレビューが自動で作られる。本番に出す前にスマホで確認できる。main へのマージ＝本番公開になるため、マージは人が判断する。
2. **Vercel 環境変数の分離**：Preview 環境では別の OpenAI キー（利用上限を低く設定）を使い、本番キーを守る。
3. **Supabase は現時点では不要**。「端末をまたいで履歴を同期したい」という要件が出た場合にのみ検討する（認証 + RLS が必須。既存の localStorage データの移行設計が必要）。
