# Reading Rating

英語読解を「速さ」と「深さ」の2軸で継続的にトレーニングする独立Webアプリです。

- **Quick**: 約200語 × 3本、全9問。正答率に応じて次回の制限時間を調整します。
- **Long**: 800〜1200語、選択5問 + 日本語要約。理解度と期待正答率の差でReading Ratingを更新します。
- 未知語タップ、Vocabstar用コピー、WPM、履歴保存に対応しています。

## Local

静的ファイルは任意のHTTPサーバーで起動できます。`npm test` でRating・Difficulty・Quick時間更新ロジックを検証できます。

## Vercel / OpenAI

Vercelに新規Projectとして登録し、`OPENAI_API_KEY` をProject Environment Variableに設定してください。キー未設定・API一時停止時も、組み込み教材とローカル要約採点で全フローを試せます。

## Main structure

- `lib/config.js`: 調整可能な定数
- `lib/rating.js`: Rating計算
- `lib/difficulty.js`: 出題Difficulty抽選
- `lib/quick.js`: WPMと制限時間更新
- `lib/storage.js`: localStorage永続化
- `api/`: Vercel Serverless Functions
- `data/fallback.js`: オフライン教材
- `tests/core.test.js`: コアロジックのテスト
