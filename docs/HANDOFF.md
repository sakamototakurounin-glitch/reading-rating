# HANDOFF — 作業引き継ぎ

Claude Code / Codex のどちらも、作業開始時にこのファイルを読み、終了時に更新する。新しい記録を上に追加し、古い記録は簡潔に保つ（目安 100 行以内）。

## 作業中（同時編集防止）
| 担当AI | ブランチ | 編集予定ファイル | 開始日 |
|---|---|---|---|
| Codex | codex/unify-long-points | data/banks/long/（配点のみ）, lib/long-scoring.js, scripts/import-banks.py, tests/, docs/ | 2026-10-20 |

## 未解決の問題
- Level 4・5 は再生成中（作成ガイド long_reading_300_creation_guide に基づく）。完成後に L2・L3 と同じ形式（解説なし・設問和訳つき）で差し替える予定。
- Level 0・1・6〜9 は旧データ（解説あり）。設問和訳は作成済みだが未取り込み。
- L2・L3 の差し替えで、旧版と同じ ID（L2-001〜010、L3-001〜020）の題は内容が変わった。既存ユーザーの出題履歴上は「出題済み」扱いになる（実害は小さい）。
- `scripts/import-banks.py` は正解 score=3 を前提にしたまま（新データは 4）。再取り込みに使う場合は要修正。
- `api/generate-quick.js` / `api/generate-long.js` は 410 で無効化済み（README の方針どおり）。削除するかは未決定。
- E2E は現在スモークテストのみ（表示・保存保持・横スクロール）。Quick/Long の一連フローは `scripts/check-bank-browser.mjs`（Edge 前提）にある。必要なら Playwright 側へ移植する。

## 作業記録
### 2026-10-20 Claude Code — Long Level 2・3 を新90題に差し替え（`claude/long-l2-l3`）
- `data/banks/long/level-2.json`（40題）・`level-3.json`（50題）を差し替え。解説（rationale）を削除し、設問・選択肢の和訳を追加。
- `data/translations/long/L2-*.json`・`L3-*.json` を自然な意訳に更新（90件）。manifest を300題に更新。
- 仕様変更：結果画面の各設問で、和訳がある問題は「解説を見る」の代わりに「和訳を見る」（設問文と選択肢A〜Dの和訳）を表示。
- テスト：題数の期待値を300題に更新し、正解 score は 3 または 4 を許容。npm test 86件・E2E 6件成功、390px で Level 3 の結果画面を確認済み。
### 2026-10-19 Claude Code — 開発環境整備（`claude/dev-setup`）
- 追加：AGENTS.md（共通ルール）、CLAUDE.md（AGENTS.md を取り込む）、docs/、Playwright（`npm run test:e2e`、e2e/smoke.spec.js）
- アプリ本体のコード・データの変更はなし。
- 仕様変更：なし
