# Reading Rating

英語読解を「速さ」と「深さ」の2軸で継続的にトレーニングする独立Webアプリです。

- **Quick**: 指定の167本文・501問から約200語 × 3本、全9問。Longとは独立したQuick Ratingで読書時間を設定します。目標速度は `max(10, Quick Rating) × 3` 語/分、各本文の制限秒数は `ceil(語数 × 60 / 目標速度)`。Rating 10以下でも実際のRatingは変更せず、時間計算だけ10として扱います。9/8/7/6/5問正解はそれぞれ +2/+1/0/−1/−2、4問以下は−3（下限0、内部値はLong同様100を超えて保持、表示は100まで）。直近成績の平均や旧45〜300秒制限は使用しません。末尾の2本文も次セットへ繰り越して消費します。
- **Long**: 指定の300本文・1500問（Level 0〜9。Level 2は40本文、Level 3は50本文）。内部Ratingから `round(clamp(rating,0,100)/10 + uniform(-1,1))` を新規開始時に1回だけ抽選。各レベルの未出題本文を優先します。
- 未知語タップ、Vocabstar用コピー、履歴保存に対応しています。Long/Quickとも実測WPMの表示・計算・新規記録は廃止しました。既存のWPMデータは履歴内に保持しますが表示しません。

初回のスライダーで選んだRatingをLong/Quick共通の初期値にし、以後は別々に更新します。既存端末ではQuick Ratingが未設定の場合だけ、その時点のLong Ratingを初期値に移行します。旧Quick履歴の再採点はせず、Ratingのない旧履歴は「Rating記録なし」と表示します。Reading timeは保持し、Longの読書時間や採点ロジック、選択問題の60秒/120秒制限は変更しません。

## Local

静的ファイルは任意のHTTPサーバーで起動できます。`npm test` でRating・Difficulty・Quick Ratingと読書時間・旧履歴の互換性を検証できます。

## Vercel / OpenAI

既存のVercel設定とサーバー側の`OPENAI_API_KEY`を使用します。問題生成APIは410で無効化し、出題にAIを使いません。単語取得・手書き認識・日本語要約採点APIは従来どおり維持します（最新のユーザー指示）。

要約採点APIが失敗した場合は採点保留となり、Ratingと完了履歴は更新しません。ホームから再開・再試行できます。ローカル暫定採点やデフォルト問題へのフォールバックはありません。

Long全300題の全文和訳を`data/translations/long/`に事前収録しています。翻訳APIは使用せず、結果・履歴の和訳タブから表示します。新規Longでは和訳も読み込み、履歴に保存します。英文・設問は元データを維持しています。Long は全レベルで解説の代わりに設問・選択肢の和訳（`stem_ja`・`text_ja`）を収録し、結果画面の「和訳を見る」で表示します（Quick は従来の解説）。Quickの和訳は今回の対象外です。

Longの教材データも全1500問で正解4点・誤答0点に統一しています。実際の採点は`lib/long-scoring.js`の正解数×4点（選択20点＋要約10点）です。`scripts/import-banks.py`は旧3点の教材を読み込んだ場合も、正解IDに対応する配点だけを4点へ変換します。設問・選択肢・和訳・正解IDは保持し、端末に保存済みの旧25点満点の履歴は再採点しません。

Longは選択問題5問×4点＋要約10点＝30点満点です。要約は内部最大11点を切り捨て・上限10点にして加算します。文章RatingとユーザーRatingが一致すると期待率は2/3（20/30点）。初回倍率はありません。旧履歴は元の25点満点のまま保持します。選択問題の制限時間はQuick 60秒／Long 120秒、Long読書制限時間は60 WPM基準です。模範要約は250〜300字を目安にします。

## Main structure

- `lib/config.js`: 調整可能な定数
- `lib/rating.js`: Rating計算
- `lib/question-bank.js`: 固定バンク読込、IDベースの選択肢シャッフル、デッキとLongレベル抽選
- `lib/quick.js`: Quick Rating更新と語数に応じた読書時間計算
- `lib/storage.js`: localStorage永続化
- `api/`: Vercel Serverless Functions
- `data/banks/`: 今回指定された問題集のみ（LongはLevel別に分割）
- `scripts/import-banks.py`: 指定ZIPから内容を変更せず取り込むツール
- `scripts/check-bank-browser.mjs`: Edge/Playwrightでのモバイルフロー確認（別途HTTPサーバーが必要）
- `tests/core.test.js`: コアロジックのテスト
