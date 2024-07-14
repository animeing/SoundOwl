[![PHP Composer](https://github.com/animeing/SoundOwl/actions/workflows/php.yml/badge.svg)](https://github.com/animeing/SoundOwl/actions/workflows/php.yml)
[![Docker Image CI](https://github.com/animeing/SoundOwl/actions/workflows/docker-image.yml/badge.svg)](https://github.com/animeing/SoundOwl/actions/workflows/docker-image.yml)
[![NodeJS with Webpack](https://github.com/animeing/SoundOwl/actions/workflows/webpack.yml/badge.svg)](https://github.com/animeing/SoundOwl/actions/workflows/webpack.yml)
[![MariaDB Initial SQL Test](https://github.com/animeing/SoundOwl/actions/workflows/mariadb.yml/badge.svg)](https://github.com/animeing/SoundOwl/actions/workflows/mariadb.yml)
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
- ブラウザにて http://<Server の IPAddress>/#/setting にアクセス
![image](https://github.com/animeing/SoundOwl/assets/24301121/318e6bfa-c9ef-456a-86ea-f7f6796d55a4)
 - 設定を変更せずに "sound regist" ボタンを実行

## Function

### Equalizer
  8Hz ～ 24kHz までの範囲を自由に変更して、お好みの音量に設定することが出来ます。<br>
  ※PresetでFlatを選ぶことで機能をOFFにすることが出来ます。<br>
  ![image](https://github.com/animeing/SoundOwl/assets/24301121/ef815eb8-92de-4325-9c69-b32bfe578625)
### Visualizer
  Visualizer を用いて音楽を視覚的にも楽しむことが出来ます。<br>
  ![image](https://github.com/animeing/SoundOwl/assets/24301121/0c77fcb6-a252-424b-b5f3-ec8a7efb9cf4)
### SoundSculpt
  再生する音源を動的に解析してその瞬間にもっとも目立たせたい音をより強調して聞こえるように自動で調整を行います。<br>
  ※[Setting->Effect->SoundSculpt]のチェックを外すことで機能をOFFにすることが出来ます。
### Loudness normalization
  音楽ファイル毎の音量の差を自動で埋めて、音源ファイル毎に音量調整を行う手間を省きます。<br>
  ※[Setting->Effect->Loudness normalization]のチェックを外すことで機能をOFFにすることが出来ます。<br>
  ※この機能は[Setting->General->Regist Step2]で行っているため、このステータスが[Finished]になっている必要があります。<br>
  ※[Analysis/Sound Count]の項目の[Analysis]の数が Sound Count と一致していない場合、ノーマライズできない音源ファイルが存在している可能性があります。<br>
  ![image](https://github.com/animeing/SoundOwl/assets/24301121/b66d1122-5f4b-438e-8262-607ef6946eda)
### 幅広い音源ファイルに対応
  mp3,m4a,wav,ogg,flac と幅広い音源ファイルに対応しており、例え Browser が音源ファイルの再生に対応してなくとも、自動で wav に変換を行い、再生を試みます。
  変換したデータは一定数を Browser に Cache するため、変換を待つストレスがありません。<br>
  ※変換したデータは fifo で一定数を超えた場合、古いものから順番に消えます。<br>
  ※wav に変換したデータはファイルとして保存することはしないので、Server の容量を無駄に圧迫する心配はありません。<br>

