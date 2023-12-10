# SoundOwl

Local で保存している音楽データをブラウザで再生するソフトです。<br>
Intranet 内でブラウザが入っている PC があれば視聴できることが特徴です。

## スクリーンショット

<img alt="トップページ" src="https://user-images.githubusercontent.com/24301121/173390637-f2cb09ec-3588-4943-9abd-64256442e158.png" width="19%"> <img alt="検索画面" src="https://user-images.githubusercontent.com/24301121/173392022-02f34678-ad28-4fae-b7dc-098f83d7c15b.png" width="19%"> <img alt="アルバム一覧" src="https://user-images.githubusercontent.com/24301121/173392861-7d53059d-614f-4458-9098-c86403d08dd2.png" width="19%"> <img alt="visualizer" src="https://user-images.githubusercontent.com/24301121/173393214-5dcf1221-54b7-4786-baba-1723e751e005.png" width="19%"> <img alt="歌詞表示" src="https://user-images.githubusercontent.com/24301121/173393548-9b1102eb-3548-4f19-8da6-a38d4633e89e.png" width="19%">

## 動作環境

- OS
  - Windows
  - Linux
- Server
  - Apache
- DB
  - MariaDB
- その他
  - PHP8.1

## Install

### Linux

- curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash -
- apt install -y redis ffmpeg screen php-xml php8.1-gd composer nodejs
- git clone https://github.com/animeing/SoundOwl.git /var/www/html
- composer install
- cd /var/www/html/frontend
- npm install
- npx webpack --config webpack.config.js
- systemctl restart apache2
- systemctl start redis-server
- screen
- php /var/www/html/api/quescript/queueAction.php
- ブラウザにて http://<Server の IPAddress>/#/setup にアクセス
  <img src="https://user-images.githubusercontent.com/24301121/178284171-61d9077c-6517-4666-9d65-8187f935de9c.png" width="100%">

- Database の情報と音源の存在するフォルダを入力(WebSocket は必要であれば変更してください。)
- SetUp ボタンを押してしばらく待つ(対象の曲数によっては数日を要する場合がありますが、その SetUp 中も利用することは可能です。)
- screen
- php /var/www/html/api/sw/server.php
- ※SetUp ボタンは WebSocket 通信が確立してない場合、押下することができません。
- ※ラウンドネス・ノーマライゼーション機能を期待する場合は完全に SetUp が終わるのを待つ必要があります。

### Docker

- git clone https://github.com/animeing/SoundOwl.git
- cd SoundOwl
- apt install -y docker docker-compose
- docker build -t soundowl:lastest .
- chmod 755 make.sh
- ./make.sh
