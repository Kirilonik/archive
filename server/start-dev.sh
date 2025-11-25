#!/bin/sh
set -e
cd /work/server
exec npx tsx watch src/index.ts

