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

  # マウントポイントを確認
  if mountpoint -q /mnt/music; then
    echo "/mnt/music は既にマウントポイントとして使用されています。"
    read -r -p "/mnt/music をアンマウントし、再マウントしてもよろしいですか？ (y/n): " response
    if [[ "$response" != "y" ]]; then
      echo "操作を中止しました。"
      exit 1
    fi

    # アンマウント
    sudo umount /mnt/music
  fi

  # マウントポイントを作成（存在しない場合）
  sudo mkdir -p /mnt/music

  # /etc/fstabにエントリがあるか確認し、削除
  if grep -qs "^$music_dir" /etc/fstab; then
    echo "既存のSMB共有エントリを /etc/fstab から削除しています。"
    sudo sed -i "\|^$music_dir|d" /etc/fstab
  fi

  # SMB共有をマウント
  sudo mount -t cifs "$music_dir" /mnt/music -o username="$smb_username",password="$smb_password"

  # /etc/fstabにエントリを追加して自動マウントを設定
  echo "$music_dir /mnt/music cifs username=$smb_username,password=$smb_password 0 0" | sudo tee -a /etc/fstab

  # Dockerコンテナで使用するパスを設定
  music_dir=/mnt/music
else
  # 通常のディレクトリの場合
  music_dir=$music_dir
fi

# .envファイルを生成
echo "MUSIC_DIR=${music_dir}" > .env

# setting.iniのsound_directoryを更新
sed -i "s|^sound_directory=.*|sound_directory='${music_dir}'|" ./parts/setting.ini

# 権限の設定
sudo chown www-data:www-data ./parts/setting.ini
sudo chown www-data:www-data ./api/lock/

# Dockerコンテナを起動
docker-compose up -d
