#!/usr/bin/env bash
set -euo pipefail
cd /workspace/Balcon-del-Zocalo
node -e 'if (Number(process.versions.node.split(".")[0]) < 24) throw new Error("Este piloto requiere Node.js 24 o posterior")'
npm ci --cache /tmp/balcon-npm-cache --no-audit --no-fund
npm run check
npm run build
