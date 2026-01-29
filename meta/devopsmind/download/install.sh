#!/usr/bin/env sh
set -e

APP_NAME="DevOpsMind"
BIN_NAME="devopsmind"

META_BASE_URL="https://infraforgelabs.in/meta/devopsmind"
BIN_REPO="InfraForgeLabs/infraforgelabs.github.io"

INSTALL_DIR="$HOME/.local/bin"
BUNDLE_DIR="$INSTALL_DIR/.devopsmind"

echo "======================================"
echo "🚀 Installing ${APP_NAME}"
echo "======================================"
echo

# ---------------- OS + ARCH ----------------
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)   PLATFORM="linux" ;;
  Darwin)  PLATFORM="macos" ;;
  *)
    echo "❌ Unsupported OS: $OS"
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64|amd64) ARCH="x86_64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)
    echo "❌ Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# ---------------- Fetch latest version ----------------
echo "🔍 Fetching latest version..."

VERSION="$(curl -fsSL "${META_BASE_URL}/version.json" \
  | sed -n 's/.*"latest_version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"

[ -z "$VERSION" ] && {
  echo "❌ Could not determine latest version."
  exit 1
}

echo "📦 Latest version: $VERSION"
TAG="v${VERSION}-devopsmind"

# ---------------- Resolve asset ----------------
case "$PLATFORM" in
  linux)
    [ "$ARCH" != "x86_64" ] && {
      echo "❌ Linux ARM64 is not supported yet."
      exit 1
    }
    ARCHIVE="devopsmind-linux-x86_64.tar.gz"
    ;;
  macos)
    [ "$ARCH" != "arm64" ] && {
      echo "❌ Intel macOS is not supported."
      exit 1
    }
    ARCHIVE="devopsmind-macos-arm64.tar.gz"
    ;;
esac

DOWNLOAD_URL="https://github.com/${BIN_REPO}/releases/download/${TAG}/${ARCHIVE}"

# ---------------- Prepare dirs (CRITICAL FIX) ----------------
mkdir -p "$INSTALL_DIR"

# ---------------- Download + Extract ----------------
echo "⬇ Downloading ${ARCHIVE}..."
TMP_DIR="$(mktemp -d)"

curl curl -# -L "$DOWNLOAD_URL" -o "$TMP_DIR/devopsmind.tar.gz"

echo "📦 Extracting..."
tar -xzf "$TMP_DIR/devopsmind.tar.gz" -C "$TMP_DIR"

# ---------------- Install onedir bundle ----------------
rm -rf "$BUNDLE_DIR"
mv "$TMP_DIR/devopsmind" "$BUNDLE_DIR"
chmod +x "$BUNDLE_DIR/devopsmind"

rm -rf "$TMP_DIR"

# ---------------- User-facing commands ----------------
ln -sf "$BUNDLE_DIR/devopsmind" "$INSTALL_DIR/devopsmind"
ln -sf "$BUNDLE_DIR/devopsmind" "$INSTALL_DIR/devopsmind-complete"
ln -sf "$BUNDLE_DIR/devopsmind" "$INSTALL_DIR/devopsmind-outbox"

# ---------------- Ensure INSTALL_DIR is in PATH ----------------
ensure_path() {
  case "$(basename "$SHELL")" in
    bash) PROFILE="$HOME/.bashrc" ;;
    zsh)  PROFILE="$HOME/.zshrc" ;;
    *)    PROFILE="$HOME/.profile" ;;
  esac

  if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
    touch "$PROFILE"
    grep -q "$INSTALL_DIR" "$PROFILE" || {
      echo "" >> "$PROFILE"
      echo "# Added by DevOpsMind installer" >> "$PROFILE"
      echo "export PATH=\"\$PATH:$INSTALL_DIR\"" >> "$PROFILE"
    }
    echo "➡️  Open a new terminal or run:"
    echo "   source $PROFILE"
  fi
}

ensure_path

# ---------------- Docker Check (UNCHANGED) ----------------
echo
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "🐳 Docker is installed and running."
else
  echo "🐳 Docker is required for DevOpsMind Safe Shell."
  echo
  case "$OS" in
    Linux)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        echo "👉 Install Docker Desktop (WSL2)"
      else
        echo "👉 Install Docker Engine:"
        echo "   curl -fsSL https://get.docker.com | sh"
        echo "   sudo usermod -aG docker \$USER"
        echo "   newgrp docker"
      fi
      ;;
    Darwin)
      echo "👉 Install Docker Desktop for macOS"
      ;;
  esac
fi

echo
echo "======================================"
echo "✅ ${APP_NAME} installed successfully!"
echo "➡️  Run: devopsmind login"
echo "======================================"
