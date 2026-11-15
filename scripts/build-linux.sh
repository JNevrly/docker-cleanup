#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
export SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-1794614400}"
npm ci
npm run package
python3 scripts/repack-deb.py
