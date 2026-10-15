# Reading Rating

英語読解を「速さ」と「深さ」の2軸で継続的にトレーニングする独立Webアプリです。

- **Quick**: 指定の167本文・501問から約200語 × 3本、全9問。直近3セッションの正答率で制限時間を調整します。末尾の2本文も次セットへ繰り越して消費します。
- **Long**: 指定の240本文・1200問（Level 0〜9）。内部Ratingから `round(clamp(rating,0,100)/10 + uniform(-1,1))` を新規開始時に1回だけ抽選。各レベルの未出題本文を優先します。
- 未知語タップ、Vocabstar用コピー、WPM、履歴保存に対応しています。

## Local

静的ファイルは任意のHTTPサーバーで起動できます。`npm test` でRating・Difficulty・Quick時間更新ロジックを検証できます。

## Vercel / OpenAI

既存のVercel設定とサーバー側の`OPENAI_API_KEY`を使用します。問題生成APIは410で無効化し、出題にAIを使いません。単語取得・手書き認識・日本語要約採点APIは従来どおり維持します（最新のユーザー指示）。

要約採点APIが失敗した場合は採点保留となり、Ratingと完了履歴は更新しません。ホームから再開・再試行できます。ローカル暫定採点やデフォルト問題へのフォールバックはありません。

今回の問題集に全文和訳は含まれないため、和訳タブには「未収録」と表示します。本文・設問・解説のAI再生成は行っていません。

## Main structure

- `lib/config.js`: 調整可能な定数
- `lib/rating.js`: Rating計算
- `lib/question-bank.js`: 固定バンク読込、IDベースの選択肢シャッフル、デッキとLongレベル抽選
- `lib/quick.js`: WPMと制限時間更新
- `lib/storage.js`: localStorage永続化
- `api/`: Vercel Serverless Functions
- `data/banks/`: 今回指定された問題集のみ（LongはLevel別に分割）
- `scripts/import-banks.py`: 指定ZIPから内容を変更せず取り込むツール
- `scripts/check-bank-browser.mjs`: Edge/Playwrightでのモバイルフロー確認（別途HTTPサーバーが必要）
- `tests/core.test.js`: コアロジックのテスト
