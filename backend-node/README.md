# SoundOwl Node Backend

この文書は SoundOwl の Node.js バックエンドについて記載します。

API の URL には互換性のため `.php` 名が残っていますが、実行される処理は Node.js です。

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