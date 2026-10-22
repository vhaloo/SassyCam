#!/usr/bin/env sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ ! -f node_modules/electron/cli.js ] || [ ! -f dist/index.html ]; then
  printf '%s\n' 'Run ./install_mac_linux.sh first, or use the standalone package.'
  exit 1
fi
exec node node_modules/electron/cli.js .
