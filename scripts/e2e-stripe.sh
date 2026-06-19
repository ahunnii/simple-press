#!/usr/bin/env bash
#
# Orchestrates the REAL Stripe test-mode E2E suite (e2e/live/):
#   1. load test secrets from .env.e2e.local (and assert they're TEST keys)
#   2. boot the throwaway Postgres
#   3. capture the Stripe CLI webhook signing secret + forward webhooks to localhost
#   4. run the live Playwright config (dev server inherits the exported env)
#   5. always tear down (stripe listen + DB)
#
# Requires: Stripe CLI logged in (`stripe login`) to the same test platform account
# the connected account belongs to.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.e2e.local"

if [ ! -f "$ENV_FILE" ]; then
  cat >&2 <<EOF
error: $ENV_FILE not found. Create it with TEST credentials:

  STRIPE_SECRET_KEY=sk_test_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  E2E_STRIPE_ACCOUNT_ID=acct_...        # charges-enabled test connected account
EOF
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Safety rail: never run against live keys.
case "${STRIPE_SECRET_KEY:-}" in
  sk_test_*) ;;
  *) echo "error: STRIPE_SECRET_KEY must be a sk_test_ key" >&2; exit 1 ;;
esac
case "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}" in
  pk_test_*) ;;
  *) echo "error: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a pk_test_ key" >&2; exit 1 ;;
esac
if [ -z "${E2E_STRIPE_ACCOUNT_ID:-}" ]; then
  echo "error: E2E_STRIPE_ACCOUNT_ID (acct_...) is required" >&2; exit 1
fi

LISTEN_PID=""
cleanup() {
  [ -n "$LISTEN_PID" ] && kill "$LISTEN_PID" 2>/dev/null || true
  "$ROOT/scripts/e2e-pg.sh" down || true
}
trap cleanup EXIT

"$ROOT/scripts/e2e-pg.sh" up

# Capture the CLI signing secret (same one the listener uses), then start the
# listener forwarding BOTH account and connected-account events. Direct charges
# on a connected account emit Connect events → --forward-connect-to is required.
STRIPE_WEBHOOK_SECRET="$(stripe listen --print-secret)"
export STRIPE_WEBHOOK_SECRET STRIPE_SECRET_KEY NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY E2E_STRIPE_ACCOUNT_ID

WEBHOOK_URL="localhost:3000/api/webhooks/stripe"
stripe listen \
  --forward-to "$WEBHOOK_URL" \
  --forward-connect-to "$WEBHOOK_URL" \
  >"${TMPDIR:-/tmp}/simplepress-stripe-listen.log" 2>&1 &
LISTEN_PID=$!

# Give the listener a moment to connect before tests pay.
sleep 3

pnpm exec playwright test -c playwright.stripe.config.ts
