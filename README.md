# SoundOwl
Localで保存している音楽データをブラウザで再生するソフトです。<br>
Intranet内でブラウザが入っているPCがあれば視聴できることが特徴です。

## スクリーンショット
<img alt="トップページ" src="https://user-images.githubusercontent.com/24301121/173390637-f2cb09ec-3588-4943-9abd-64256442e158.png" width="19%"> <img alt="検索画面" src="https://user-images.githubusercontent.com/24301121/173392022-02f34678-ad28-4fae-b7dc-098f83d7c15b.png" width="19%"> <img alt="アルバム一覧" src="https://user-images.githubusercontent.com/24301121/173392861-7d53059d-614f-4458-9098-c86403d08dd2.png" width="19%"> <img alt="visualizer" src="https://user-images.githubusercontent.com/24301121/173393214-5dcf1221-54b7-4786-baba-1723e751e005.png" width="19%"> <img alt="歌詞表示" src="https://user-images.githubusercontent.com/24301121/173393548-9b1102eb-3548-4f19-8da6-a38d4633e89e.png" width="19%">

## 動作環境
* OS
  * Windows
  * Linux
* Server
  * Apache
* DB
  * MariaDB
* その他
  * PHP8.1

## Install
* git clone https://github.com/animeing/SoundOwl.git /var/www/html
* apt install -y php-xml
* apt install -y composer
* composer install
* systemctl restart apache2

