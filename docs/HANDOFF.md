# HANDOFF — 作業引き継ぎ

Claude Code / Codex のどちらも、作業開始時にこのファイルを読み、終了時に更新する。新しい記録を上に追加し、古い記録は簡潔に保つ（目安 100 行以内）。

## 作業中（同時編集防止）
| 担当AI | ブランチ | 編集予定ファイル | 開始日 |
|---|---|---|---|
| Claude Code | `claude/long-l2-l3` | data/banks/long/level-2.json, level-3.json, data/banks/manifest.json, data/translations/long/L2-*, L3-*, lib/question-bank.js, src/app.js, styles.css, tests/question-bank.test.js | 2026-10-20 |

## 未解決の問題
- `api/generate-quick.js` / `api/generate-long.js` は 410 で無効化済み（README の方針どおり）。削除するかは未決定。
- E2E は現在スモークテストのみ（表示・保存保持・横スクロール）。Quick/Long の一連フローは `scripts/check-bank-browser.mjs`（Edge 前提）にある。必要なら Playwright 側へ移植する。

## 作業記録
### 2026-10-19 Claude Code — 開発環境整備（`claude/dev-setup`）
- 追加：AGENTS.md（共通ルール）、CLAUDE.md（AGENTS.md を取り込む）、docs/、Playwright（`npm run test:e2e`、e2e/smoke.spec.js）
- アプリ本体のコード・データの変更はなし。
- 仕様変更：なし
