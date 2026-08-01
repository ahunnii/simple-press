#!/usr/bin/env bash
#
# Throwaway PostgreSQL cluster for the Playwright E2E suite.
#
# Uses the Homebrew `postgresql@16` binaries (no Docker required) and boots a
# disposable cluster on the shared test port — the same DSN the Vitest
# integration suite expects
# (postgresql://test:test@localhost:${TEST_PG_PORT}/simplepress_test). The
# cluster lives entirely under a temp dir and is wiped by `down`.
#
# TEST_PG_PORT (default 5436) is the single source of truth for the test
# database port, shared with docker-compose.test.yml and
# tests/helpers/test-env.ts. Override it if 5436 is taken on your machine —
# but override it for ALL of them, which is exactly why it is one variable.
#
#   scripts/e2e-pg.sh up     # initdb + start + create role/db + prisma db push
#   scripts/e2e-pg.sh down   # stop + remove the temp cluster
#
set -euo pipefail

PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
PG_PORT="${TEST_PG_PORT:-5436}"
PG_DB="simplepress_test"
PG_USER="test"
PG_PASS="test"

STATE_DIR="${TMPDIR:-/tmp}/simplepress-e2e-pg"
DATA_DIR="$STATE_DIR/data"
SOCK_DIR="$STATE_DIR/sock"
DSN="postgresql://${PG_USER}:${PG_PASS}@localhost:${PG_PORT}/${PG_DB}"

if [ ! -x "$PG_BIN/pg_ctl" ]; then
  echo "error: postgresql@16 not found at $PG_BIN (brew install postgresql@16)" >&2
  exit 1
fi

up() {
  mkdir -p "$SOCK_DIR"

  if [ ! -f "$DATA_DIR/PG_VERSION" ]; then
    "$PG_BIN/initdb" -D "$DATA_DIR" -U postgres --auth=trust >/dev/null
  fi

  if ! "$PG_BIN/pg_ctl" -D "$DATA_DIR" status >/dev/null 2>&1; then
    "$PG_BIN/pg_ctl" -D "$DATA_DIR" -w \
      -o "-p $PG_PORT -k $SOCK_DIR -c listen_addresses=localhost" start
  fi

  for _ in $(seq 1 30); do
    if "$PG_BIN/pg_isready" -h localhost -p "$PG_PORT" -q; then break; fi
    sleep 1
  done

  # Role + database (both idempotent so `up` can run repeatedly).
  psql_postgres() { "$PG_BIN/psql" -h localhost -p "$PG_PORT" -U postgres -d postgres "$@"; }
  if ! psql_postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='${PG_USER}'" | grep -q 1; then
    psql_postgres -c "CREATE ROLE ${PG_USER} LOGIN SUPERUSER PASSWORD '${PG_PASS}'"
  fi
  if ! psql_postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${PG_DB}'" | grep -q 1; then
    psql_postgres -c "CREATE DATABASE ${PG_DB} OWNER ${PG_USER}"
  fi

  DATABASE_URL="$DSN" pnpm exec prisma db push --skip-generate --accept-data-loss
  echo "E2E Postgres ready at $DSN"
}

down() {
  if [ -f "$DATA_DIR/PG_VERSION" ] && "$PG_BIN/pg_ctl" -D "$DATA_DIR" status >/dev/null 2>&1; then
    "$PG_BIN/pg_ctl" -D "$DATA_DIR" -m immediate stop || true
  fi
  rm -rf "$STATE_DIR"
  echo "E2E Postgres stopped + wiped"
}

case "${1:-}" in
  up) up ;;
  down) down ;;
  *) echo "usage: $0 {up|down}" >&2; exit 1 ;;
esac
