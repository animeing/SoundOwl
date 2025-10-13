#!/usr/bin/env bash
set -euo pipefail

START_DIR="$(pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRONTEND_DIR="${REPO_ROOT}/frontend"

if [ -f "${FRONTEND_DIR}/package.json" ]; then
  (cd "${FRONTEND_DIR}" && npm run build)
elif [ -f "${REPO_ROOT}/package.json" ]; then
  (cd "${REPO_ROOT}" && npm run build)
else
  echo "No frontend build script found" >&2
  exit 1
fi

if [ ! -d "${REPO_ROOT}/js" ]; then
  echo "Expected build output directory '${REPO_ROOT}/js' was not created" >&2
  exit 1
fi

if [ "${START_DIR}" != "${REPO_ROOT}" ]; then
  rm -rf "${START_DIR}/js"
  mkdir -p "${START_DIR}/js"
  cp -R "${REPO_ROOT}/js/." "${START_DIR}/js/"
fi
