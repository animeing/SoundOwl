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
