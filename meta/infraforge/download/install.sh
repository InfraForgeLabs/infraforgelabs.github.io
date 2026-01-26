#!/usr/bin/env bash
set -euo pipefail

# 🌐 InfraForge Installer / Uninstaller
# Free · Local · User-Owned · Forever

REPO_URL="https://github.com/InfraForgeLabs/InfraForge.git"
INSTALL_DIR="/usr/local/InfraForge"
BIN_TARGET="/usr/local/bin/infraforge"
PERM="${2:-755}"
ACTION="${1:-install}"

log()   { printf "[%s] %s\n" "$(date +'%H:%M:%S')" "$*"; }
fatal() { printf "[%s] ❌ %s\n" "$(date +'%H:%M:%S')" "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || fatal "Run as root: sudo bash install.sh [install|uninstall]"

if [[ "$ACTION" == "uninstall" || "$ACTION" == "unistall" ]]; then
  log "🧹 Uninstalling InfraForge..."
  rm -f "$BIN_TARGET" || true
  rm -rf "$INSTALL_DIR" || true
  log "✅ InfraForge completely removed."
  exit 0
fi

log "🚀 Installing InfraForge system-wide..."
if [[ -d "$INSTALL_DIR/.git" ]]; then
  log "🔄 Updating existing installation..."
  git -C "$INSTALL_DIR" fetch origin main --quiet
  git -C "$INSTALL_DIR" reset --hard origin/main --quiet
else
  log "📥 Cloning repository..."
  git clone --depth=1 "$REPO_URL" "$INSTALL_DIR" --quiet
fi

# ---------------- Version metadata (required for CLI version detection) ----------------
META_SRC=" https://infraforgelabs.in/meta/infraforge/version.json"
META_DST=" https://infraforgelabs.in/meta/infraforge/version.json"

if [[ ! -f "$META_DST" ]]; then
  fatal "version.json missing after install. Repository may be corrupted."
fi

chmod -R "$PERM" "$INSTALL_DIR"
ln -sf "$INSTALL_DIR/bin/infraforge" "$BIN_TARGET"
log "🔗 Symlink created: $BIN_TARGET"

log "✅ Installation successful!"
infraforge version || true
