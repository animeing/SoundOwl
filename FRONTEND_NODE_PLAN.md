# Frontend Node.js 移行方針

このプロジェクトではフロントエンドをPHPの `index.php` からNode.jsに置き換えます。現在のPHP製APIはそのまま利用し、フロント専用のExpressサーバーを追加します。

## 概要
- ルートに `server.js` を配置し、Expressでフロント用HTMLと静的ファイルを配信します。
- `parts/setting.ini` からWebSocketの再試行設定を読み込み、HTMLに注入します。
- APIのエンドポイントは `.env` の `API_BASE_URL` で指定し、フロントからはその値を参照してリクエストを送信します。
- フロントのVueアプリは `frontend/` 以下で開発し、Webpackで `js/main.bundle.js` を出力します。

## 今後の作業
1. `index.php` を段階的にExpressで置き換え、フロントのみNode.jsで動作させる。
2. PHP製APIを残しつつ、必要に応じてAPI側もNode.jsへ移行検討。
3. `.env` のAPI先を変更することでフロントとAPIの分離運用が可能となる。

この方針によりフロントエンドとバックエンドを段階的に分離でき、既存のPHP APIを活かしつつNode.jsベースへの移行を進められます。
