#!/usr/bin/env sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Install Node.js 22.13+ from https://nodejs.org and try again.'
  exit 1
fi
node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||a===22&&b>=13?0:1)'
npm ci --no-audit --no-fund
npm run build
printf '%s\n' 'SassyCam is ready. Original 0.1.2 data has been preserved.'
exec sh ./Launch_SassyCam.sh
