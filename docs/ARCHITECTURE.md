# ARCHITECTURE — Reading Rating

## 構成
- 静的フロント：`index.html` / `styles.css` / `src/`（UI）/ `lib/`（ロジック、ES Modules、フレームワークなし）
- サーバー：`api/*.js` = Vercel Serverless Functions（OpenAI Responses API を中継、`api/_openai.js`、既定モデル gpt-4.1-mini）
  - 使用中：`grade-summary`（要約採点）、`lookup-words`（単語）、`recognize-handwriting`（手書き）、`classify-expressions`
  - 無効（410）：`generate-quick` / `generate-long`（出題は固定バンクのみ）
- データ：`data/banks/`（Quick 167 本文 / Long 300 本文・Level 0〜9）、`data/translations/long/`（Long の和訳）
- ビルド：`scripts/build.js` が `dist/` にコピーするだけ。Vercel は `dist/` を配信し、`/api` 以外は index.html へリライト

## 保存方式（すべて端末内・サーバー保存なし）
- localStorage `reading-rating-state-v1`：Rating、Quick 制限時間、履歴の概要など
- IndexedDB `reading-rating-history-v1`：詳細な履歴
- 端末を変えるとデータは引き継がれない（現仕様）

## 環境変数
- `OPENAI_API_KEY`：Vercel のみで設定（`.env.example` 参照、`.env` は gitignore 済み）

## 重要な設計判断
- 出題に AI を使わない（固定バンク）。AI は採点・語義・手書き認識のみ。
- 要約採点 API が失敗した場合は「採点保留」とし、Rating を更新しない（ローカルでの暫定採点はしない）。
- Long は 30 点満点（選択 5×4 + 要約 10）。旧履歴は 25 点満点のまま保持。
- Level 2・3（2026-10 差し替え）は解説（rationale）なし。設問・選択肢の和訳（`stem_ja`・`choices[].text_ja`）を持ち、`adaptLong` が `promptJa`・`choicesJa` に変換して結果画面に表示する。和訳がない問題は従来の解説を表示。
- 詳細仕様は README.md / BANK_INTEGRATION_REPORT.md / TRANSLATION_SCORING_RELEASE.md

## テスト
- `npm test`：node --test（tests/*.test.js）
- `npm run test:e2e`：Playwright（iPhone 13 / Desktop Chrome、python3 http.server :4173、`/api/**` はモックで遮断）
