#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
# Pinned upstream binary, verified before extraction/execution.
curl -fsSL --retry 3 \
  https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz \
  -o "$work/actionlint.tar.gz"
printf '%s  %s\n' \
  8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8 \
  "$work/actionlint.tar.gz" | sha256sum -c -
tar -xzf "$work/actionlint.tar.gz" -C "$work" actionlint
"$work/actionlint" -shellcheck="" .github/workflows/*.yml
