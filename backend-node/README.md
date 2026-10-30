# SoundOwl Node Backend

この文書は SoundOwl の Node.js バックエンドについて記載します。

API の URL には互換性のため `.php` 名が残っていますが、実行される処理は Node.js です。

登録走査・個別更新の失敗（Step1）と音量解析の失敗（Step2）は、MariaDB の `registration_failures` にファイルパスと Step ごとに未解決の1件として保存します。再試行で同じ Step が成功するとその行を削除します。テーブルは初回利用時に `CREATE TABLE IF NOT EXISTS` で追加され、既存の音源表は変更しません。データベース初期化では失敗記録も消去します。導入前の失敗は遡って記録しません。

設定画面は `GET /api/registration_failures.php?step=all|step1|step2&limit=25&offset=0` を使います。応答は `counts`、`total`、`failures`、`limit`、`offset` です。`failures` の各要素は `step`、`target`、公開用の `reason`、`updatedAt` を含み、最大50件を返します。DBに接続できない場合は503を返すため、画面には失敗状態を取得できないことが表示されます。

## テスト

```bash
npm test
npm run test:coverage
```

## 設計

DB、Redis、WebSocket、音声解析ワーカーを同一ランタイムで扱います。

## 音楽ディレクトリ

音源登録で走査するパスは、SOUND_PATH、SOUND_DIRECTORY、画面で保存した sound_directory、SOUND_DIRECTORY_DEFAULT の順に決まります。環境変数 SOUND_PATH または SOUND_DIRECTORY が指定されている場合、設定画面には有効なパスと固定中の理由を表示し、編集を無効にします。未設定、相対パス、ファイルシステムのルートを走査先にはできません。

Docker Compose はホストの MUSIC_DIR をコンテナの /music にマウントし、既定の走査先を /music にします。画面で /music/サブディレクトリ を保存するとその場所を走査します。環境変数 SOUND_PATH=/music/サブディレクトリ を明示した場合は画面設定より優先します。画面にはコンテナ内のパスを入力してください。

## 再生通知と再送

再生通知の成功時は、再生回数の増加と履歴1件の追加を同じDBトランザクションで確定します。存在しない曲はHTTP 404となり、履歴を追加しません。書込みに失敗した場合は両方をロールバックします。

現行APIには再生イベントIDがありません。成功応答を受け取れなかった場合も、同じ通知の再送を重複と判定できず、再送が成功すれば別の1回として数えます。フロントエンドは自動再送しません。通信途絶後も安全に再送できるようにするには、イベントIDとDBの一意制約を追加する必要があります。
