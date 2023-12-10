#!/bin/bash

# 音楽ファイルのディレクトリをユーザーに尋ねる
read -r -p "音楽ファイルが保存されているディレクトリのパスを入力してください: " music_dir

# WindowsスタイルのパスをLinuxスタイルに変換
music_dir="${music_dir//\\//}"

# SMB共有のパスかどうかを確認
if [[ $music_dir =~ ^//[^/]+/ ]]; then
  # SMB共有の場合
  # ユーザー名とパスワードを尋ねる
  read -p "SMB共有のユーザー名を入力してください: " smb_username
  read -s -p "SMB共有のパスワードを入力してください: " smb_password
  echo ""

  # マウントポイントを作成（存在しない場合）
  mkdir -p /mnt/music

  # SMB共有をマウント
  sudo mount -t cifs "$music_dir" /mnt/music -o username="$smb_username",password="$smb_password"

  # Dockerコンテナで使用するパスを設定
  export MUSIC_DIR=/mnt/music
else
  # 通常のディレクトリの場合
  export MUSIC_DIR=$music_dir
fi


chown www-data:www-data ./parts/setting.ini
chown www-data:www-data ./api/lock

# Dockerコンテナを起動
docker-compose up -d
