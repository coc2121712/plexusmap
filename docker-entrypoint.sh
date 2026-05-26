#!/bin/sh
# Purge ISR cache from Docker build (pages rendered without DB access)
# This forces Next.js to regenerate all pages on first request with real DB data
rm -rf .next/server/app/index.html .next/server/app/index.rsc .next/server/app/index.meta .next/server/app/index.segments
rm -rf .next/server/app/especialidad
# Keep _not-found and other truly static pages

exec node server.js
