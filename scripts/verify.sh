#!/usr/bin/env bash
# Full quality gate: lint, format, types, unit coverage, build, e2e. Exits non-zero on any failure.
set -euo pipefail
npm run lint
npm run format:check
npm run typecheck
npm run test:coverage
npm run build
npm run test:e2e
echo "ALL GREEN"
