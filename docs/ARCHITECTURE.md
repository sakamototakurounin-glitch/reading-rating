# ARCHITECTURE — Reading Rating

## 構成
- 静的フロント：`index.html` / `styles.css` / `src/`（UI）/ `lib/`（ロジック、ES Modules、フレームワークなし）
- サーバー：`api/*.js` = Vercel Serverless Functions（OpenAI Responses API を中継、`api/_openai.js`、既定モデル gpt-4.1-mini）
  - 使用中：`grade-summary`（要約採点）、`lookup-words`（単語）、`recognize-handwriting`（手書き）、`classify-expressions`
  - 無効（410）：`generate-quick` / `generate-long`（出題は固定バンクのみ）
- データ：`data/banks/`（Quick 167 本文 / Long 300 本文・Level 0〜9）、`data/translations/long/`（Long の和訳）
- ビルド：`scripts/build.js` が `dist/` にコピーするだけ。Vercel は `dist/` を配信し、`/api` 以外は index.html へリライト

## 保存方式（すべて端末内・サーバー保存なし）
- localStorage `reading-rating-state-v1`：Long の `internalRating`、独立した `quickRating`、履歴の概要など。旧 `quickTimeLimit` は読めても使用しない。
- IndexedDB `reading-rating-history-v1`：詳細な履歴
- 履歴復元時はlocalStorageとIndexedDBをIDで統合し、localStorageのみに残る旧履歴も保存する。新規Rating履歴が存在することを理由に旧履歴を置換しない。
- 端末を変えるとデータは引き継がれない（現仕様）

## 環境変数
- `OPENAI_API_KEY`：Vercel のみで設定（`.env.example` 参照、`.env` は gitignore 済み）

## 重要な設計判断
- 出題に AI を使わない（固定バンク）。AI は採点・語義・手書き認識のみ。
- 要約採点 API が失敗した場合は「採点保留」とし、Rating を更新しない（ローカルでの暫定採点はしない）。
- Long は 30 点満点（選択 5×4 + 要約 10）。旧履歴は 25 点満点のまま保持。
- Quick は全9問の正解数で独立したRatingを更新（9→+2、8→+1、7→0、6→−1、5→−2、0〜4→−3、下限0）。初回選択値はLongと同じ。旧端末は未設定時だけ現在のLong Ratingを引き継ぎ、旧履歴の再採点はしない。
- Quick の各本文読書時間は `ceil(wordCount * 60 / (max(10, quickRating) * 3))` 秒。3本文とも開始時点のRatingを使用し、セット終了時に1回更新する。選択問題は従来どおり1問60秒、Longは120秒。
- Long/Quick の実測WPMは計算・表示・新規保存しない。旧履歴の速度フィールドは削除せず、画面だけ非表示にする。読書時間は保持し、Long の60語/分基準の読書制限・採点は変更しない。
- 教材全1500問の正解 `score` も4点、誤答は0点。`scripts/long_bank_format.py` が取り込み時に旧3点の正解メタデータを4点へ変換する。本文・設問・和訳・正解IDは保持し、不正な正解IDや部分点は拒否する。manifest の `longScoring` と実採点の一致をテストする。
- Long 全レベルで解説（rationale）なし（2026-10。L2・L3 は新版、L4・L5 は作成ガイドに基づき全文再生成、その他は英文そのままで解説を和訳に置換）。設問・選択肢の和訳（`stem_ja`・`choices[].text_ja`）を持ち、`adaptLong` が `promptJa`・`choicesJa` に変換して結果画面に表示する。和訳がない問題は従来の解説を表示。
- 詳細仕様は README.md / BANK_INTEGRATION_REPORT.md / TRANSLATION_SCORING_RELEASE.md

## テスト
- `npm test`：node --test（tests/*.test.js）
- `npm run test:e2e`：Playwright（iPhone 13 / Desktop Chrome、python3 http.server :4173、`/api/**` はモックで遮断）
