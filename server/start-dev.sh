#!/bin/sh
set -e
cd /work/shared
npm run build
cd /work/server
exec npx tsx watch src/index.ts

