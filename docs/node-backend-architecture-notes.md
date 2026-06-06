# Node.js 設計メモ

この文書は SoundOwl の Node.js バックエンドについて記載します。

API の URL には互換性のため `.php` 名が残っていますが、実行される処理は Node.js です。

MySQL 接続は retry 付きで確認し、lock は Node.js process 内で管理します。
