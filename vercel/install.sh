#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -f "${REPO_ROOT}/package.json" ]; then
  (cd "${REPO_ROOT}" && npm install)
fi

FRONTEND_DIR="${REPO_ROOT}/frontend"
if [ -f "${FRONTEND_DIR}/package.json" ]; then
  (cd "${FRONTEND_DIR}" && npm install)
fi
