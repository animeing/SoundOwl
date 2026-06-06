#!/bin/bash
set -euo pipefail

echo "SoundOwl setup"
read -r -p "Music directory path: " music_dir
music_dir="${music_dir//\\//}"

if [[ -z "$music_dir" ]]; then
  echo "Music directory is required." >&2
  exit 1
fi

resolved_music_dir="$music_dir"

if [[ "$music_dir" == //* ]]; then
  mount_point="/mnt/music"
  echo "SMB path detected. Mounting to ${mount_point}."
  echo "fstab persistence is not restored because it stores passwords in plain text."
  read -r -p "SMB username: " smb_user
  read -r -s -p "SMB password: " smb_password
  echo

  if [[ -z "$smb_user" ]]; then
    echo "SMB username is required." >&2
    exit 1
  fi

  sudo mkdir -p "$mount_point"

  if mountpoint -q "$mount_point"; then
    read -r -p "${mount_point} is already mounted. Remount? [y/N]: " remount_answer
    if [[ "$remount_answer" =~ ^[Yy]$ ]]; then
      sudo umount "$mount_point"
    else
      echo "Using existing mount."
      resolved_music_dir="$mount_point"
    fi
  fi

  if ! mountpoint -q "$mount_point"; then
    sudo mount -t cifs "$music_dir" "$mount_point" -o "username=${smb_user},password=${smb_password},iocharset=utf8"
    resolved_music_dir="$mount_point"
  fi
fi

cat > .env <<ENV
MUSIC_DIR=${resolved_music_dir}
ENV

mkdir -p backend-node/config frontend/config audio_pulse music

if [[ ! -f backend-node/config/settings.json ]]; then
  cat > backend-node/config/settings.json <<JSON
{
  "db_ip_address": "soundowl-db",
  "db_name": "sound",
  "db_user": "root",
  "db_pass": "sound",
  "redis_ip_address": "soundowl-redis",
  "sound_directory": "/music",
  "exclusionPaths": [],
  "websocket_retry_count": "7",
  "websocket_retry_interval": "1234"
}
JSON
fi

docker compose up -d db redis backend frontend
