#!/bin/sh
# docker-entrypoint.sh — runs BEFORE the Hyperfy server on every container boot.
#
# Job: apply a staged world restore. /api/world/restore writes the uploaded zip
# to <APP_ROOT>/restore-pending.zip and then exits the node process; the
# container's `restart: unless-stopped` policy boots it again and this script
# replaces the world folder while nothing holds the sqlite file open.
#
# Never let a bad zip crash-loop the container: on failure the zip is renamed
# aside and boot continues.
set -u
APP_ROOT="${APP_ROOT:-/app}"
WORLD_DIR="$APP_ROOT/${WORLD:-world}"
ZIP="$APP_ROOT/restore-pending.zip"
BACKUP_DIR="$APP_ROOT/world-backups"

if [ ! -f "$ZIP" ]; then
  echo "[restore] nothing staged"
  exec "$@"
fi

echo "[restore] staged zip found — validating"
if ! unzip -tqq "$ZIP"; then
  echo "[restore] staged zip is corrupt — renaming and continuing boot"
  mv "$ZIP" "$APP_ROOT/restore-pending.failed.zip"
  exec "$@"
fi

echo "[restore] replacing world folder: $WORLD_DIR"
[ -d "$WORLD_DIR" ] || mkdir -p "$WORLD_DIR"
# clear contents only — never rmdir $WORLD_DIR itself, it is a bind-mount point
# (busybox find has no -maxdepth, so globs, not find, do the work)
rm -rf "$WORLD_DIR"/* "$WORLD_DIR"/.[!.]* 2>/dev/null || true
if unzip -q "$ZIP" -d "$WORLD_DIR"; then
  mkdir -p "$BACKUP_DIR"
  mv "$ZIP" "$BACKUP_DIR/restored-$(date +%Y%m%d-%H%M%S).zip"
  echo "[restore] done — booting with restored world"
else
  echo "[restore] unzip FAILED — keeping zip for inspection, booting anyway"
  mv "$ZIP" "$APP_ROOT/restore-pending.failed.zip"
fi
exec "$@"
