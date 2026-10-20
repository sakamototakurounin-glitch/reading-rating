# HANDOFF — 作業引き継ぎ

Claude Code / Codex のどちらも、作業開始時にこのファイルを読み、終了時に更新する。新しい記録を上に追加し、古い記録は簡潔に保つ（目安 100 行以内）。

## 作業中（同時編集防止）
| 担当AI | ブランチ | 編集予定ファイル | 開始日 |
|---|---|---|---|
| Claude Code | `claude/long-ja-all` | data/banks/long/level-0,1,6,7,8,9.json, README.md, docs/ | 2026-10-20 |

## 未解決の問題
- Level 0・1・6〜9 は旧データ（解説あり）。設問和訳は作成済みだが未取り込み。
- L2〜L5 の差し替えで同じ ID の題は内容が変わった。履歴の和訳タブは常にサーバーの最新和訳を読むため、旧版で解いた履歴では英文と和訳が食い違う。オーナー判断で履歴は全消去する方針のため対応しない。
- L4・L5 は Opus の抜き取り再検証（10題）で 6 題に軽微な修正あり。残り 90 題にも同程度の軽微な問題が残る可能性（全件検証は未実施）。
- `api/generate-quick.js` / `api/generate-long.js` は 410 で無効化済み（README の方針どおり）。削除するかは未決定。
- E2E はスモークに加え、Level 0/2 のLong採点フロー（20+10=30、要約11→10、和訳の並び）を検証する。Quick の一連フローは `scripts/check-bank-browser.mjs`（Edge 前提）にある。

## 作業記録
### 2026-10-20 Claude Code — Long Level 4・5 を再生成版に差し替え（`claude/long-l4-l5`）
- `level-4.json`・`level-5.json`（各50題）を作成ガイドに基づく再生成版に差し替え（解説なし・設問和訳つき・正解 score 4）。L4・L5 の本文和訳 100 件も更新。
- 仕様変更：L4・L5 の結果画面も「和訳を見る」表示になった。
- 検証：作成 Opus → 検証 Sonnet → 正解漏れ（慎重表現の偏り）修正 → Opus 抜き取り再検証 10 題。npm test 89件・E2E 10件成功、390px で Level 5 の結果画面を確認。
### 2026-10-20 Codex — Long配点メタデータを4点へ統一（`codex/unify-long-points`）
- Claudeの更新済みmain（49a7ed8）を確認。Long300題、本文和訳300件、新L2/L3の設問和訳450問を確認。
- 仕様：実際の採点は従来から4点。今回、旧1050問の正解 `score:3` を4へ統一し、全1500問で一致させた。本文・設問・選択肢・和訳・正解IDは不変。端末履歴も変更しない。
- 取り込み：旧3点を4点へ正規化し、300題JSON/ZIPにも対応。不正な配点・正解IDは拒否。
- 検証：単体テスト89件、全文和訳300件、ビルド、Chromiumのスマホ/PC E2E10件成功。E2Eはローカルのみ、採点APIはモック。設問・選択肢の和訳がシャッフル後も一致することを確認。
### 2026-10-20 Claude Code — Long Level 2・3 を新90題に差し替え（`claude/long-l2-l3`）
- `data/banks/long/level-2.json`（40題）・`level-3.json`（50題）を差し替え。解説（rationale）を削除し、設問・選択肢の和訳を追加。
- `data/translations/long/L2-*.json`・`L3-*.json` を自然な意訳に更新（90件）。manifest を300題に更新。
- 仕様変更：結果画面の各設問で、和訳がある問題は「解説を見る」の代わりに「和訳を見る」（設問文と選択肢A〜Dの和訳）を表示。
- テスト：題数の期待値を300題に更新し、正解 score は 3 または 4 を許容。npm test 86件・E2E 6件成功、390px で Level 3 の結果画面を確認済み。
### 2026-10-19 Claude Code — 開発環境整備（`claude/dev-setup`）
- 追加：AGENTS.md（共通ルール）、CLAUDE.md（AGENTS.md を取り込む）、docs/、Playwright（`npm run test:e2e`、e2e/smoke.spec.js）
- アプリ本体のコード・データの変更はなし。
- 仕様変更：なし
