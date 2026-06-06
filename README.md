[![Docker Image CI](https://github.com/animeing/SoundOwl/actions/workflows/docker-image.yml/badge.svg)](https://github.com/animeing/SoundOwl/actions/workflows/docker-image.yml)
[![NodeJS with Webpack](https://github.com/animeing/SoundOwl/actions/workflows/webpack.yml/badge.svg)](https://github.com/animeing/SoundOwl/actions/workflows/webpack.yml)
[![MariaDB Initial SQL Test](https://github.com/animeing/SoundOwl/actions/workflows/mariadb.yml/badge.svg)](https://github.com/animeing/SoundOwl/actions/workflows/mariadb.yml)

# SoundOwl

SoundOwl は、ローカルまたは家庭内ネットワーク上に保存している音楽ファイルをブラウザで再生するための音楽プレイヤーです。  
同じ Intranet 内にある PC や端末で、ブラウザから音楽ライブラリを検索・再生できます。

現在のバックエンドは Node.js で動作します。互換性維持のため API の URL には `.php` 拡張子が残っているものがありますが、処理本体は Node.js 側に移行しています。

## スクリーンショット

<img alt="トップページ" src="https://user-images.githubusercontent.com/24301121/173390637-f2cb09ec-3588-4943-9abd-64256442e158.png" width="19%"> <img alt="検索画面" src="https://user-images.githubusercontent.com/24301121/173392022-02f34678-ad28-4fae-b7dc-098f83d7c15b.png" width="19%"> <img alt="アルバム一覧" src="https://user-images.githubusercontent.com/24301121/173392861-7d53059d-614f-4458-9098-c86403d08dd2.png" width="19%"> <img alt="visualizer" src="https://user-images.githubusercontent.com/24301121/173393214-5dcf1221-54b7-4786-baba-1723e751e005.png" width="19%"> <img alt="歌詞表示" src="https://user-images.githubusercontent.com/24301121/173393548-9b1102eb-3548-4f19-8da6-a38d4633e89e.png" width="19%">

## 動作環境

- Node.js 26 系を想定
- MariaDB
- Redis
- ffmpeg / ffprobe
- Docker Compose

## Docker で起動

```bash
git clone https://github.com/animeing/SoundOwl.git
cd SoundOwl
chmod 755 make.sh
./make.sh
```

`make.sh` は音楽ディレクトリを確認し、`.env` と初期設定ファイルを作成して、必要な Docker サービスを起動します。SMB 共有を指定した場合は `/mnt/music` へマウントします。パスワードの平文保存を避けるため、`/etc/fstab` への自動登録は行いません。

主なサービスは次の通りです。

- `frontend`: ブラウザから利用するフロントエンド
- `backend`: API、音声・画像配信、WebSocket 通知を担当する Node.js バックエンド
- `db`: MariaDB
- `redis`: 登録処理や解析処理の待ち行列

起動後のアクセス先は次の通りです。

- フロントエンド: `http://<server-ip>/`
- Backend API: `http://<server-ip>:3000/`
- WebSocket: `ws://<server-ip>:8080/`

## 初期設定

1. ブラウザで `http://<server-ip>/` を開きます。
2. 設定画面で BackendServer の接続先を確認し、必要に応じて保存します。
3. 音楽ディレクトリを設定します。
4. Sound Regist を実行して、音楽ファイルを DB に登録します。
5. Loudness normalization を使う場合は、解析処理が完了するまで待ちます。

## 開発

バックエンドのテストとフロントエンドのビルドは次のコマンドで確認できます。

```bash
npm install --prefix backend-node
npm test --prefix backend-node
npm ci --prefix frontend
npm run build --prefix frontend
```

バックエンドの詳細は [backend-node/README.md](backend-node/README.md) を参照してください。  
API 互換性や移行確認の観点は [docs/backend-migration-readiness-evidence.md](docs/backend-migration-readiness-evidence.md) と [docs/backend-c0-contract.md](docs/backend-c0-contract.md) にまとめています。

## 機能

### Equalizer

8Hz から 24kHz までの範囲を調整して、好みの音量バランスに設定できます。  
Preset で Flat を選ぶことで、機能を OFF にできます。

![Equalizer](https://github.com/animeing/SoundOwl/assets/24301121/ef815eb8-92de-4325-9c69-b32bfe578625)

### Visualizer

Visualizer を使って、音楽を視覚的にも楽しめます。

![Visualizer](https://github.com/animeing/SoundOwl/assets/24301121/0c77fcb6-a252-424b-b5f3-ec8a7efb9cf4)

### SoundSculpt

再生中の音源を動的に解析し、目立たせたい音域を自動的に調整します。  
`Setting -> Effect -> SoundSculpt` のチェックを外すことで、機能を OFF にできます。

### Loudness Normalization

音楽ファイルごとの音量差を解析し、音源ごとの音量差を抑えて再生しやすくします。  
`Setting -> Effect -> Loudness normalization` のチェックを外すことで、機能を OFF にできます。

この機能は登録処理の Step2 で解析されます。`Analysis/Sound Count` の `Analysis` が `Sound Count` と一致していない場合は、まだ解析が終わっていない音源が残っている可能性があります。

![Loudness normalization](https://github.com/animeing/SoundOwl/assets/24301121/b66d1122-5f4b-438e-8262-607ef6946eda)

### Impulse Response Effect

Impulse Response Effect は、インパルス応答データを使用して、ホールや部屋などの空間的な響きを再現する機能です。  
ユーザーはインパルス応答ファイルをアップロードし、任意の音響効果を適用できます。

![Impulse Response Effect](https://github.com/user-attachments/assets/f61fa469-40d6-4e5f-86b0-e1826513878a)

主な操作は次の通りです。

- アップロード: インパルス応答ファイルを選択してアップロードします。
- 削除: 登録済みのインパルス応答ファイルを削除します。
- データ適用: アップロード済みのデータを選択して、再生音に適用します。

### 幅広い音源ファイルに対応

mp3、m4a、wav、ogg、flac などの音源ファイルに対応しています。  
ブラウザが直接再生できない形式でも、必要に応じて再生しやすい形式へ変換して配信します。

変換したデータは一定数を超えると古いものから順に削除されます。変換結果を永続的な音源ファイルとして保存することは想定していないため、サーバ容量を無制限に圧迫しない構成です。
